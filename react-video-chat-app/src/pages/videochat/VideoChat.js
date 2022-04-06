import "./VideoChat.css";

import {useEffect, useState, useRef, forwardRef} from 'react';
import {useMqttState, useSubscription} from 'mqtt-react-hooks';
import firebase from "firebase";
import { v4 as uuidv4 } from "uuid";

const servers = {
	iceServers: [
		{
			urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
		},
	],
	iceCandidatePoolSize: 10,
};

const GLOBAL_BASE = "/ttm4115/team_12";

const topics = {
	publishOffer: `${GLOBAL_BASE}/offer`,
	publishPresence: `${GLOBAL_BASE}/present`,
};

let pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

export default function VideoChat() {
	const [meetingId, setMeetingId] = useState(uuidv4());
	const [havePublishedOffer, setHavePublishedOffer] = useState(false);
	const db = firebase.firestore();
	const localVideoRef = useRef(null);
	const remoteVideoRef = useRef(null);
	const { client, connectionStatus } = useMqttState();
	const { message } = useSubscription([
		topics.publishPresence,
		topics.publishOffer,
	]);

	useEffect(() => {
		if (connectionStatus.toLowerCase() === "connected") {
			publishPresence(meetingId);
		}
	}, [connectionStatus]);

	useEffect(() => {
		if (message) {
			if (message.message != meetingId && message.topic == topics.publishPresence) {
				setMeetingId(message.message);
			} else if (message.topic === topics.publishOffer) {
				!havePublishedOffer && answerCall(meetingId);
			}
		}
	}, [message]);

	useEffect(() => {
	    getLocalVideo();
		getRemoteVideo();
	  }, [localVideoRef, remoteVideoRef]);

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
			client.publish(topics.publishPresence, message);
		}
	}

	/**
	 * Publishes a message to the MQTT-broker on topic 'ttm4115/team_12/publishPresence'
	 * @param message
	 */
	function publishOffer(offer) {
		if (connectionStatus.toLowerCase() === "connected") {
			client.publish(topics.publishOffer, offer);
		}
	}

	/**
	 * Creates a call
	 */
	function call() {
		createCall(message.topic === topics.publishPresence ? message.message : meetingId)
			.then(() => {
				setHavePublishedOffer(true)
			});
	}

	return (<div>
		<h1 id="page-title">Video chat application</h1>
		<button onClick={call} id={"call-btn"}>Click to call</button>
		<div id="videostream-container" className="container-100">
			<VideoStream props={{ location: "webcamVideo" }} ref={localVideoRef} />
			<VideoStream props={{ location: "remoteVideo" }} ref={remoteVideoRef} />
		</div>
	</div>);
}

const VideoStream = forwardRef((props, ref) => {
	return (
		<>
			<video ref={ref} id={props.location} className="videostream" autoPlay playsInline/>
		</>
	);
})
