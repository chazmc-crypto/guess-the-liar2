import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";

// Firebase config
const firebaseConfig = {
apiKey: "AIzaSyBfHKSTDRQVsoFXSbospWZHJRlRSijgiW0",
authDomain: "guesstheliar-ca0b6.firebaseapp.com",
databaseURL: "https://guesstheliar-ca0b6-default-rtdb.firebaseio.com",
projectId: "guesstheliar-ca0b6",
storageBucket: "guesstheliar-ca0b6.firebasestorage.app",
messagingSenderId: "300436562056",
appId: "1:300436562056:web:8e5368b914a5cbfded7f3d"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const sanitize = str => str.replace(/[.#$[]\s()]/g, "_").trim();
const isValidPath = str => /^[^.#$[]\s]+$/.test(str) && str.trim() !== "";

const promptCategories = Array.from({ length: 200 }).map((_, i) => ({
name: Category ${i + 1},
real: Real question ${i + 1},
impostors: [Impostor A ${i + 1}, Impostor B ${i + 1}, Impostor C ${i + 1}]
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
const [confetti, setConfetti] = useState(null);

useEffect(() => {
if (typeof window !== "undefined") {
import("canvas-confetti").then(mod => setConfetti(() => mod.default));
}
}, []);

useEffect(() => {
if (!roomCode) return;
const roomRef = ref(database, rooms/${sanitize(roomCode)});
const unsub = onValue(roomRef, snapshot => {
const data = snapshot.val();
if (!data) return;
setPlayers(data.players || {});
setImpostors(data.impostors || []);
setPhase(data.phase || "lobby");
setTimerEnd(data.timerEnd || null);
setCreator(data.creator || "");
setRealQuestion(data.realQuestion || "");
setRound(data.round || 1);
});
return () => unsub();
}, [roomCode]);

useEffect(() => {
if (!timerEnd || phase === "lobby" || phase === "reveal") return;
const tick = setInterval(async () => {
const remain = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
setTimeLeft(remain);
if (remain <= 0) {
const roomRef = ref(database, rooms/${sanitize(roomCode)});
const snap = await get(roomRef);
if (!snap.exists()) return;
if (phase === "answer") {
await update(roomRef, { phase: "debate", timerEnd: Date.now() + 3 * 60 * 1000 });
} else if (phase === "debate") {
await update(roomRef, { phase: "reveal", timerEnd: null });
}
}
}, 1000);
return () => clearInterval(tick);
}, [timerEnd, phase, roomCode]);

// ...all other functions like createRoom, joinRoom, startRound, toggleVote, submitVote, nextRound, mostSimilarPairs remain the same

return (
<div style={{ fontFamily: "Arial,sans-serif", padding: 20, maxWidth: 960, margin: "0 auto" }}>
<header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
Guess The Liar | Room: {roomCode || "—"} | You: {name || "anon"}

{/* Render lobby, answer, debate, reveal phases here exactly like before */}

);
}
