import React from 'react';

/**
 * React component that represents a square in a larger Tic-Tac-Toe board.
 * @param props containing an onClick-method with behaviour for when the
 * square is clicked.
 * @returns {JSX.Element}
 */
export default function Square(props) {
	return (
		<button className="square" onClick={props.onClick}>
			{props.value}
		</button>
	);
}