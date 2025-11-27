import React, { useState, useEffect } from "react";
import { database } from "./firebase";
import { ref, set, get, onValue, update } from "firebase/database";

// Example prompts
const prompts = [
  "What is the correct amount of money to spend on a first date?",
  "Pick a dollar range between $20-500",
  "What is the best pizza topping?",
  "Pick a weird pizza topping"
];

function App() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [currentRoom, setCurrentRoom] = useState({});
  const [phase, setPhase] = useState("");
  const [timer, setTimer] = useState(0);
  const [voteTarget, setVoteTarget] = useState("");
  const [impostors, setImpostors] = useState([]);
  const [error, setError] = useState("");

  const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  // --- Room Creation ---
  const createRoom = async () => {
    if (!name) {
      setError("Please enter your name");
      return;
    }
    const code = generateRoomCode();
    const roomRef = ref(database, `rooms/${code}`);

    const players = {
      [name]: { question: "", vote: "" }
    };

    await set(roomRef, {
      players,
      impostors: [],
      timerPhase: "waiting"
    });

    setRoomCode(code);
    setCurrentRoom(players);
    setPhase("waiting");
    setError("");
  };

  // --- Join Room ---
  const joinRoom = async () => {
    if (!name || !roomCode) {
      setError("Please enter your name and room code");
      return;
    }
    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      setError("Room not found");
      return;
    }

    const roomData = snapshot.val();
    const players = roomData.players || {};
    players[name] = { question: "", vote: "" };

    await set(roomRef, { ...roomData, players });
    setCurrentRoom(players);
    setPhase(roomData.timerPhase);
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

    // Assign questions
    const updatedPlayers = {};
    playerNames.forEach((p) => {
      const isImpostor = selectedImpostors.includes(p);
      const question = isImpostor
        ? prompts[Math.floor(Math.random() * prompts.length)]
        : prompts[Math.floor(Math.random() * prompts.length)];
      updatedPlayers[p] = { question, vote: "" };
    });

    await update(roomRef, {
      players: updatedPlayers,
      impostors: selectedImpostors,
      timerPhase: "answer"
    });

    setPhase("answer");
    startTimer(60, "debate"); // 1-minute answer time
  };

  // --- Timer Function ---
  const startTimer = (seconds, nextPhase) => {
    setTimer(seconds);
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase(nextPhase);
          if (nextPhase === "debate") startTimer(180, "voting"); // 3-minute debate
          if (nextPhase === "voting") setTimer(0); // stop timer
        }
        return prev - 1;
      });
    }, 1000);
  };

  // --- Vote ---
  const castVote = async () => {
    if (!voteTarget) return;
    const roomRef = ref(database, `rooms/${roomCode}/players/${name}`);
    await update(roomRef, { vote: voteTarget });

    // Check if everyone voted
    const roomSnap = await get(ref(database, `rooms/${roomCode}/players`));
    const players = roomSnap.val();
    const allVoted = Object.values(players).every(p => p.vote);
    if (allVoted) {
      setPhase("reveal");
    }
  };

  // --- Listen for room changes ---
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(database, `rooms/${roomCode}`);
    return onValue(roomRef, snapshot => {
      if (snapshot.exists()) {
        setCurrentRoom(snapshot.val().players || {});
        setPhase(snapshot.val().timerPhase || "");
      }
    });
  }, [roomCode]);

  // --- Fetch impostors only in reveal phase ---
  useEffect(() => {
    if (phase !== "reveal" || !roomCode) return;
    const impostorRef = ref(database, `rooms/${roomCode}/impostors`);
    return onValue(impostorRef, snapshot => {
      setImpostors(snapshot.val() || []);
    });
  }, [phase, roomCode]);

  // --- Render ---
  return (
    <div style={{ padding: 20 }}>
      <h1>Guess The Liar</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!roomCode && (
        <div>
          <input placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} />
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
            {Object.keys(currentRoom).map(p => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {(phase === "answer" || phase === "debate") && (
        <div>
          <h2>Phase: {phase}</h2>
          <h3>Time left: {timer} seconds</h3>
          <h4>Your Question:</h4>
          <p>{currentRoom[name]?.question}</p>
          <ul>
            {Object.keys(currentRoom).map(p => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {phase === "voting" && (
        <div>
          <h2>Voting Phase</h2>
          <h3>Who is the impostor?</h3>
          <select value={voteTarget} onChange={e => setVoteTarget(e.target.value)}>
            <option value="">Select a player</option>
            {Object.keys(currentRoom).filter(p => p !== name).map(p => (
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
            {Object.entries(currentRoom).map(([player, data]) => (
              <li key={player}>{player} voted for {data.vote || "nobody"}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
