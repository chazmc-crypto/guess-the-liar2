// AppArcadeTheme.jsx
import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { X, Upload, Download } from "lucide-react";

// ------------------- FIREBASE CONFIG -------------------
const firebaseConfig = {
  apiKey: "AIzaSyBfHKSTDRQVsoFXSbospWZHJRlRSijgiW0",
  authDomain: "guesstheliar-ca0b6.firebaseapp.com",
  projectId: "guesstheliar-ca0b6",
  storageBucket: "guesstheliar-ca0b6.appspot.com",
  messagingSenderId: "300436562056",
  appId: "1:300436562056:web:8e5368b914a5cbfded7f3d",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ------------------- UTILS -------------------
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter(w => !["the","a","an","and","or","of"].includes(w));
const jaccard = (a,b) => {
  const setA = new Set(normalize(a));
  const setB = new Set(normalize(b));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA,...setB]);
  return union.size ? intersection.size / union.size : 0;
};

// ------------------- MAIN APP -------------------
export default function AppArcadeTheme() {
  const [room, setRoom] = useState({});
  const [round, setRound] = useState(1);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [votes, setVotes] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [categories, setCategories] = useState([]);

  const roomCode = "TESTROOM"; // placeholder
  const playerName = "Player1"; // placeholder

  // ------------------- FIRESTORE SYNC -------------------
  useEffect(() => {
    const unsub = onSnapshot(doc(db,"rooms",roomCode), (snap)=>{
      if(snap.exists()) setRoom(snap.data());
    });
    return ()=> unsub();
  },[]);

  // ------------------- HANDLE TYPED ANSWER -------------------
  const submitAnswer = async () => {
    await updateDoc(doc(db,"rooms",roomCode),{
      [`answers.${round}.${playerName}`]: typedAnswer
    });
  };

  // ------------------- HANDLE VOTES -------------------
  const maxVotes = room.players ? Object.keys(room.players).length - 1 : 1;
  const toggleVote = (name)=>{
    if(votes.includes(name)) setVotes(votes.filter(v=>v!==name));
    else if(votes.length < maxVotes) setVotes([...votes,name]);
  };
  const submitVotes = async () => {
    await updateDoc(doc(db,"rooms",roomCode),{
      [`votes.${round}.${playerName}`]: votes
    });
    setVotes([]);
  };

  // ------------------- HANDLE AVATAR -------------------
  const saveAvatar = async () => {
    await updateDoc(doc(db,"rooms",roomCode),{
      [`players.${playerName}.avatar`]: avatar
    });
    // micro-bounce animation
    const el = document.getElementById('avatar-toast');
    if(el){
      el.classList.add('scale-110');
      setTimeout(()=> el.classList.remove('scale-110'),300);
    }
  };

  // ------------------- CONFETTI -------------------
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(()=> setShowConfetti(false),1500);
  };

  // ------------------- IMPORT/EXPORT -------------------
  const exportJSON = () => {
    const dataStr = JSON.stringify(categories,null,2);
    const blob = new Blob([dataStr],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download="categories.json"; a.click();
  };
  const importJSON = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev)=>{
      const imported = JSON.parse(ev.target.result);
      setCategories(imported);
      setDoc(doc(db,"meta","categories"),{categories:imported});
    };
    reader.readAsText(file);
  };

  // ------------------- RENDER -------------------
  return (
    <div className="bg-black text-green-400 min-h-screen p-4 font-mono">
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

      <h1 className="text-3xl mb-4">Arcade Impostor Game</h1>

      <div className="mb-4">
        <label>Typed Answer:</label>
        <textarea className="w-full bg-gray-900 p-2" value={typedAnswer} onChange={(e)=>setTypedAnswer(e.target.value)} />
        <button className="bg-green-600 px-4 py-1 mt-2" onClick={submitAnswer}>Submit Answer</button>
      </div>

      <div className="mb-4">
        <h2>Vote for Impostors (max {maxVotes})</h2>
        {room.players && Object.keys(room.players).map((p,i)=>(
          p !== playerName && <button key={i} className={`m-1 px-2 py-1 ${votes.includes(p)?'bg-green-600':'bg-gray-700'}`} onClick={()=>toggleVote(p)}>{p}</button>
        ))}
        <button className="bg-green-600 px-4 py-1 mt-2" onClick={submitVotes}>Submit Votes</button>
      </div>

      <div className="mb-4">
        <label>Avatar URL:</label>
        <input className="bg-gray-900 p-1 w-full" value={avatar} onChange={(e)=>setAvatar(e.target.value)} />
        <div id="avatar-toast" className="inline-block"><button className="bg-blue-600 px-4 py-1 mt-2" onClick={saveAvatar}>Save Avatar</button></div>
      </div>

      <div className="mb-4">
        <label>Import Categories JSON:</label>
        <input type="file" accept="application/json" onChange={importJSON} />
        <button className="bg-purple-600 px-4 py-1 mt-2" onClick={exportJSON}>Export Categories JSON</button>
      </div>

      <div className="mt-6">
        <h2>Round {round}</h2>
        {/* Scoring, compatibility, player cards would go here */}
      </div>
    </div>
  );
}
