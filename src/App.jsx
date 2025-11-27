import React, { useState } from "react";

function App() {
  const [playerName, setPlayerName] = useState("");
  const [room, setRoom] = useState("");

  const handleCreateRoom = () => {
    alert(`Create room clicked! Name: ${playerName}`);
  };

  const handleJoinRoom = () => {
    alert(`Join room clicked! Name: ${playerName}, Room: ${room}`);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Guess The Liar</h1>

      <div>
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
      </div>

      <div style={{ marginTop: "20px" }}>
        <button onClick={handleCreateRoom}>Create Room</button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Enter room code to join"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <button onClick={handleJoinRoom} style={{ marginLeft: "10px" }}>
          Join Room
        </button>
      </div>
    </div>
  );
}

export default App;
