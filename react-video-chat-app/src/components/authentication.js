import { useState } from "react";

export default function Authentication(props) {
	const [name, setName] = useState();
	return <div>
		<h3>Enter name to authenticate</h3>
		<input onChange={(e) => setName(e.target.value)} />
		<button onClick={() => props.onAuthenticate(name)}>Submit</button>
	</div>
}