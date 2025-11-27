import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";

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

// 200 categories
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
const [confetti, setConfetti] = useState(null);

// Lazy load canvas-confetti
useEffect(() => {
if (typeof window !== "undefined") {
import("canvas-confetti").then((mod) => setConfetti(() => mod.default));
}
}, []);

// Subscribe to room changes
useEffect(() => {
if (!roomCode) return;
const roomRef = ref(database, `rooms/${roomCode}`);
const unsub = onValue(roomRef, (snapshot) => {
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

// Timer & automatic phase progression
useEffect(() => {
if (!timerEnd || phase === "lobby" || phase === "reveal") return;
const tick = setInterval(async () => {
const remain = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
setTimeLeft(remain);
if (remain <= 0) {
const roomRef = ref(database, `rooms/${roomCode}`);
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

// Lobby management
const createRoom = async () => {
if (!name) { alert("Enter your name"); return; }
const code = Math.floor(Math.random() * 9000 + 1000).toString();
setRoomCode(code);
const playerObj = { [name]: { answer: "", vote: [] } };
await set(ref(database, `rooms/${code}`), {
players: playerObj,
impostors: [],
phase: "lobby",
timerEnd: null,
creator: name,
realQuestion: "",
round: 1
});
};

const joinRoom = async () => {
if (!name || !roomCode) { alert("Enter name and room"); return; }
const roomRef = ref(database, `rooms/${roomCode}`);
const snap = await get(roomRef);
if (!snap.exists()) { alert("Room not found"); return; }
await set(ref(database, `rooms/${roomCode}/players/${name}`), { answer: "", vote: [] });
};

// Start round
const startRound = async () => {
if (!roomCode) return;
const roomRef = ref(database, `rooms/${roomCode}`);
const snap = await get(roomRef);
if (!snap.exists()) return;
const data = snap.val();
const playerNames = Object.keys(data.players || {});
if (playerNames.length === 0) return;
const numImpostors = Math.floor(Math.random() * Math.max(1, playerNames.length));
const shuffled = [...playerNames].sort(() => 0.5 - Math.random());
const selectedImpostors = shuffled.slice(0, numImpostors);
const category = promptCategories[Math.floor(Math.random() * promptCategories.length)];
const canonicalReal = category.real;
const updatedPlayers = {};
playerNames.forEach((p) => {
if (selectedImpostors.includes(p)) {
const variant = category.impostors[Math.floor(Math.random() * category.impostors.length)];
updatedPlayers[p] = { answer: "", variant, vote: [] };
} else updatedPlayers[p] = { answer: "", variant: canonicalReal, vote: [] };
});
await update(roomRef, {
players: updatedPlayers,
impostors: selectedImpostors,
realQuestion: canonicalReal,
phase: "answer",
timerEnd: Date.now() + 60 * 1000,
round: data.round || 1
});
};

// Voting
const toggleVote = (playerName) => {
setSelectedVotes(prev =>
prev.includes(playerName) ? prev.filter(p => p !== playerName) : [...prev, playerName]
);
};
const submitVote = async () => {
if (!roomCode || !name) return;
await set(ref(database, `rooms/${roomCode}/players/${name}/vote`), selectedVotes);
};

// Next round
const nextRound = async () => {
if (name !== creator) { alert("Only creator can next round"); return; }
if (round >= 10) { alert("Game over!"); return; }
await update(ref(database, `rooms/${roomCode}`), { round: round + 1 });
setSelectedVotes([]);
startRound();
};

// Confetti trigger
useEffect(() => {
if (phase === "reveal" && confetti) {
Object.entries(players).forEach(([p, data]) => {
if (data.vote.some(v => impostors.includes(v))) {
confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
}
});
}
}, [phase, players, impostors, confetti]);

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
<header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}> <h1>Guess The Liar</h1> <div>Room: {roomCode || "—"} | You: {name || "anon"}</div> </header>

```
  {phase === "lobby" && (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
      <div>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Room" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
        <div>
          <button onClick={createRoom}>Create</button>
          <button onClick={joinRoom}>Join</button>
          {creator === name && <button onClick={startRound}>Start Game</button>}
        </div>
      </div>
      <div>
        <h3>Players</h3>
        {Object.keys(players).map(p => (
          <div key={p}>{p} {p === creator ? "(host)" : ""}</div>
        ))}
      </div>
    </div>
  )}

  {phase === "answer" && (
    <div>
      <h2>Round {round} - Answer Phase</h2>
      <div>Your question: {players[name]?.variant}</div>
      <input
        type="text"
        value={players[name]?.answer || ""}
        onChange={(e) => {
          update(ref(database, `rooms/${roomCode}/players/${name}`), { answer: e.target.value });
        }}
        placeholder="Type your answer"
      />
      <div>Time left: {timeLeft}s</div>
    </div>
  )}

  {phase === "debate" && (
    <div>
      <h2>Debate Phase</h2>
      <div>Real question: {realQuestion}</div>
      <div>
        {Object.keys(players).map(p => (
          <button
            key={p}
            onClick={() => toggleVote(p)}
            style={{ margin: 4, border: selectedVotes.includes(p) ? "2px solid green" : "1px solid #ccc" }}
          >
            {p} {selectedVotes.includes(p) ? "✓" : ""}
          </button>
        ))}
      </div>
      <div>
        <button onClick={submitVote}>Submit Vote</button>
        <span>Time left: {timeLeft}s</span>
      </div>
    </div>
  )}

  {phase === "reveal" && (
    <div>
      <h2>Reveal Phase</h2>
      <div>Impostors: {impostors.join(", ") || "None"}</div>
      <h3>Votes</h3>
      <ul>
        {Object.entries(players).map(([p, data]) => (
          <li key={p}>{p} voted for {data.vote.join(", ") || "Nobody"}</li>
        ))}
      </ul>
      <h3>Most similar answers:</h3>
      <ul>
        {mostSimilarPairs().map((s, i) => (
          <li key={i}>{s.pair.join(" & ")} — {Math.round(s.score * 100)}%</li>
        ))}
      </ul>
      {creator === name && <button onClick={nextRound}>Next Round</button>}
    </div>
  )}
</div>
```

);
}
