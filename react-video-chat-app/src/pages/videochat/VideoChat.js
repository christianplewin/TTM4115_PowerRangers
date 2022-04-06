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
	const { message } = useSubscription([topics.publishPresence, topics.publishOffer]);

	/*useEffect(() => {
		createCall();
		//answerCall();
	}, []);*/

	useEffect(() => {
		if (connectionStatus.toLowerCase() === "connected") {
			publishPresence(meetingId);
		}
	}, [connectionStatus]);

	useEffect(() => {
		if (message) {
			if (message.message != meetingId && message.topic == topics.publishPresence) {
				setMeetingId(message.message);
				console.log("Creating offer");
				/*createCall(message.message)
					.then(() => {
						publishOffer("offer published");
						setHavePublishedOffer(true)
					});*/
			} else if (message.topic === topics.publishOffer) {
				console.log(message.topic, message.message);
				!havePublishedOffer && answerCall(meetingId);
			}
		}
	}, [message]);

	useEffect(() => {
	    getLocalVideo();
	  }, [localVideoRef]);

	useEffect(() => {
		remoteVideoRef.current && initializeRemoteVideo();
	  }, [remoteVideoRef]);

	const initializeRemoteVideo = async () => {
		remoteStream = new MediaStream();

		pc.ontrack = (event) => {
			console.log("hallo!");
			event.streams[0].getTracks().forEach((track) => {
				remoteStream.addTrack(track);
			});
		};

		remoteVideoRef.current.srcObject = remoteStream;
		console.log("remote video initialized");
		/*remoteStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

		remoteStream.getTracks().forEach((track) => {
			pc.addTrack(track, remoteStream);
		});

		remoteVideoRef.current.srcObject = remoteStream;*/
	}
	
	const getLocalVideo = () => {
		navigator
			.mediaDevices
			.getUserMedia({ video: true, audio: true })
			.then((stream) => {
				localStream = stream;
				localStream.getTracks().forEach((track) => {
					pc.addTrack(track, localStream);
				});
				let video = localVideoRef.current;
				video.srcObject = stream;
				video.play();
			}).catch((error) => {
				console.error(error);
		})
	}

	async function createCall(meetingId) {
		/*const callDoc = db.collection("calls").doc(meetingId);
		const offerCandidates = callDoc.collection("offerCandidates");
		const answerCandidates = callDoc.collection("answerCandidates");

		pc.onicecandidate = (event) => {
			event.candidate && offerCandidates.add(event.candidate.toJSON());
		};

		const offerDescription = await pc.createOffer();
		await pc.setLocalDescription(offerDescription);

		const offer = {
			sdp: offerDescription.sdp,
			type: offerDescription.type,
		};

		await callDoc.set({ offer });
		publishOffer("offer published");

		// Listen for remote answer
		callDoc.onSnapshot((snapshot) => {
			const data = snapshot.data();
			console.log("callDocSnapshot", data);
			if (!pc.currentRemoteDescription && data?.answer) {
				const answerDescription = new RTCSessionDescription(data.answer);
				pc.setRemoteDescription(answerDescription);
			}
		});

		// Listen for remote ICE candidates
		answerCandidates.onSnapshot((snapshot) => {
			snapshot.docChanges().forEach((change) => {
				console.log("answerCandidateSnapshot", change.doc.data());
				if (change.type === "added") {
					const candidate = new RTCIceCandidate(change.doc.data());
					pc.addIceCandidate(candidate);
				}
			})
		})*/
		// Reference Firestore collections for signaling
		const callDoc = db.collection('calls').doc(meetingId);
		const offerCandidates = callDoc.collection('offerCandidates');
		const answerCandidates = callDoc.collection('answerCandidates');

		// Get candidates for caller, save to db
		pc.onicecandidate = (event) => {
			console.log("an event occurred");
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
					console.log("adding answer candidate");
					pc.addIceCandidate(candidate);
				}
			});
		});
	}

	async function answerCall(meetingId) {
		console.log("answering...");
		/*const callDoc = db.collection("calls").doc(meetingId);
		const offerCandidates = callDoc.collection("offerCandidates");
		const answerCandidates = callDoc.collection("answerCandidates");

		pc.onicecandidate = (event) => {
			console.log("heisann, ejf er en kandidat");
			event.candidate && answerCandidates.add(event.candidate.toJSON());
		};

		// Fetch data, then set the offer and answer
		const callData = (await callDoc.get()).data();

		const offerDescription = callData.offer;
		await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

		const answerDescription = await pc.createAnswer();
		await pc.setLocalDescription(answerDescription);

		const answer = {
			sdp: answerDescription.sdp,
			type: answerDescription.type,
		};

		await callDoc.update({ answer });

		// Listen to offer candidates

		offerCandidates.onSnapshot((snapshot) => {
			snapshot.docChanges().forEach((change) => {
				console.log(change);
				if (change.type === "added") {
					const data = change.doc.data();
					pc.addIceCandidate(new RTCIceCandidate(data));
				}
			})
		})*/

		const callDoc = db.collection('calls').doc(meetingId);
		const answerCandidates = callDoc.collection('answerCandidates');
		const offerCandidates = callDoc.collection('offerCandidates');

		pc.onicecandidate = (event) => {
			console.log("an event occurred");
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
					console.log("adding offer candidate");
					pc.addIceCandidate(new RTCIceCandidate(data));
				}
			});
		});
	}

	function publishPresence(message) {
		if (connectionStatus.toLowerCase() === "connected") {
			client.publish(topics.publishPresence, message);
		}
	}

	function publishOffer(offer) {
		if (connectionStatus.toLowerCase() === "connected") {
			client.publish(topics.publishOffer, offer);
		}
	}

	function toBeDeleted() {
		createCall(message.message)
			.then(() => {
				publishOffer("offer published");
				setHavePublishedOffer(true)
			});
	}

	return (<div>
		<h1>Video chat application</h1>
		<button onClick={toBeDeleted}>Klikk meg</button>
		<VideoStream props={{ location: "webcamVideo" }} ref={localVideoRef} />
		<VideoStream props={{ location: "remoteVideo" }} ref={remoteVideoRef} />
	</div>);
}

const VideoStream = forwardRef((props, ref) => {
	return (
		<>
			<p>hei</p>
			<video ref={ref} id={props.location} autoPlay playsInline/>
		</>
	);
})
