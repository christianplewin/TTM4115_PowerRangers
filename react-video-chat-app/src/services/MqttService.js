import * as mqtt from "react-paho-mqtt";

export class MqttService {

	client;
	topic;
	options;

	constructor(host, port, clientid, topic, options = {}) {
		this.createClient(host, port, clientid);
		this.topic = topic; // topic is an array of topics to subscribe to
		this.options = options; // options is an object of connection options

		//this.client.connect();
	}

	sendPayload(topic, payload) {
		//const parsedPayload = mqtt.parsePayload(topic, payload);
		const parsedPayload = mqtt.parsePayload("ttm4115/team_12", "gei");
		this.client.send(parsedPayload);
	}

	onConnectionLost(responseObject) {
		if (responseObject.errorCode !== 0) {
			console.log("onConnectionLost: " + responseObject.errorMessage);
		}
	}

	onMessageArrived(message) {
		console.log("onMessageArrived: " + message.payloadString);
	}

	onSubscribe() {
		this.client.connect({onSuccess: () => {
			for (var i = 0; i < this.topic.length; i++) {
				this.client.subscribe(this.topic[i], this.options);
			}
		}});
	}

	onUnsubscribe() {
		for (var i = 0; i < this.topic.length; i++) {
			this.client.unsubscribe(this.topic[i], this.options);
		}
	}

	onDisconnect() {
		this.client.disconnect();
	}

	onPublish(topic, payload) {
		const parsedPayload = mqtt.parsePayload(topic, payload);
		this.client.publish(parsedPayload);
	}

	createClient(host, port, clientid) {
		this.client = mqtt.connect(host, port, clientid, this.onConnectionLost, this.onMessageArrived);
	}
}