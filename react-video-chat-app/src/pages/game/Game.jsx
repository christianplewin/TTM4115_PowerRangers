import "./Game.css";

//reactcomponent element
import React from "react";
import { useEffect, useState, useRef, forwardRef } from "react";
import { useMqttState, useSubscription } from "mqtt-react-hooks";
import firebase from "firebase";
import { v4 as uuidv4 } from "uuid";
import Authentication from "../../components/authentication";
import VideoChat from "../videochat/VideoChat";

const GLOBAL_BASE = "/ttm4115/team_12";

const topics = {
  publishGameOffer: `${GLOBAL_BASE}/startGame`,
  publishGameMove: `${GLOBAL_BASE}/gameMoves`,
};

function Square(props) {
  return (
    <button className="square" onClick={props.onClick}>
      {props.value}
    </button>
  );
}

function Board() {
  const [boardIndex, setBoardIndex] = useState(null);
  const { message: gameActionPayload } = useSubscription([
    topics.publishGameMove,
  ]);

  const { client, connectionStatus } = useMqttState();
  const [gameState, setGameState] = useState({
    squares: Array(9).fill(null),
    xIsNext: true,
  });

  let moveToSend = (i) => ({
    index: i,
  });

  function publishGameMove(message) {
    if (connectionStatus.toLowerCase() === "connected") {
      client.publish(topics.publishGameMove, message);
    }
  }

  useEffect(() => {
    if (gameActionPayload?.message) {
      setBoardIndex(Number(gameActionPayload.message));

      const s = Number(gameActionPayload.message);

      console.log(boardIndex);

      const squares = gameState.squares.slice();
      console.log(squares);

      if (calculateWinner(squares) || squares[s]) {
        return;
      }
      const symbolLogic = (val, index) => {
        if (index === s && gameState.xIsNext && !gameState.squares[s]) {
          return "X";
        }
        if (index === s && !gameState.xIsNext && !gameState.squares[s]) {
          return "O";
        }
        return val;
      };

      const squresValues = [
        ...squares.map((val, index) => symbolLogic(val, index)),
      ];
      setGameState((prev) => ({
        ...prev,
        squares: squresValues,

        xIsNext: !prev.xIsNext,
      }));
    }
  }, [gameActionPayload]);

  const handleClick = (j) => {
    console.log("click has been handeled");
  };

  const renderSquare = (i) => {
    return (
      <Square
        value={gameState.squares[i]}
        onClick={() => {
          handleClick(i);
          publishGameMove(String(i));
        }}
      />
    );
  };

  const winner = calculateWinner(gameState.squares);

  let status;

  if (winner) {
    status = "Winner: " + winner;
  } else {
    status = "Next player: " + (gameState.xIsNext ? "X" : "O");
  }

  return (
    <div>
      <div className="status">{status}</div>
      <div className="board-row">
        {renderSquare(0)}
        {renderSquare(1)}
        {renderSquare(2)}
      </div>
      <div className="board-row">
        {renderSquare(3)}
        {renderSquare(4)}
        {renderSquare(5)}
      </div>
      <div className="board-row">
        {renderSquare(6)}
        {renderSquare(7)}
        {renderSquare(8)}
      </div>
    </div>
  );
}

export default function Game() {
  const [name, setName] = useState();
  const [authenticated, setAuthenticated] = useState(false);

  const { client, connectionStatus } = useMqttState();

  const { message: startGamePayload } = useSubscription([
    topics.publishGameOffer,
  ]);

  const startGamePayload2 = startGamePayload?.message.trim();

  const showTheGame = startGamePayload2 && JSON.parse(startGamePayload2);

  function publishStartGame(message) {
    if (connectionStatus.toLowerCase() === "connected") {
      client.publish(topics.publishGameOffer, message);
    }
  }

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
      <div className="game-board">{showTheGame?.state && <Board />}</div>
      <button
        onClick={() => {
          publishStartGame(JSON.stringify({ state: true }));
        }}
      >
        Start Game
      </button>

      <Authentication
        onAuthenticate={(name) => {
          authenticate(name);
          logger();
        }}
      />
    </div>
  );
}

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      console.log(squares[a]);
      return squares[a];
    }
  }
  return null;
}

/*TODO

  Remove the start game button after push

  Player 1 is the player who starts the game, assign player 1 state to that player,

  Assign to other player, player 2 if game starts and he did not push the button.

  If x wins, log statistics.

  Log statistics increments the amount of wins, player 1 has by 1.

  Get the name from the winner by matching the value of player name and authenticated name.

  For example, if the winner is X, check which player is player 1 and log 1 win for player 1.

  Do this by checking player state at each client and winner.

  It will be easy to distinguis the players based on who pressed the button.

  Therefore we can use the same MQTT topic for all the players

  */
