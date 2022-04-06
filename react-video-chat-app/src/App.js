import './App.css';

import firebase from "firebase";
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";
import { useEffect } from 'react';

import ReactStandard from './pages/tests/ReactStandard';
import MQTTTest from "./pages/tests/MQTTTest";
import VideoChat from './pages/videochat/VideoChat';

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  });
}

function App() {
  useEffect(() => {
    window.process = {
      ...window.process,
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReactStandard />} />
        <Route path="/mqtt" element={<MQTTTest />} />
        <Route path="/videochat" element={<VideoChat />} />
      </Routes>
    </BrowserRouter>
  )
}


export default App;
