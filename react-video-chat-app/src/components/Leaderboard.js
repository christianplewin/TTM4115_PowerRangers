import "./Leaderboard.css";
import Button from 'react-bootstrap/Button';
import { useNavigate } from "react-router-dom";
import firebase from "firebase";
import { useEffect, useState } from "react";

const data = [
	{
		name: "Navn 1",
		score: 5
	},
	{
		name: "Navn 2",
		score: 2
	},
	{
		name: "Navn 3",
		score: 6
	}
];

export default function Leaderboard() {
	const scoreCollection = firebase.firestore().collection("scores");
	const [scoreData, setScoreData] = useState([]);
	useEffect(() => {
		scoreCollection
			.get()
			.then((colData) => {
				setScoreData(colData.docs.map((doc) => doc.data()));
			})
	}, []);

	return <Table scoreData={scoreData} />;
}

function Table(props) {
	const { scoreData } = props;


	let navigate = useNavigate(); 

	const routeChange = () =>{ 
	  let path = `/`; 
	  navigate(path);
	}

	function createRow(rowData, index) {
		return <tr>
			<td>{index}</td>
			<td>{rowData.name}</td>
			<td>{rowData.score}</td>
		</tr>
	}

	return <p> <table>
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
	<p>
	</p>
		<button type="button" class="btn btn-info"
            onClick={routeChange}
              >
              Main Menu
    	</button>
	</p>
}
