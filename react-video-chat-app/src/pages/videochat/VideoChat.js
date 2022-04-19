import "./VideoChat.css";

import { useEffect, useState, useRef, forwardRef } from "react";
import { useMqttState, useSubscription } from "mqtt-react-hooks";
import firebase from "firebase";
import { v4 as uuidv4 } from "uuid";
import Game from "../../components/game/Game.jsx";

const STATES = {
	idle: "idle",
	inactive: "inactive",
	active: "active",
	in_call: "in_call",
	in_game: "in_game"
};

/*const EVENTS = {
	rcv_face_detected: "rcv_face_detected",
	rcv_left_frame: "rcv_left_frame",
	rcv_others_active: "rcv_others_active",
	disconnect: "disconnect",
	play: "play"
};*/

const SERVERS = {
	iceServers: [
		{
			urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
		},
	],
	iceCandidatePoolSize: 10,
};

/* MQTT Configuration */
const GLOBAL_BASE = "/ttm4115/team_12";

const TOPICS = {
	publishOffer: `${GLOBAL_BASE}/offer`,
	publishPresence: `${GLOBAL_BASE}/present`,
	disconnect: `${GLOBAL_BASE}/disconnect`,
	camera: `${GLOBAL_BASE}/cam`
};

let pc/* = new RTCPeerConnection(SERVERS)*/;
let localStream = null;
let remoteStream = null;

