import "./VideoChat.css";

import { useEffect, useState, useRef } from "react";
import { useMqttState, useSubscription } from "mqtt-react-hooks";
import firebase from "firebase";
import { v4 as uuidv4 } from "uuid";
import Game from "../../components/game/Game.jsx";
import VideoStream from "../../components/VideoStream";

const STATES = {
	idle: "idle",
	inactive: "inactive",
	active: "active",
	in_call: "in_call",
};

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
let localVidStream = null;
let remoteVidStream = null;

export default function VideoChat() {
	const [controlState, setControlState] = useState(STATES.idle);
	const renderStates = [STATES.active, STATES.in_call];

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
		stateMachine(controlState);
	}, [controlState]);

	useEffect(() => {
		if (controlState === STATES.active && connectionStatus.toLowerCase() === "connected") {
			publishPresence(meetingId);
		}
	}, [connectionStatus]);

	useEffect(() => {
		if (message) {
			handleMqttMessage(message);
		}
	}, [message]);

	/**
	 * Handles the reception of an MQTT message. May alter state or initiate an answer of a call.
	 * @param message the MQTT message with the following structure: {topic: MQTT topic of message (string),
	 * message: payload contained in MQTT message (string)}.
	 */
	function handleMqttMessage(message) {
		console.log(message.topic, message.message);
		if (controlState === STATES.active &&
			message.message != meetingId &&
			message.topic == TOPICS.publishPresence) {
			/* If the message contains a meeting ID different from current meeting ID,
			* update current meeting ID.*/
			setMeetingId(message.message);
		} else if (message.topic === TOPICS.publishOffer && controlState === STATES.active) {
			/* If message is an offer, go to state in_call if this component didn't
			* publish the offer. */
			!havePublishedOffer && setControlState(STATES.in_call);
		} else if (message.topic === TOPICS.disconnect) {
			if (controlState === STATES.in_call) {
				disconnect();
			}
		} else if (message.topic === TOPICS.camera) {
			/* Format of message in camera-topic is "<clientNumber> <in_frame/left_frame>".
			* The first part is included to distinguish between the different hosts.
			* The second part is included to distinguish between the facial recognition
			* module noticing that a face entered the frame, or left the frame. */
			const words = message.message.split(" ");
			let camClient =  clientNumber == 1 ? "cam1" : "cam2";

			if (words[0] == camClient) {
				console.log(message.topic, message.message);

				if (words[1] === "in_frame") {
					console.log("Should go into ACTIVE if in INACTIVE");

					if (!userInFrame) setUserInFrame(true);

					if (controlState === STATES.inactive) setControlState(STATES.active);

				} else if (words[1] === "left_frame") {
					console.log("Should go into INACTIVE if in ACTIVE");

					if (userInFrame) setUserInFrame(false);

					if (controlState === STATES.active) setControlState(STATES.inactive);
				}
			}
		}
	}

	/**
	 * Function which handles the transitions in the state machine defined
	 * in the state machine diagram.
	 * @param controlState - the state which the system is entering.
	 */
	function stateMachine(controlState) {
		if (controlState === STATES.idle) {
			/* Initial transition from IDLE to INACTIVE */
			setControlState(STATES.inactive);
		} else if (controlState === STATES.inactive) {
			/* Going into state INACTIVE. */
			/* We create a new RTCPeerConnection whenever we enter
			* this state to make it possible to start new calls after
			* disconnecting from previous ones. */
			pc = new RTCPeerConnection(SERVERS);
		} else if (controlState === STATES.active) {
			/* Going into state ACTIVE */
			/* We have to set up the local video and make the remote video
			* reception ready. Additionally, we have to notify the other
			* entity that we are active, which is the 'notify_active'-function
			* in the state machine diagram. */
			getLocalVideo();
			getRemoteVideo();
			if (connectionStatus.toLowerCase() === "connected") {
				publishPresence(meetingId);
			}
		} else if (controlState === STATES.in_call) {
			/* Going into state IN_CALL */
			/* If we are the first ones to go into this state,
			* we will be calling the other entity. Otherwise, we will
			* answer the call from the other entity. */
			if (publishingOffer === true) {
				call();
			} else {
				answerCall(meetingId);
			}
		}
	}

	/**
	 * Enables the possible reception and display of remote video stream.
	 * @returns {Promise<void>}
	 */
	async function getRemoteVideo() {
		remoteVidStream = new MediaStream();

		pc.ontrack = (event) => {
			event.streams[0].getTracks().forEach((track) => {
				remoteVidStream.addTrack(track);
			});
		};

		remoteVideoRef.current.srcObject = remoteVidStream;
	}

	/**
	 * Enables the possible transmission and display of local video stream.
	 * @returns {Promise<void>}
	 */
	async function getLocalVideo() {
		localVidStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

		localVidStream.getTracks().forEach((track) => {
			pc.addTrack(track, localVidStream);
		});

		localVideoRef.current.srcObject = localVidStream;
	}

	/**
	 * Creates a call document in the database (Firestore) and subscribes
	 * to changes to it. Publishes the WebRTC offer to MQTT, which
	 * the other entity will notice if it is in state ACTIVE. The other
	 * entity will then answer the call using the 'answerCall'-method.
	 * @param meetingId - the ID of the call-document in Firestore.
	 * @returns {Promise<void>}
	 */
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

	/**
	 * Updates the call document in the database (Firestore) and subscribes
	 * to changes to it.
	 * @param meetingId - the ID of the call-document in Firestore.
	 * @returns {Promise<void>}
	 */
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
	 * Creates a call and updates internal state.
	 */
	function call() {
		createCall(message.topic === TOPICS.publishPresence ? message.message : meetingId)
			.then(() => {
				setHavePublishedOffer(true)
			});
	}

	/* Disconnects the users, removing the video stream */
	function disconnect() {
		setControlState(!userInFrame ? STATES.inactive : STATES.active);
		publishDisconnect();
	}

	/* GAME FUNCTIONS */
	/**
	 * Toggles the showGame-variable.
	 */
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
						<VideoStream props={{ location: "webcamVideo", muted: true }} ref={localVideoRef} />
						<VideoStream props={{ location: "remoteVideo", muted: false }} ref={remoteVideoRef} />
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


