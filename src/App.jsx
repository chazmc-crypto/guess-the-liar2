import { useState, useEffect } from "react";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

function randomName() {
  const colors = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange"];
  const animals = ["Fox", "Bear", "Panda", "Tiger", "Lion", "Eagle"];
  return colors[Math.floor(Math.random() * colors.length)] + " " + animals[Math.floor(Math.random() * animals.length)];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth);
      else setUser(u);
    });
  }, []);

  async function createRoom() {
    if (!user) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = doc(db, "lobbies", code);

    const playerObj = { id: user.uid, name: displayName || randomName(), joinedAt: Date.now() };
    const roomDataObj = {
      code,
      hostId: user.uid,
      createdAt: Date.now(),
      playersList: [playerObj],
      playersMap: { [user.uid]: true },
      started: false,
      mode: null,
      currentPrompt: null,
      roles: {},
      impostorCount: null,
      round: 0
    };

    await setDoc(roomRef, roomDataObj);
    subscribeToRoom(code);
  }

  async function joinRoom() {
    if (!user || !roomCode) return;
    const roomRef = doc(db, "lobbies", roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return alert("Room not found");

    const data = snap.data();
    const playerObj = { id: user.uid, name: displayName || randomName(), joinedAt: Date.now() };
    const updatedPlayersList = [...(data.playersList || []), playerObj];
    const updatedPlayersMap = { ...(data.playersMap || {}), [user.uid]: true };

    await setDoc(roomRef, { ...data, playersList: updatedPlayersList, playersMap: updatedPlayersMap });
    subscribeToRoom(roomCode);
  }

  function subscribeToRoom(code) {
    const roomRef = doc(db, "lobbies", code);
    onSnapshot(roomRef, (snap) => snap.exists() && setRoomData(snap.data()));
  }

  if (!user) return <div>Loading...</div>;
  if (!roomData) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Guess The Liar</h1>
        <input placeholder="Your Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <button onClick={createRoom}>Create Room</button>
        <input placeholder="Room Code" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} />
        <button onClick={joinRoom}>Join Room</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Room {roomData.code}</h1>
      <h2>Players:</h2>
      {roomData.playersList.map((p) => <p key={p.id}>{p.name}</p>)}
      <p>Game interface coming here… prompts, roles, start round.</p>
    </div>
  );
}