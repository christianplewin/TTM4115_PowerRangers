import logo from '../../resources/svg/logo.svg';

import FirebaseTest from "./FirebaseTest";

function ReactStandard() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
  
          {<FirebaseTest />}
        </header>
      </div>
    );
  }

export default ReactStandard