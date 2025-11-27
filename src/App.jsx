import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";
import confetti from "canvas-confetti";

// Firebase config
const firebaseConfig = {
apiKey: "AIzaSyBfHKSTDRQVsoFXSbospWZHJRlRSijgiW0",
authDomain: "guesstheliar-ca0b6.firebaseapp.com",
databaseURL: "[https://guesstheliar-ca0b6-default-rtdb.firebaseio.com](https://guesstheliar-ca0b6-default-rtdb.firebaseio.com)",
projectId: "guesstheliar-ca0b6",
storageBucket: "guesstheliar-ca0b6.firebasestorage.app",
messagingSenderId: "300436562056",
appId: "1:300436562056:web:8e5368b914a5cbfded7f3d"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 200 categories (sample shown, expand to 200)
const promptCategories = Array.from({ length: 200 }).map((_, i) => ({
name: `Category ${i + 1}`,
real: `Real question ${i + 1}?`,
impostors: [`Impostor A ${i + 1}`, `Impostor B ${i + 1}`, `Impostor C ${i + 1}`]
}));

const similarityScore = (a, b) => {
const setA = new Set(a.toLowerCase().split(/\s+/));
const setB = new Set(b.toLowerCase().split(/\s+/));
const inter = new Set([...setA].filter(x => setB.has(x)));
const union = new Set([...setA, ...setB]);
return inter.size / union.size;
};

export default function App() {
const [name, setName] = useState("");
const [roomCode, setRoomCode] = useState("");
const [players, setPlayers] = useState({});
const [impostors, setImpostors] = useState([]);
const [phase, setPhase] = useState("lobby");
const [timerEnd, setTimerEnd] = useState(null);
const [creator, setCreator] = useState("");
const [timeLeft, setTimeLeft] = useState(0);
const [realQuestion, setRealQuestion] = useState("");
const [round, setRound] = useState(1);
const [selectedVotes, setSelectedVotes] = useState([]);

// ...all your useEffect, functions, etc. (unchanged)

const mostSimilarPairs = () => {
const names = Object.keys(players);
const pairs = [];
for (let i = 0; i < names.length; i++) {
for (let j = i + 1; j < names.length; j++) {
const a = players[names[i]]?.answer || "";
const b = players[names[j]]?.answer || "";
pairs.push({ pair: [names[i], names[j]], score: similarityScore(a, b) });
}
}
return pairs.sort((a, b) => b.score - a.score).slice(0, 3);
};

return (
<div style={{ fontFamily: "Arial,sans-serif", padding: 20, maxWidth: 960, margin: "0 auto" }}>
{/* JSX content here — the same as your last block */} </div>
);
}
