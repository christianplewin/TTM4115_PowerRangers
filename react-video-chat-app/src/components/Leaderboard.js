import "./Leaderboard.css";

import firebase from "firebase";
import { useEffect, useState } from "react";

export default function Leaderboard() {
	const scoreCollection = firebase.firestore().collection("scores");
	const [scoreData, setScoreData] = useState([]);
	useEffect(() => {
		setInitialData();
	}, []);

	/**
	 * Fetches all score documents from the database (Firestore),
	 * and updates the internal state representing the cores to the
	 * sorted list of documents returned from the query.
	 */
	function setInitialData() {
		scoreCollection
			.get()
			.then((colData) => {
				setScoreData(colData.docs.map((doc) => doc.data()).sort((a, b) => {
					return b.score - a.score;
				}))
			})
	}

	return <Table scoreData={scoreData} />;
}

function Table(props) {
	const { scoreData } = props;

	function createRow(rowData, index) {
		return <tr>
			<td>{index}</td>
			<td>{rowData.name}</td>
			<td>{rowData.score}</td>
		</tr>
	}

	return <table>
		<thead>
			<tr>
				<th colSpan={3}>Leaderboard</th>
			</tr>
			<tr>
				<td>Rank</td>
				<td>Name</td>
				<td>Score</td>
			</tr>
		</thead>
		<tbody>
			{scoreData
				.sort((a, b) => a.score <= b.score)
				.map((rowData, index) => {
					return createRow(rowData, index+1);
				})
			}
		</tbody>
	</table>
}
