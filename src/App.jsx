
import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";

// Firebase config (keep these values secure in production)
const firebaseConfig = {
  apiKey: "AIzaSyBfHKSTDRQVsoFXSbospWZHJRlRSijgiW0",
  authDomain: "guesstheliar-ca0b6.firebaseapp.com",
  databaseURL: "https://guesstheliar-ca0b6-default-rtdb.firebaseio.com",
  projectId: "guesstheliar-ca0b6",
  storageBucket: "guesstheliar-ca0b6.appspot.com",
  messagingSenderId: "300436562056",
  appId: "1:300436562056:web:8e5368b914a5cbfded7f3d"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Sanitize strings for Firebase paths — replace characters that are not allowed in Realtime Database keys
const sanitize = (str = "") =>
  String(str).replace(/[.\#\$\[\]\s]/g, "_").trim();

const isValidPath = (str = "") => {
  const s = String(str);
  // must not be empty and must not contain . # $ [ ] or whitespace
  return s.trim() !== "" && !/[.\#\$\[\]\s]/.test(s);
};

// Dummy prompts (fixed template literal strings)
const promptCategories = Array.from({ length: 200 }).map((_, i) => ({
  name: `Category ${i + 1}`,
  real: `Real question ${i + 1}`,
  impostors: [
    `Impostor A ${i + 1}`,
    `Impostor B ${i + 1}`,
    `Impostor C ${i + 1}`
  ]
}));

// Simple similarity function
const similarityScore = (a = "", b = "") => {
  const setA = new Set(String(a).toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(String(b).toLowerCase().split(/\s+/).filter(Boolean));
  const inter = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size ? inter.size / union.size : 0;
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
      import("canvas-confetti").then(mod => setConfetti(() => mod.default)).catch(() => {});
    }
  }, []);

  // Listen for room updates
  useEffect(() => {
    if (!roomCode) return;
    const sanitizedCode = sanitize(roomCode);
    const roomRef = ref(database, `rooms/${sanitizedCode}`);
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

  // Countdown timer
  useEffect(() => {
    if (!timerEnd || phase === "lobby" || phase === "reveal") return;
    const tick = setInterval(async () => {
      const remain = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimeLeft(remain);
      if (remain <= 0) {
        const sanitizedCode = sanitize(roomCode);
        const roomRef = ref(database, `rooms/${sanitizedCode}`);
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

  const createRoom = async () => {
    if (!name || !isValidPath(name)) {
      alert("Enter a valid name (no '.', '#', '$', '[', ']', or spaces)");
      return;
    }
    // 4-digit code
    const code = Math.floor(Math.random() * 9000 + 1000).toString();
    const sanitizedCode = sanitize(code);
    const sanitizedName = sanitize(name);
    setRoomCode(sanitizedCode);
    const playerObj = {};
    playerObj[sanitizedName] = { answer: "", vote: [] };
    await set(ref(database, `rooms/${sanitizedCode}`), {
      players: playerObj,
      impostors: [],
      phase: "lobby",
      timerEnd: null,
      creator: sanitizedName,
      realQuestion: "",
      round: 1
    });
    setCreator(sanitizedName);
  };

  const joinRoom = async () => {
    if (!name || !roomCode) {
      alert("Enter your name and room code");
      return;
    }
    if (!isValidPath(name) || !isValidPath(roomCode)) {
      alert("Name or room code contains invalid characters");
      return;
    }
    const sanitizedName = sanitize(name);
    const sanitizedCode = sanitize(roomCode);
    const roomRef = ref(database, `rooms/${sanitizedCode}`);
    const snap = await get(roomRef);
    if (!snap.exists()) {
      alert("Room not found");
      return;
    }
    await set(ref(database, `rooms/${sanitizedCode}/players/${sanitizedName}`), { answer: "", vote: [] });
  };

  const startRound = async () => {
    if (!roomCode || !isValidPath(roomCode)) return;
    const sanitizedCode = sanitize(roomCode);
    const roomRef = ref(database, `rooms/${sanitizedCode}`);
    const snap = await get(roomRef);
    if (!snap.exists()) return;
    const data = snap.val();
    const playerNames = Object.keys(data.players || {});
    if (!playerNames.length) return;
    const numImpostors = Math.max(1, Math.floor(playerNames.length / 3)); // set at least one, roughly 1/3rd
    const shuffled = [...playerNames].sort(() => 0.5 - Math.random());
    const selectedImpostors = shuffled.slice(0, numImpostors);
    const category = promptCategories[Math.floor(Math.random() * promptCategories.length)];
    const canonicalReal = category.real;
    const updatedPlayers = {};
    playerNames.forEach(p => {
      const sanitized = sanitize(p);
      if (selectedImpostors.includes(p)) {
        const variant = category.impostors[Math.floor(Math.random() * category.impostors.length)];
        updatedPlayers[sanitized] = { answer: "", variant, vote: [] };
      } else {
        updatedPlayers[sanitized] = { answer: "", variant: canonicalReal, vote: [] };
      }
    });
    await update(roomRef, {
      players: updatedPlayers,
      impostors: selectedImpostors.map(sanitize),
      realQuestion: canonicalReal,
      phase: "answer",
      timerEnd: Date.now() + 60 * 1000,
      round: data.round || 1
    });
  };

  const toggleVote = (playerName) => {
    setSelectedVotes(prev =>
      prev.includes(playerName) ? prev.filter(p => p !== playerName) : [...prev, playerName]
    );
  };

  const submitVote = async () => {
    if (!roomCode || !name) return;
    const sanitizedName = sanitize(name);
    const sanitizedCode = sanitize(roomCode);
    await set(ref(database, `rooms/${sanitizedCode}/players/${sanitizedName}/vote`), selectedVotes);
  };

  const nextRound = async () => {
    if (name !== creator) { alert("Only creator can next round"); return; }
    if (round >= 10) { alert("Game over!"); return; }
    const sanitized = sanitize(roomCode);
    await update(ref(database, `rooms/${sanitized}`), { round: round + 1 });
    setSelectedVotes([]);
    startRound();
  };

  // Confetti for correct votes
  useEffect(() => {
    if (phase === "reveal" && confetti) {
      Object.entries(players).forEach(([p, data]) => {
        if ((data.vote || []).some(v => impostors.includes(v))) {
          try {
            confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
          } catch (e) {}
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
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Guess The Liar</h1>
        <div>Room: {String(roomCode) || "—"} | You: {String(name) || "anon"}</div>
      </header>

      {phase === "lobby" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
          <div>
            <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <input placeholder="Room" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
            <div style={{ marginTop: 8 }}>
              <button onClick={createRoom}>Create</button>
              <button onClick={joinRoom}>Join</button>
              {creator === sanitize(name) && <button onClick={startRound}>Start Game</button>}
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
          <div>Your question: {String(players[sanitize(name)]?.variant)}</div>
          <input
            type="text"
            value={String(players[sanitize(name)]?.answer || "")}
            placeholder="Type your answer"
            onChange={e => {
              const ans = e.target.value;
              update(ref(database, `rooms/${sanitize(roomCode)}/players/${sanitize(name)}`), { answer: ans });
            }}
          />
          <div>Time left: {timeLeft}s</div>
        </div>
      )}

      {phase === "debate" && (
        <div>
          <h2>Debate Phase</h2>
          <div>Real question: {String(realQuestion)}</div>
          <div style={{ margin: "8px 0" }}>
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
            <span style={{ marginLeft: 8 }}>Time left: {timeLeft}s</span>
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
              <li key={p}>{p} voted for {(data.vote || []).join(", ") || "Nobody"}</li>
            ))}
          </ul>
          <h3>Most similar answers:</h3>
          <ul>
            {mostSimilarPairs().map((s, i) => (
              <li key={i}>{s.pair.join(" & ")} — {Math.round(s.score * 100)}%</li>
            ))}
          </ul>
          {creator === sanitize(name) && <button onClick={nextRound}>Next Round</button>}
        </div>
      )}
    </div>
  );
}
