import "./Leaderboard.css";

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
	return <Table scoreData={data} />;
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
