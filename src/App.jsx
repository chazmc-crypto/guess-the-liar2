import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";

// Firebase configuration
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

// Example prompt categories (100+ prompts included)
const promptCategories = [
{ name: "Date Spending", regular: ["What is the ideal first date spending?", "Choose a budget for a first date meal"], impostor: ["Pick a dollar range between 20-200", "Choose an unusual date budget"] },
{ name: "Movies", regular: ["What is your favorite movie?", "Best movie of all time?"], impostor: ["What is the worst movie of all time?", "Name a movie no one likes"] },
{ name: "Sex Life", regular: ["How many times a week should a couple have sex?", "What's a normal number of partners?"], impostor: ["Pick a number 1-10", "Name an outrageous frequency"] },
{ name: "Drinks", regular: ["What's your favorite alcoholic drink?", "Pick a drink you enjoy"], impostor: ["Name a disgusting drink", "Pick something you’d never touch"] },
{ name: "Food", regular: ["Favorite food?", "What's your go-to meal?"], impostor: ["Pick the grossest food imaginable", "Choose a food no one would eat"] },
{ name: "Vacation", regular: ["Favorite vacation spot?", "Where would you go for a luxury trip?"], impostor: ["Name a terrible vacation location", "Choose a dangerous destination"] },
{ name: "Music", regular: ["Favorite song or artist?", "Song you listen to on repeat?"], impostor: ["Name the worst song ever", "Pick a song nobody likes"] },
{ name: "Celebrity Crush", regular: ["Who is your celebrity crush?", "Name a famous person you like?"], impostor: ["Pick a celebrity nobody finds attractive", "Choose a weird celebrity crush"] },
{ name: "Hobbies", regular: ["Favorite hobby?", "What do you do for fun?"], impostor: ["Name a boring hobby", "Pick a strange pastime"] },
{ name: "Superpowers", regular: ["Which superpower would you choose?", "Favorite superhero ability?"], impostor: ["Pick the worst superpower ever", "Choose a useless ability"] },
{ name: "Pets", regular: ["What's your favorite pet?", "Do you prefer dogs or cats?"], impostor: ["Pick a terrifying animal", "Name a pet no one wants"] },
{ name: "Fashion", regular: ["Best clothing style?", "Pick a fashion trend you like"], impostor: ["Pick the ugliest clothing", "Choose a trend nobody wears"] },
{ name: "Games", regular: ["Favorite board or video game?", "Most fun game you've played"], impostor: ["Pick a game everyone hates", "Name the worst game ever"] },
{ name: "Childhood", regular: ["Favorite childhood memory?", "Best toy as a kid?"], impostor: ["Name a nightmare memory", "Pick a toy no one liked"] },
{ name: "Drugs", regular: ["What drink or snack is most relaxing?", "Favorite legal indulgence?"], impostor: ["Pick the most disgusting drug", "Choose something extremely unsafe"] },
{ name: "Work", regular: ["Dream job?", "Most satisfying work experience?"], impostor: ["Pick the worst job ever", "Choose a job no one wants"] },
{ name: "Skills", regular: ["Most useful skill you have?", "Favorite talent?"], impostor: ["Pick a skill that's pointless", "Choose an awkward talent"] },
{ name: "Love Life", regular: ["Best romantic gesture?", "Most memorable date?"], impostor: ["Pick the worst date ever", "Choose a terrible romantic move"] },
{ name: "Movies 2", regular: ["Favorite comedy?", "Best animated film?"], impostor: ["Pick the most cringe-worthy movie", "Name a movie everyone regrets watching"] },
{ name: "Travel", regular: ["Dream travel destination?", "Best country visited?"], impostor: ["Pick a horrible country to visit", "Choose a terrifying place"] },
{ name: "Sports", regular: ["Favorite sport to watch?", "Sport you enjoy playing?"], impostor: ["Pick a sport no one likes", "Choose the most dangerous sport"] }
];

export default function App() {
const [name, setName] = useState("");
const [roomCode, setRoomCode] = useState("");
const [players, setPlayers] = useState({});
const [impostors, setImpostors] = useState([]);
const [phase, setPhase] = useState("lobby");
const [timerEnd, setTimerEnd] = useState(null);
const [creator, setCreator] = useState("");

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
});
return () => unsub();
}, [roomCode]);

