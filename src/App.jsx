import React, { useState, useEffect } from "react";
import { database } from "./firebase";
import { ref, set, get, update, onValue } from "firebase/database";

const prompts = [
  "What is the correct amount of money to spend on a first date?",
  "Pick a dollar range between $20-500",
  "What is the best pizza topping?",
  "Pick a weird pizza topping"
];

function App() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState({});
  const [phase, setPhase] = useState("waiting");
  const [timeLeft, setTimeLeft] = useState(0);
  const [voteTarget, setVoteTarget] = useState("");
  const [impostors, setImpostors] = useState([]);
  const [error, setError] = useState("");

  // --- Generate Room Code ---
  const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  // --- Create Room ---
  const createRoom = async () => {
    if (!name) {
      setError("Enter your name");
      return;
    }
    const code = generateRoomCode();
    const roomRef = ref(database, `rooms/${code}`);

    await set(roomRef, {
      players: { [name]: { question: "", vote: "" } },
      phase: "waiting",
      timerEnd: 0,
      impostors: []
    });

    setRoomCode(code);
    setPhase("waiting");
    setError("");
  };

  // --- Join Room ---
  const joinRoom = async () => {
    if (!name || !roomCode) {
      setError("Enter your name and room code");
      return;
    }

    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) {
      setError("Room not found");
      return;
    }

    const roomData = snapshot.val();
    const updatedPlayers = { ...roomData.players, [name]: { question: "", vote: "" } };
    await update(roomRef, { players: updatedPlayers });
    setError("");
  };

  // --- Start Game ---
  const startGame = async () => {
    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;

    const roomData = snapshot.val();
    const playerNames = Object.keys(roomData.players);

    // Random number of impostors: 0 to n-1
    const numImpostors = Math.floor(Math.random() * playerNames.length);
    const shuffled = [...playerNames].sort(() => 0.5 - Math.random());
    const selectedImpostors = shuffled.slice(0, numImpostors);

    // Assign questions per player
    const updatedPlayers = {};
    playerNames.forEach((p) => {
      const isImpostor = selectedImpostors.includes(p);
      const question = prompts[Math.floor(Math.random() * prompts.length)];
      updatedPlayers[p] = { question, vote: "" };
    });

    const timerEnd = Date.now() + 60 * 1000; // 1 min answer phase

    await update(roomRef, {
      players: updatedPlayers,
      impostors: selectedImpostors,
      phase: "answer",
      timerEnd
    });
  };

  // --- Handle Timer Sync ---
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(database, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      setPlayers(data.players || {});
      setPhase(data.phase || "waiting");

      // Calculate time left
      if (data.timerEnd) {
        setTimeLeft(Math.max(Math.floor((data.timerEnd - Date.now()) / 1000), 0));
      }

      setImpostors(data.phase === "reveal" ? data.impostors || [] : []);
    });

    return () => unsubscribe();
  }, [roomCode]);

  // --- Start Next Phase (answer -> debate -> voting -> reveal) ---
  useEffect(() => {
    if (!roomCode || !phase) return;

    const roomRef = ref(database, `rooms/${roomCode}`);

    let timerInterval;
    if (phase === "answer") {
      timerInterval = setInterval(() => {
        const snapshot = get(roomRef).then(snap => {
          if (!snap.exists()) return;
          const end = snap.val().timerEnd;
          const remaining = Math.max(Math.floor((end - Date.now()) / 1000), 0);
          setTimeLeft(remaining);
          if (remaining <= 0) {
            clearInterval(timerInterval);
            const newEnd = Date.now() + 3 * 60 * 1000; // 3 min debate
            update(roomRef, { phase: "debate", timerEnd: newEnd });
          }
        });
      }, 500);
    } else if (phase === "debate") {
      timerInterval = setInterval(() => {
        const snapshot = get(roomRef).then(snap => {
          if (!snap.exists()) return;
          const end = snap.val().timerEnd;
          const remaining = Math.max(Math.floor((end - Date.now()) / 1000), 0);
          setTimeLeft(remaining);
          if (remaining <= 0) {
            clearInterval(timerInterval);
            update(roomRef, { phase: "voting", timerEnd: 0 });
          }
        });
      }, 500);
    }

    return () => clearInterval(timerInterval);
  }, [phase, roomCode]);

  // --- Cast Vote ---
  const castVote = async () => {
    if (!voteTarget) return;
    const roomRef = ref(database, `rooms/${roomCode}/players/${name}`);
    await update(roomRef, { vote: voteTarget });

    // Check if everyone voted
    const roomSnap = await get(ref(database, `rooms/${roomCode}/players`));
    const allVoted = Object.values(roomSnap.val()).every(p => p.vote);
    if (allVoted) {
      await update(ref(database, `rooms/${roomCode}`), { phase: "reveal" });
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Guess The Liar</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!roomCode && (
        <div>
          <input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginRight: 10 }}
          />
          <input
            placeholder="Enter room code to join"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            style={{ marginRight: 10 }}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={createRoom}>Create Room</button>
            <button onClick={joinRoom}>Join Room</button>
          </div>
        </div>
      )}

      {roomCode && phase === "waiting" && (
        <div>
          <h2>Room Code: {roomCode}</h2>
          <button onClick={startGame}>Start Game</button>
          <ul>
            {Object.keys(players).map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {(phase === "answer" || phase === "debate") && (
        <div>
          <h2>Phase: {phase}</h2>
          <h3>Time left: {timeLeft} seconds</h3>
          <h4>Your Question:</h4>
          <p>{players[name]?.question}</p>
          <ul>
            {Object.keys(players).map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {phase === "voting" && (
        <div>
          <h2>Voting Phase</h2>
          <h3>Who is the impostor?</h3>
          <select value={voteTarget} onChange={(e) => setVoteTarget(e.target.value)}>
            <option value="">Select a player</option>
            {Object.keys(players).filter(p => p !== name).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button onClick={castVote}>Submit Vote</button>
        </div>
      )}

      {phase === "reveal" && (
        <div>
          <h2>Reveal Phase</h2>
          <h3>Impostor(s): {impostors.join(", ") || "None"}</h3>
          <h4>Votes:</h4>
          <ul>
            {Object.entries(players).map(([p, data]) => (
              <li key={p}>{p} voted for {data.vote || "nobody"}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
