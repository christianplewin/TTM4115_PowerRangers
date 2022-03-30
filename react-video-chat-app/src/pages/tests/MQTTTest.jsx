import { useEffect } from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";

import { MqttService } from "../../services/MqttService";

const client = W3CWebSocket("wss://demo.piesocket.com/v3/channel_1?api_key=oCdCMcMPQpbvNjUIzqtvF1d2X2okWpDQj4AwARJuAgtjhzKxVEjQU6IdCjwm&notify_self", "echo-protocol");

client.onerror = function() {
	console.log('Connection Error');
};
client.onopen = function() {
	console.log('WebSocket Client Connected');

	function sendNumber() {
		if (client.readyState === client.OPEN) {
			var number = Math.round(Math.random() * 0xFFFFFF);
			client.send(number.toString());
			setTimeout(sendNumber, 1000);
		}
	}
	sendNumber();
};

client.onclose = function() {
	console.log('echo-protocol Client Closed');
};

client.onmessage = function(e) {
	if (typeof e.data === 'string') {
		console.log("Received: '" + e.data + "'");
	}
};

function MQTTTest() {
	const mqttService = new MqttService(
		"mqtt.item.ntnu.no",
		Number(1884),
		"bc096e3b4ec84c979aa504a6b0e3c595",
		["ttm4115/team_12"]
	);

	function connect() {
		client.connect("ws://mqtt.item.ntnu.no:1884/", "echo-protocol");
	}

	/*function sendTestMessage() {
		mqttService.sendPayload(mqttService.topic[0], "testmelding");
	}*/

	/*const [connectStatus, setConnectStatus] = useState(null);
	const [payload, setPayload] = useState(null);
	const _topic = ["Hello"];
	const _options = {};

	const _sendPayload = () => {
		const payload = mqtt.parsePayload("Hello", "World"); // topic, payload
		client.send(payload);
	}

	// called when client lost connection
	const _onConnectionLost = responseObject => {
		if (responseObject.errorCode !== 0) {
			console.log("onConnectionLost: " + responseObject.errorMessage);
		}
	}

	// called when messages arrived
	const _onMessageArrived = message => {
		console.log("onMessageArrived: " + message.payloadString);
	}


	// called when subscribing topic(s)
	const _onSubscribe = () => {
		client.connect({ onSuccess: () => {
				for (var i = 0; i < _topic.length; i++) {
					client.subscribe(_topic[i], _options);
				}}
		}); // called when the client connects
	}

	// called when subscribing topic(s)
	const _onUnsubscribe = () => {
		for (var i = 0; i < _topic.length; i++) {
			client.unsubscribe(_topic[i], _options);
		}
	}

	// called when disconnecting the client
	const _onDisconnect = () => {
		client.disconnect();
	}

	const client = mqtt.connect("mqtt.item.ntnu.no", Number(1884), "mqtt", _onConnectionLost, _onMessageArrived);
	if (client) console.log(client);*/

	return (
		<div>
			<h1>Heisann</h1>
			<button onClick={() => connect()}>Subscribe</button>
			{/*<button onClick={() => sendTestMessage()}>Klikk meg</button>*/}
		</div>
	)
}

export default MQTTTest;