export default function VideoChat() {
	const [controlState, setControlState] = useState(STATES.idle);
	const renderStates = [STATES.active, STATES.in_call, STATES.in_game];

	/* VIDEOCHAT CONSTANTS */
	const [clientNumber, setClientNumber] = useState(undefined);
	const [meetingId, setMeetingId] = useState(uuidv4());
	const [publishingOffer, setPublishingOffer] = useState(false);
	const [havePublishedOffer, setHavePublishedOffer] = useState(false);
	const [userInFrame, setUserInFrame] = useState(false);
	const db = firebase.firestore();
	const localVideoRef = useRef(null);
	const remoteVideoRef = useRef(null);
	const { client, connectionStatus } = useMqttState();
	const { message } = useSubscription([
		TOPICS.publishPresence,
		TOPICS.publishOffer,
		TOPICS.disconnect,
		TOPICS.camera,
	]);

	/* GAME CONSTANTS */
	const [showGame, setShowGame] = useState(false);

	useEffect(() => {
		/* Initial transition from IDLE to INACTIVE */
		if (controlState === STATES.idle) {
			setControlState(STATES.inactive);
		} else if (controlState === STATES.inactive) {
			pc = new RTCPeerConnection(SERVERS);
		} else if (controlState === STATES.active) {
			getLocalVideo();
			getRemoteVideo();
			if (connectionStatus.toLowerCase() === "connected") {
				publishPresence(meetingId);
			}
		} else if (controlState === STATES.in_call) {
			if (publishingOffer === true) {
				call();
			} else {
				answerCall(meetingId);
			}
		} else if (controlState === STATES.in_game) {
			//TODO: Add state machine logic for game
		}
	}, [controlState]);

	useEffect(() => {
		if (controlState === STATES.active && connectionStatus.toLowerCase() === "connected") {
			publishPresence(meetingId);
		}
	}, [connectionStatus]);

	useEffect(() => {
		if (message) {
			console.log(message.topic, message.message);
			if (controlState === STATES.active &&
				message.message != meetingId &&
				message.topic == TOPICS.publishPresence) {
				setMeetingId(message.message);
			} else if (message.topic === TOPICS.publishOffer) {
				!havePublishedOffer && setControlState(STATES.in_call);
			} else if (message.topic === TOPICS.disconnect) {
				if (controlState === STATES.in_call || controlState === STATES.in_game) {
					disconnect();
				}
			} else if (message.topic === TOPICS.camera) {
				const words = message.message.split(" ");
				const camClient =  clientNumber == 1 ? "cam1" : "cam2";

				if (words[0] == camClient) {
					console.log(message.topic, message.message);

					if (words[1] === "in_frame") {
						console.log("Should go into ACTIVE if in INACTIVE");

						if (!userInFrame) setUserInFrame(true);

						//if (controlState === STATES.inactive) setControlState(STATES.active);

					} else if (words[1] === "left_frame") {
						console.log("Should go into INACTIVE if in ACTIVE");

						if (userInFrame) setUserInFrame(false);

						//if (controlState === STATES.active) setControlState(STATES.inactive);
					}
				}
			}
		}
	}, [message]);


	const getRemoteVideo = async () => {
		remoteStream = new MediaStream();

		pc.ontrack = (event) => {
			event.streams[0].getTracks().forEach((track) => {
				remoteStream.addTrack(track);
			});
		};

		remoteVideoRef.current.srcObject = remoteStream;
	}
	
	const getLocalVideo = async () => {
		localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

		localStream.getTracks().forEach((track) => {
			pc.addTrack(track, localStream);
		});

		localVideoRef.current.srcObject = localStream;
	}

	async function createCall(meetingId) {
		// Reference Firestore collections for signaling
		const callDoc = db.collection('calls').doc(meetingId);
		const offerCandidates = callDoc.collection('offerCandidates');
		const answerCandidates = callDoc.collection('answerCandidates');

		// Get candidates for caller, save to db
		pc.onicecandidate = (event) => {
			event.candidate && offerCandidates.add(event.candidate.toJSON());
		};

		// Create offer
		const offerDescription = await pc.createOffer();
		await pc.setLocalDescription(offerDescription);

		const offer = {
			sdp: offerDescription.sdp,
			type: offerDescription.type,
		};

		await callDoc.set({ offer });
		publishOffer(JSON.stringify(offer));

		// Listen for remote answer
		callDoc.onSnapshot((snapshot) => {
			const data = snapshot.data();
			if (!pc.currentRemoteDescription && data?.answer) {
				const answerDescription = new RTCSessionDescription(data.answer);
				pc.setRemoteDescription(answerDescription);
			}
		});

		// When answered, add candidate to peer connection
		answerCandidates.onSnapshot((snapshot) => {
			snapshot.docChanges().forEach((change) => {
				if (change.type === 'added') {
					const candidate = new RTCIceCandidate(change.doc.data());
					pc.addIceCandidate(candidate);
				}
			});
		});
	}

	async function answerCall(meetingId) {
		const callDoc = db.collection('calls').doc(meetingId);
		const answerCandidates = callDoc.collection('answerCandidates');
		const offerCandidates = callDoc.collection('offerCandidates');

		pc.onicecandidate = (event) => {
			event.candidate && answerCandidates.add(event.candidate.toJSON());
		};

		const callData = (await callDoc.get()).data();

		const offerDescription = callData.offer;
		await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

		const answerDescription = await pc.createAnswer();
		await pc.setLocalDescription(answerDescription);

		const answer = {
			type: answerDescription.type,
			sdp: answerDescription.sdp,
		};

		await callDoc.update({ answer });

		offerCandidates.onSnapshot((snapshot) => {
			snapshot.docChanges().forEach((change) => {
				if (change.type === 'added') {
					let data = change.doc.data();
					pc.addIceCandidate(new RTCIceCandidate(data));
				}
			});
		});
	}

	/**
	 * Publishes a message to the MQTT-broker on topic 'ttm4115/team_12/publishPresence'
	 * @param message
	 */
	function publishPresence(message) {
		if (connectionStatus.toLowerCase() === "connected") {
			client.publish(TOPICS.publishPresence, message);
		}
	}

	/**
	 * Publishes a message to the MQTT-broker on topic 'ttm4115/team_12/publishPresence'
	 * @param message
	 */
	function publishOffer(offer) {
		if (connectionStatus.toLowerCase() === "connected") {
			client.publish(TOPICS.publishOffer, offer);
		}
	}

	function publishDisconnect() {
		if (connectionStatus.toLowerCase() === "connected") {
			client.publish(TOPICS.disconnect, "disconnecting");
		}
	}

	/**
	 * Creates a call
	 */
	function call() {
		createCall(message.topic === TOPICS.publishPresence ? message.message : meetingId)
			.then(() => {
				setHavePublishedOffer(true)
			});
	}

	/* Disconnects the users, removing the video stream */
	function disconnect() {
		setControlState(STATES.inactive);
		publishDisconnect();
	}

	/* GAME FUNCTIONS */
	function toggleShowGame() {
		setShowGame(!showGame);
	}

	function renderComponent() {
		/* If current state is active, in_call or in_game, render video stream */
		if (renderStates.indexOf(controlState) !== -1) {
			return <div>
				<h1 id="page-title">Video chat application</h1>
				{controlState === STATES.active
					? <button onClick={() => {
						// Update state machine
						setPublishingOffer(true);
						setControlState(STATES.in_call);
						}
						} id={"call-btn"}>Click to call</button>
					: <button onClick={disconnect} id={"disconnect-btn"}>Click to disconnect</button>}
				<div id={showGame && "video-game-container"}>
					<div id="videostream-container" className={showGame ? "container-70" : "container-100"}>
						<VideoStream props={{ location: "webcamVideo" }} ref={localVideoRef} />
						<VideoStream props={{ location: "remoteVideo" }} ref={remoteVideoRef} />
					</div>
					{showGame ? <Game /> : <button onClick={toggleShowGame}>Enable game</button>}
				</div>
			</div>;
		} else {
			return <div>
				<h1 id="page-title">Video chat application</h1>
				<button
					onClick={() => setClientNumber(1)}
					disabled={clientNumber !== undefined}
				>
					I'm client number 1
				</button>
				<button
					onClick={() => setClientNumber(2)}
					disabled={clientNumber !== undefined}
				>
					I'm client number 2
				</button>
				<button
					onClick={() => setControlState(STATES.active)}
					disabled={clientNumber != 1 && clientNumber != 2}
				>
					Go to state ACTIVE
				</button>
			</div>;
		}
	}

	return renderComponent();
}

const VideoStream = forwardRef((props, ref) => {
  return (
    <>
      <video
        ref={ref}
        id={props.location}
        className="videostream"
        autoPlay
        playsInline
      />
    </>
  );
});
