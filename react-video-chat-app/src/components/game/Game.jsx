import "./Game.css";

//reactcomponent element
import React from "react";
import { useEffect, useState } from "react";
import { useMqttState, useSubscription } from "mqtt-react-hooks";
import Authentication from "../Authentication";
import Board from "./Board";

//MQTT Topic base
const GLOBAL_BASE = "/ttm4115/team_12";

//Topics to handle game intialization and gameplay
const topics = {
  publishGameOffer: `${GLOBAL_BASE}/startGame`,
  publishGameMove: `${GLOBAL_BASE}/gameMoves`,
};

//Combine the fuctions to make a game component
export default function Game() {
  const [name, setName] = useState();
  const [authenticated, setAuthenticated] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const { client, connectionStatus } = useMqttState();

  const { message: startGamePayload } = useSubscription([
    topics.publishGameOffer,
  ]);

  const startGamePayload2 = startGamePayload?.message.trim();

  const showTheGame = startGamePayload2 && JSON.parse(startGamePayload2);

  //publish move to topic
  function publishStartGame(message) {
    if (connectionStatus.toLowerCase() === "connected") {
      client.publish(topics.publishGameOffer, message);
    }
  }

  //identification, currently not proper authentication as this is easily implemented in later stages
  function authenticate(name) {
    if (!authenticated) {
      setName(name);
      setAuthenticated(true);
    }
  }

  
  function logger() {
    console.log(name);
  }

  return (
    <div>
      <h1>TicGame</h1>
      <div className="game-board">
        {showTheGame?.state && <Board belongsTo={name} />}
      </div>
      {!hasStarted && <button
        onClick={() => {
          publishStartGame(JSON.stringify({ state: true }));
          setHasStarted(true);
        }}
        disabled={!authenticated}
      >
        Start Game
      </button>}

      <Authentication
        onAuthenticate={(name) => {
          authenticate(name);
          logger();
        }}
      />
    </div>
  );
}

