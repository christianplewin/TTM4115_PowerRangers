import { useNavigate } from "react-router-dom";
import './ReactStandard.css'
import templogo from '../../resources/templogo.png'
import FirebaseTest from "./FirebaseTest";

  
function ReactStandard() {

  let navigate = useNavigate(); 

  const routeChange = () =>{ 
    let path = `/videochat`; 
    navigate(path);
  }

  const routeChange2 = () =>{ 
    let path = `/leaderboard`; 
    navigate(path);
  }
    return (
      <div className="App">
        <header className="App-header">
          <img src={templogo}/>
          <p>
            Welcome, choose a option to continiue!
          </p>
          <button type="button" class="btn btn-info"
            onClick={routeChange}
              >
              Play a Game with someone, with videochat!!
          </button>
          <p>
            
          </p>
          <button type="button" class="btn btn-info"
            onClick={routeChange2}
              >
              Leaderboards
          </button>
        </header>
      </div>
    );
  }

export default ReactStandard