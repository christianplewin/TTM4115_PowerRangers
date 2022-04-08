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



function Board(){

  const [ boardIndex, setBoardIndex ]  = useState(null);
  const { message: gameActionPayload } = useSubscription([
    topics.publishGameMove,
  ]);

  const { client, connectionStatus } = useMqttState();
  const [gameState, setGameState] = useState({
    squares: Array(9).fill(null),
    xIsNext: true,              /* Change logic for online gameplay */
  })

  let moveToSend = (i) => ({
    index : i
  })



  function publishGameMove(message) {
    if (connectionStatus.toLowerCase() === "connected") {
      client.publish(topics.publishGameMove, message);
    }
  }


  useEffect(() => {
    if(gameActionPayload?.message) {


      
      setBoardIndex(Number(gameActionPayload.message))
      
      const s = Number(gameActionPayload.message)

      console.log(boardIndex)
      

      const squares = gameState.squares.slice();
      console.log(squares)

      if (calculateWinner(squares) || squares[s]) {
        return;
      }
      const symbolLogic = (val, index) => {
        if(index === s && gameState.xIsNext && !gameState.squares[s]) {
          return 'X';
        }
        if(index === s && !gameState.xIsNext && !gameState.squares[s]) {
          return 'O';
        } //commet for tsting
        return val;
  
      } 
  
  
      const squresValues = [...squares.map((val, index) => symbolLogic(val, index))]
      setGameState((prev) => ({...prev, squares: squresValues,
      
      xIsNext: !prev.xIsNext,}))


    }




  }, [gameActionPayload])



  const handleClick = (j) => {

    console.log("click has been handeled")

    

    
  }



  //console.log(gameState.squares)

  const renderSquare = (i) => {
    return <Square value={gameState.squares[i]} onClick={() => {handleClick(i)
      publishGameMove(String(i))
    }} />;
  }


  const winner = calculateWinner(gameState.squares);

  let status;

  if (winner) {
    status = 'Winner: ' + winner;   //at stream if all elements are filled and no winner return tied.
  } else {
    status = 'Next player: ' + (gameState.xIsNext ? 'X' : 'O');
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


// class Board extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = {
//       squares: Array(9).fill(null),
//       xIsNext: true,   /* Change logic for online gameplay */
//       showDetails: false,
//     }
//   }  
//   renderSquare(i) {
//     return <Square value={this.state.squares[i]} onClick={() => this.handleClick(i)} />;
//   }

//   handleClick(i){
//     const squares = this.state.squares.slice();
//     if (calculateWinner(squares) || squares[i]) {
//       return;
//     }

//     squares[i] = this.state.xIsNext ? 'X' : 'O';
//     this.setState({squares: squares,
//     xIsNext: !this.state.xIsNext,});
//   }

//   render() {
//     const winner = calculateWinner(this.state.squares);
//     let status;
//     if (winner) {
//       status = 'Winner: ' + winner;   //at stream if all elements are filled and no winner return tied.
//     } else {
//       status = 'Next player: ' + (this.state.xIsNext ? 'X' : 'O');
//     }

//     return (
//       <div>
//         <div className="status">{status}</div>
//         <div className="board-row">
//           {this.renderSquare(0)}
//           {this.renderSquare(1)}
//           {this.renderSquare(2)}
//         </div>
//         <div className="board-row">
//           {this.renderSquare(3)}
//           {this.renderSquare(4)}
//           {this.renderSquare(5)}
//         </div>
//         <div className="board-row">
//           {this.renderSquare(6)}
//           {this.renderSquare(7)}
//           {this.renderSquare(8)}
//         </div>
//       </div>
//     );
//   }
// }



export default function Game() {

  const { client, connectionStatus } = useMqttState();

  const { message: startGamePayload } = useSubscription([
    topics.publishGameOffer,
  ]);


  
  // useEffect(() => {
  //   if (startGamePayload) {
  //       console.log(startGamePayload.message)
  //   }
  // }, [startGamePayload]);


  const startGamePayload2 = startGamePayload?.message.trim()
  console.log(startGamePayload2 && JSON.parse(startGamePayload2))

  const showTheGame = startGamePayload2 && JSON.parse(startGamePayload2)




  function publishStartGame(message) {
    if (connectionStatus.toLowerCase() === "connected") {
      client.publish(topics.publishGameOffer, message);
    }
  }




  return (
    <div>
      <h1>TicGame</h1>
      <div className="game-board">
          {showTheGame?.state && <Board />}
      </div>
      <button onClick={() => {publishStartGame(JSON.stringify({state : true}))

    
    }}>Start Game</button>
    </div>
  );
}


function calculateWinner(squares) {  /* TODO multiplayer */
  //console.log(squares)
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
      console.log(squares[a])
      return squares[a];
    }
  }
  return null;
}