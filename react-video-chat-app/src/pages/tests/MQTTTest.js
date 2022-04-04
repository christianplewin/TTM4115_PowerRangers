import {useMqttState, useSubscription} from 'mqtt-react-hooks';
import {useEffect, useState} from 'react';

const GLOBAL_BASE = "/ttm4115/team_12";

export default function MQTTTest() {
	return (<div>
		<h1>MQTT Test</h1>
		<ConnStat />
		<Publisher />
		<Subscriber />
	</div>);
}

function ConnStat() {
	const { connectionStatus } = useMqttState();
	useEffect(() => console.log(connectionStatus), [connectionStatus]);
	return <p>{connectionStatus}</p>
}

function Publisher() {
	const { client, connectionStatus } = useMqttState();
	const [havePublished, setHavePublished] = useState(false);
	const topic = `${GLOBAL_BASE}/test`;

	useEffect(() => {
		if (connectionStatus.toLowerCase() === "connected") {
			client.publish(topic, "Test from React. Hello");
			setHavePublished(true);
		}
	})
	return <p>I have{!havePublished && " not"} published a message to {topic}.</p>
}

function Subscriber() {
	const topic = `${GLOBAL_BASE}/test`;
	const { message } = useSubscription([topic]);

	function renderMessage() {
		if (message) {
			return <p>{message.message}</p>
		}
		return <p>No message received yet.</p>
	}

	return renderMessage();
}