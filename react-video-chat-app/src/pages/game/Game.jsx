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

function Board(props) {
  const { belongsTo } = props;
  const [userSymbolMap, setUserSymbolMap] = useState();
  const [statuss, setStatus] = useState("");
  const { message: gameActionPayload } = useSubscription([
    topics.publishGameMove,
  ]);
  const { client, connectionStatus } = useMqttState();
  const [gameState, setGameState] = useState({
    squares: Array(9).fill(null),
    xIsNext: true,
  });

  useEffect(() => {
    if (gameActionPayload?.message) {
      const payload = JSON.parse(gameActionPayload.message);
      const squareIndex = Number(payload.move);

      processMove(squareIndex);
    }
  }, [gameActionPayload]);

  useEffect(() => {
    const winner = calculateWinner(gameState.squares);
    if (winner) {
      setStatus("Winner: " + winner);
      winner == userSymbolMap.symbol && logWinner().catch(console.error);
    } else {
      setStatus("Next player: " + (gameState.xIsNext ? "X" : "O"));
    }
  }, [gameState]);

  /**
   * Processes an MQTT message which occurs when a player makes a move
   * @param squareIndex representing the index on the board
   * on which the move was made
   * @returns void
   */
  function processMove(squareIndex) {
    const squares = gameState.squares;

    // If game is finished or clicked square is filled:
    // do not alter state
    if (calculateWinner(squares) || squares[squareIndex]) {
      return;
    }

    const symbolLogic = (val, index) => {
      if (index === squareIndex && gameState.xIsNext && !squares[squareIndex]) {
        return "X";
      }
      if (index === squareIndex && !gameState.xIsNext && !squares[squareIndex]) {
        return "O";
      }
      return val;
    };

    setGameState((prev) => ({
      ...prev,
      squares: squares.map((val, index) => symbolLogic(val, index)),
      xIsNext: !prev.xIsNext,
    }));
  }

  /**
   * Increments score of winning player by 1 in Firestore
   * @returns {Promise<void>}
   */
  async function logWinner() {
    const doc = (await firebase
        .firestore()
        .collection("scores")
        .where("name", "==", belongsTo)
        .get());
    if (!doc.empty) {
      doc.forEach((snap) => {
        snap
            .ref
            .update({ score: firebase.firestore.FieldValue.increment(1) });
      })
    } else {
      firebase
          .firestore()
          .collection("scores")
          .doc()
          .set({name: belongsTo, score: 1});
    }
  }

  /**
   * Publishes a message to the MQTT broker
   * @param message the JSON-formatted message to be published
   * @returns void
   */
  function publishGameMove(message) {
    if (connectionStatus.toLowerCase() === "connected") {
      client.publish(topics.publishGameMove, message);
    }
  }

  const renderSquare = (i) => {
    return (
      <Square
        value={gameState.squares[i]}
        onClick={() => {
          publishGameMove(JSON.stringify({
            move: String(i),
            user: belongsTo
          }));

          if (userSymbolMap == undefined) {
            setUserSymbolMap({
              user: belongsTo,
              symbol: gameState.xIsNext ? "X" : "O"
            })
          }
        }}
      />
    );
  };

  return (
    <div>
      <div className="status">{statuss}</div>
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
  const [hasStarted, setHasStarted] = useState(false);

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

  If x wins, log statistics.

  Log statistics increments the amount of wins, player 1 has by 1.

  Get the name from the winner by matching the value of player name and authenticated name.

  For example, if the winner is X, check which player is player 1 and log 1 win for player 1.

  Do this by checking player state at each client and winner.

  It will be easy to distinguis the players based on who pressed the button.

  Therefore we can use the same MQTT topic for all the players

  */