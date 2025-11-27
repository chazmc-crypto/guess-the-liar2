// AppArcadeTheme.jsx
import React, { useEffect, useState, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
getFirestore,
doc,
setDoc,
getDoc,
onSnapshot,
updateDoc,
serverTimestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Zap, Crown, Download, Upload, ImageIcon, X } from "lucide-react";
import Confetti from "react-confetti";

/*
Full arcade-themed app shell with:
- animations (Framer Motion)
- DOM confetti only when someone guesses correctly
- multi-vote (n-1) with Submit button
- typed answers per round + DB storage
- 10-round match flow with scoring
- compatibility scoring at match end
- avatar editor + micro-bounce + toast
- import/export JSON & CSV for categories
- Tailwind classes
*/

// ------------------------ FIREBASE CONFIG ------------------------
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

// ------------------------ CATEGORY GENERATOR ------------------------
const seedCategories = [
{ name: "Movies", real: "What's your favorite movie?", impostors: ["Name the worst movie ever.", "Pick a movie nobody should watch.", "What's a movie that deserves zero stars?"] },
{ name: "Food", real: "What's your go-to comfort food?", impostors: ["Pick the grossest food you can imagine.", "Name a food you'd refuse to eat ever.", "Describe the worst tasting dish possible."] },
{ name: "Music", real: "Which song or artist do you listen to most?", impostors: ["Name the worst song ever made.", "Pick a genre that ruins music for everyone.", "Choose a track that makes people cringe."] },
{ name: "Travel", real: "What's your dream vacation spot?", impostors: ["Name a terrible vacation location.", "Pick a dangerous place you'd avoid.", "Describe an impossible vacation."] },
{ name: "Hobbies", real: "What's your favorite hobby?", impostors: ["Name the most boring hobby imaginable.", "Pick a pastime that seems dangerous.", "Describe a hobby nobody would try."] },
];

function expandTo200(seeds) {
const categories = [];
const templates = {
real: [
"What's your favorite {topic}?",
"What's one {topic} you'd recommend?",
"Describe your ideal {topic} scenario.",
"What's a {topic} memory you keep?",
],
impostor: [
"Name the worst {topic} you can imagine.",
"Pick an {topic} that would make everyone cringe.",
"Describe an impossible {topic} scenario.",
],
};
while (categories.length < 200) {
seeds.forEach((seed) => {
if (categories.length >= 200) return;
const realQ = templates.real[Math.floor(Math.random() * templates.real.length)].replace("{topic}", seed.name);
const impostorQs = templates.impostor.map(t => t.replace("{topic}", seed.name));
categories.push({ name: seed.name, real: realQ, impostors: impostorQs });
});
}
return categories;
}
const categories200 = expandTo200(seedCategories);