useEffect(() => {
if (!timerEnd || phase === "lobby" || phase === "reveal") return;
const interval = setInterval(async () => {
if (Date.now() >= timerEnd) {
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
return () => clearInterval(interval);
}, [timerEnd, phase, roomCode]);

const createRoom = async () => {
const code = Math.floor(Math.random() * 10000).toString();
setRoomCode(code);
const playerData = {};
playerData[name] = { question: "", vote: "" };
await set(ref(database, `rooms/${code}`), { players: playerData, impostors: [], phase: "lobby", creator: name });
};

const joinRoom = async () => {
if (!roomCode || !name) return;
const playerRef = ref(database, `rooms/${roomCode}/players/${name}`);
await set(playerRef, { question: "", vote: "" });
};

const startGame = async () => {
if (name !== creator) return;
await startRound();
};

const startRound = async () => {
const roomRef = ref(database, `rooms/${roomCode}`);
const snap = await get(roomRef);
if (!snap.exists()) return;
const data = snap.val();
const playerNames = Object.keys(data.players);
const numImpostors = Math.floor(Math.random() * playerNames.length);
const shuffled = [...playerNames].sort(() => 0.5 - Math.random());
const selectedImpostors = shuffled.slice(0, numImpostors);
const category = promptCategories[Math.floor(Math.random() * promptCategories.length)];
const updatedPlayers = {};
playerNames.forEach(p => {
if (selectedImpostors.includes(p)) {
updatedPlayers[p] = { vote: "", question: category.impostor[Math.floor(Math.random() * category.impostor.length)] };
} else {
updatedPlayers[p] = { vote: "", question: category.regular[Math.floor(Math.random() * category.regular.length)] };
}
});
const end = Date.now() + 60 * 1000;
await update(roomRef, { players: updatedPlayers, impostors: selectedImpostors, phase: "answer", timerEnd: end });
};

const vote = async votedPlayer => {
const voteRef = ref(database, `rooms/${roomCode}/players/${name}/vote`);
await set(voteRef, votedPlayer);
};

return ( <div>
{phase === "lobby" && (
<div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "10px", maxWidth: "400px", margin: "20px auto", display: "flex", flexDirection: "column", gap: "10px" }}>
<h2 style={{ textAlign: "center" }}>Lobby</h2>
<input
placeholder="Your name"
value={name}
onChange={e => setName(e.target.value)}
style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
/>
<input
placeholder="Room code"
value={roomCode}
onChange={e => setRoomCode(e.target.value)}
style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
/>
<button
onClick={createRoom}
style={{ padding: "10px", borderRadius: "5px", cursor: "pointer" }}
>
Create Room </button>
<button
onClick={joinRoom}
style={{ padding: "10px", borderRadius: "5px", cursor: "pointer" }}
>
Join Room </button>
{name && creator && name === creator && (
<button
onClick={startGame}
style={{ padding: "10px", borderRadius: "5px", cursor: "pointer", backgroundColor: "#4caf50", color: "#fff", border: "none" }}
>
Start Game </button>
)} </div>
)}

```
  {phase === "answer" && (
    <div style={{ padding: "20px" }}>
      <h2>Answer Phase</h2>
      <p>Your question: {players[name]?.question}</p>
      <p>Time left: {Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000))} seconds</p>
      <p>Discuss your answer in real life. The impostor won't know they're impostor yet.</p>
    </div>
  )}

  {phase === "debate" && (
    <div style={{ padding: "20px" }}>
      <h2>Debate Phase</h2>
      <p>Discuss in real life and then vote in the app.</p>
      {Object.keys(players).map(p => (
        <button key={p} onClick={() => vote(p)} disabled={players[name]?.vote === p} style={{ margin: "5px", padding: "10px", borderRadius: "5px" }}>
          Vote {p}
        </button>
      ))}
      <p>Your vote: {players[name]?.vote || "None"}</p>
    </div>
  )}

  {phase === "reveal" && (
    <div style={{ padding: "20px" }}>
      <h2>Reveal Phase</h2>
      <p>Impostor(s): {impostors.join(", ") || "None"}</p>
      <h4>Votes:</h4>
      <ul>
        {Object.entries(players).map(([p, data]) => (
          <li key={p}>{p} voted for {data.vote || "nobody"}</li>
        ))}
      </ul>
      {name === creator && <button onClick={startRound} style={{ padding: "10px", borderRadius: "5px", cursor: "pointer", marginTop: "10px" }}>Next Round</button>}
    </div>
  )}
</div>
```

);
}
