import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";

// ---------------- FIREBASE CONFIG ----------------
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

// ---------------- PROMPT CATEGORIES ----------------
const promptCategories = [
{
name: "Movies",
real: "What's your favorite movie?",
impostors: ["Worst movie ever?", "Pick a bad movie.", "Movie with zero stars?"]
},
{
name: "Food",
real: "What's your comfort food?",
impostors: ["Grossest food?", "Food you'd never eat?", "Worst tasting dish?"]
},
{
name: "Music",
real: "Favorite song/artist?",
impostors: ["Worst song ever?", "Genre that ruins music?", "Track that makes people cringe?"]
}
];

// ---------------- APP COMPONENT ----------------
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

// ---------------- SYNC ROOM ----------------
useEffect(() => {
if (!roomCode) return;
const roomRef = ref(database, `rooms/${roomCode}`);
const unsub = onValue(roomRef, snapshot => {
const data = snapshot.val();
if (!data) return;
setPlayers(data.players || {});
setImpostors(data.impostors || []);
setPhase(data.phase || "lobby");
setTimerEnd(data.timerEnd || null);
setCreator(data.creator || "");
setRealQuestion(data.realQuestion || "");
});
return () => unsub();
}, [roomCode]);

// ---------------- TIMER ----------------
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
await update(roomRef, { phase: "debate", timerEnd: Date.now() + 180000 });
} else if (phase === "debate") {
await update(roomRef, { phase: "reveal", timerEnd: null });
}
}
}, 1000);
return () => clearInterval(tick);
}, [timerEnd, phase, roomCode]);

// ---------------- ROOM ACTIONS ----------------
const createRoom = async () => {
if (!name) return alert("Enter your display name.");
const code = Math.floor(Math.random() * 9000 + 1000).toString();
setRoomCode(code);
const playerObj = { [name]: { question: "", vote: "" } };
await set(ref(database, `rooms/${code}`), {
players: playerObj,
impostors: [],
phase: "lobby",
timerEnd: null,
creator: name,
realQuestion: ""
});
};

const joinRoom = async () => {
if (!name || !roomCode) return alert("Enter room code and name.");
const roomRef = ref(database, `rooms/${roomCode}`);
const snap = await get(roomRef);
if (!snap.exists()) return alert("Room not found.");
await set(ref(database, `rooms/${roomCode}/players/${name}`), { question: "", vote: "" });
};

const startRound = async () => {
if (!roomCode) return;
const roomRef = ref(database, `rooms/${roomCode}`);
const snap = await get(roomRef);
if (!snap.exists()) return;
const data = snap.val();
const names = Object.keys(data.players || {});
if (names.length === 0) return;

```
const numImpostors = Math.floor(Math.random() * Math.max(1, names.length));
const shuffled = [...names].sort(() => 0.5 - Math.random());
const selectedImpostors = shuffled.slice(0, numImpostors);

const category = promptCategories[Math.floor(Math.random() * promptCategories.length)];
const canonicalReal = category.real;
const updatedPlayers = {};
names.forEach(p => {
  if (selectedImpostors.includes(p)) {
    const variant = category.impostors[Math.floor(Math.random() * category.impostors.length)];
    updatedPlayers[p] = { question: variant, vote: "" };
  } else {
    updatedPlayers[p] = { question: canonicalReal, vote: "" };
  }
});

await update(roomRef, {
  players: updatedPlayers,
  impostors: selectedImpostors,
  realQuestion: canonicalReal,
  phase: "answer",
  timerEnd: Date.now() + 60000
});
```

};

const castVote = async target => {
if (!roomCode || !name) return;
await set(ref(database, `rooms/${roomCode}/players/${name}/vote`), target);
};

const startGame = async () => {
if (name !== creator) return alert("Only creator can start game.");
await startRound();
};

const nextRound = async () => {
if (name !== creator) return alert("Only creator can start next round.");
await startRound();
};

// ---------------- UI HELPERS ----------------
const initials = n => (n ? n.split(" ").map(s => s[0].toUpperCase()).slice(0, 2).join("") : "?");
const playerVoted = p => !!players[p]?.vote;

// ---------------- RENDER ----------------
return (
<div style={{ fontFamily: "Inter,Arial,sans-serif", padding: 20, maxWidth: 960, margin: "0 auto" }}> <h1>Guess The Liar</h1> <div>Room: {roomCode || "—"} | You: {name || "anonymous"}</div>

```
  {phase === "lobby" && (
    <div style={{ marginTop: 20 }}>
      <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Room code" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
      <button onClick={createRoom}>Create Room</button>
      <button onClick={joinRoom}>Join Room</button>
      {name && creator === name && <button onClick={startGame}>Start Game</button>}
    </div>
  )}

  {phase === "answer" && (
    <div style={{ marginTop: 20 }}>
      <h2>Answer Phase</h2>
      <div>Your question: {players[name]?.question || "Waiting..."}</div>
      <div>Time left: {timeLeft}s</div>
    </div>
  )}

  {phase === "debate" && (
    <div style={{ marginTop: 20 }}>
      <h2>Debate Phase</h2>
      <div>Real question: {realQuestion || "—"}</div>
      <div>Cast your vote:</div>
      {Object.keys(players).map(p => (
        <button key={p} disabled={players[name]?.vote === p} onClick={() => castVote(p)}>
          {p} {players[name]?.vote === p ? "✓" : ""}
        </button>
      ))}
      <div>Your vote: {players[name]?.vote || "None"} | Time left: {timeLeft}s</div>
    </div>
  )}

  {phase === "reveal" && (
    <div style={{ marginTop: 20 }}>
      <h2>Reveal</h2>
      <div>Real question: {realQuestion}</div>
      <div>Impostors: {impostors.join(", ") || "None"}</div>
      <h4>Votes:</h4>
      <ul>
        {Object.entries(players).map(([p, d]) => (
          <li key={p}>
            {p} voted for {d.vote || "Nobody"}
          </li>
        ))}
      </ul>
      {name === creator && <button onClick={nextRound}>Next Round</button>}
    </div>
  )}
</div>
```

);
}