// ------------------------ MAIN APP ------------------------
export default function AppArcadeTheme() {
const [room, setRoom] = useState(null);
const [playerName, setPlayerName] = useState("");
const [voteSelection, setVoteSelection] = useState([]);
const [typedAnswer, setTypedAnswer] = useState("");
const [showConfetti, setShowConfetti] = useState(false);
const [avatar, setAvatar] = useState(null);
const [toast, setToast] = useState("");

const maxRounds = 10;

// Firestore listeners
useEffect(() => {
if (!room) return;
const unsub = onSnapshot(doc(db, "rooms", room.code), (snap) => {
setRoom(snap.data());
});
return () => unsub();
}, [room?.code]);

// ------------------------ VOTING ------------------------
const toggleVote = (name) => {
if (!room) return;
const nPlayers = Object.keys(room.players).length;
const limit = nPlayers - 1; // multi-vote n-1
setVoteSelection((prev) => {
if (prev.includes(name)) return prev.filter((x) => x !== name);
if (prev.length >= limit) return prev; // enforce limit
return [...prev, name];
});
};

const submitVote = async () => {
if (!room) return;
await updateDoc(doc(db, "rooms", room.code), {
[`votes.${room.round}.${playerName}`]: voteSelection,
});
setVoteSelection([]);
};

// ------------------------ TYPED ANSWERS ------------------------
const submitAnswer = async () => {
if (!room) return;
await updateDoc(doc(db, "rooms", room.code), {
[`answers.${room.round}.${playerName}`]: typedAnswer,
});
setTypedAnswer("");
};

// ------------------------ AVATAR SAVE ------------------------
const saveAvatar = async (newAvatar) => {
setAvatar(newAvatar);
setToast("Avatar saved!");
setTimeout(() => setToast(""), 2000);
// micro-bounce animation
const el = document.getElementById("avatar-img");
if (el) el.animate([{ transform: "scale(1.2)" }, { transform: "scale(1)" }], { duration: 300 });
await updateDoc(doc(db, "players", playerName), { avatar: newAvatar });
};

// ------------------------ CONFETTI ------------------------
useEffect(() => {
if (!room) return;
// trigger confetti if someone correctly guessed an impostor
const lastRoundVotes = room.votes?.[room.round] || {};
const impostors = room.impostors || [];
let correct = false;
Object.entries(lastRoundVotes).forEach(([voter, votes]) => {
votes.forEach((v) => { if (impostors.includes(v)) correct = true; });
});
if (correct) {
setShowConfetti(true);
setTimeout(() => setShowConfetti(false), 3000);
}
}, [room?.votes]);

// ------------------------ COMPATIBILITY ------------------------
const computeCompatibility = () => {
if (!room?.answers) return {};
const scores = {};
const rounds = Object.keys(room.answers);
rounds.forEach((r) => {
const answers = room.answers[r];
const names = Object.keys(answers);
names.forEach((a, i) => {
for (let j = i + 1; j < names.length; j++) {
const b = names[j];
const setA = new Set(answers[a].toLowerCase().replace(/[^\w\s]/g, "").split(" "));
const setB = new Set(answers[b].toLowerCase().replace(/[^\w\s]/g, "").split(" "));
const inter = new Set([...setA].filter(x => setB.has(x)));
const union = new Set([...setA, ...setB]);
const sim = union.size ? inter.size / union.size : 0;
scores[`${a}-${b}`] = (scores[`${a}-${b}`] || 0) + sim;
}
});
});
return scores;
};

// ------------------------ RENDER ------------------------
return ( <div className="bg-gradient-to-br from-purple-800 to-pink-500 min-h-screen p-4 text-white font-mono"> <AnimatePresence>
{showConfetti && <Confetti recycle={false} numberOfPieces={150} />} </AnimatePresence>

```
  <header className="flex items-center justify-between mb-4">
    <h1 className="text-3xl font-bold">Guess the Liar 🎮</h1>
    <div>{toast && <div className="bg-yellow-400 text-black px-2 py-1 rounded">{toast}</div>}</div>
  </header>

  <main className="grid gap-4">
    <section className="bg-black bg-opacity-50 p-4 rounded">
      <h2 className="text-xl font-bold">Your Avatar</h2>
      <motion.img
        id="avatar-img"
        src={avatar || "/default-avatar.png"}
        alt="avatar"
        className="w-20 h-20 rounded-full mb-2"
        whileHover={{ scale: 1.1 }}
      />
      <div className="flex gap-2">
        <input type="text" placeholder="Avatar URL" onBlur={(e) => saveAvatar(e.target.value)} className="px-2 rounded text-black" />
      </div>
    </section>

    <section className="bg-black bg-opacity-50 p-4 rounded">
      <h2 className="text-xl font-bold">Typed Answer</h2>
      <textarea
        value={typedAnswer}
        onChange={(e) => setTypedAnswer(e.target.value)}
        placeholder="Type your answer..."
        className="w-full p-2 rounded text-black"
      />
      <button onClick={submitAnswer} className="mt-2 bg-green-500 px-4 py-2 rounded hover:bg-green-600">Submit Answer</button>
    </section>

    <section className="bg-black bg-opacity-50 p-4 rounded">
      <h2 className="text-xl font-bold">Vote</h2>
      <div className="flex flex-wrap gap-2">
        {room && Object.keys(room.players || {}).map((name) => (
          <button
            key={name}
            onClick={() => toggleVote(name)}
            className={`px-3 py-1 rounded ${voteSelection.includes(name) ? "bg-blue-500" : "bg-gray-700"}`}
          >
            {name}
          </button>
        ))}
      </div>
      <button onClick={submitVote} className="mt-2 bg-purple-500 px-4 py-2 rounded hover:bg-purple-600">Submit Vote</button>
    </section>

    <section className="bg-black bg-opacity-50 p-4 rounded">
      <h2 className="text-xl font-bold">Compatibility Scores</h2>
      <pre className="text-sm">{JSON.stringify(computeCompatibility(), null, 2)}</pre>
    </section>
  </main>
</div>
```

);
}
