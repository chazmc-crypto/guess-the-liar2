const sanitize = str => str.replace(/[.#$[]\s()]/g, "_").trim();

// Check if path is valid (non-empty and no forbidden characters)
const isValidPath = str => /^[^.#$[]]+$/.test(str) && str.trim() !== "";

const createRoom = async () => {
if (!name || !isValidPath(name)) {
alert("Enter a valid name (no '.', '#', '$', '[', ']')");
return;
}

const code = Math.floor(Math.random() * 9000 + 1000).toString();
const sanitizedCode = sanitize(code);

setRoomCode(code);
const sanitizedName = sanitize(name);

const playerObj = {};
playerObj[sanitizedName] = { answer: "", vote: [] };

await set(ref(database, rooms/${sanitizedCode}), {
players: playerObj,
impostors: [],
phase: "lobby",
timerEnd: null,
creator: sanitizedName,
realQuestion: "",
round: 1
});
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

const roomRef = ref(database, rooms/${sanitize(roomCode)});
const snap = await get(roomRef);
if (!snap.exists()) {
alert("Room not found");
return;
}

const sanitizedName = sanitize(name);
await set(ref(database, rooms/${sanitize(roomCode)}/players/${sanitizedName}), { answer: "", vote: [] });
};

const startRound = async () => {
if (!roomCode || !isValidPath(roomCode)) return;

const roomRef = ref(database, rooms/${sanitize(roomCode)});
const snap = await get(roomRef);
if (!snap.exists()) return;

const data = snap.val();
const playerNames = Object.keys(data.players || {});
if (!playerNames.length) return;

const numImpostors = Math.floor(Math.random() * Math.max(1, playerNames.length));
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
