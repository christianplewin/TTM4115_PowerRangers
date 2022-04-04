import {useEffect, useState, useRef, forwardRef} from 'react';
import {useMqttState, useSubscription} from 'mqtt-react-hooks';

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
	const localVideoRef = useRef(null);
	const remoteVideoRef = useRef(null);
	const { client, connectionStatus } = useMqttState();
	const { message } = useSubscription([topics.publishOffer, topics.publishPresence]);

	useEffect(() => {
	    getLocalVideo();
	  }, [localVideoRef]);

	useEffect(() => {
		remoteVideoRef.current && initializeRemoteVideo();
	  }, [remoteVideoRef]);

	const initializeRemoteVideo = () => {
		remoteStream = new MediaStream();

		pc.onTrack = (event) => {
			event.streams[0].getTracks().forEach((track) => {
				remoteStream.addTrack(track);
			});
		};

		remoteVideoRef.current.srcObject = remoteStream;
	}
	
	const getLocalVideo = () => {
		navigator
			.mediaDevices
			.getUserMedia({ video: true, audio: true })
			.then((stream) => {
				localStream = stream;
				let video = localVideoRef.current;
				video.srcObject = stream;
				video.play();
			}).catch((error) => {
				console.error(error);
		})
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

	return (<div>
		<h1>Video chat application</h1>
		<VideoStream props={{ location: "webcamVideo" }} ref={localVideoRef} />
		<VideoStream props={{ location: "remoteVideo" }} ref={remoteVideoRef} />
	</div>);
}

const VideoStream = forwardRef((props, ref) => {
	return <video ref={ref} id={props.location} autoPlay playsInline/>;
})
