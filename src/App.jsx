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

/*
  Full arcade-themed app shell with:
    - animations (Framer Motion)
    - DOM confetti on Reveal
    - vote pop micro-animations
    - avatar editor + persistence
    - import/export JSON & CSV for categories
    - expects Tailwind for best visuals (classes used heavily)
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

// ------------------------ CATEGORY GENERATOR (200) ------------------------
const seedCategories = [
  { name: "Movies", real: "What's your favorite movie?", impostors: ["Name the worst movie ever.", "Pick a movie nobody should watch.", "What's a movie that deserves zero stars?"] },
  { name: "Food", real: "What's your go-to comfort food?", impostors: ["Pick the grossest food you can imagine.", "Name a food you'd refuse to eat ever.", "Describe the worst tasting dish possible."] },
  { name: "Music", real: "Which song or artist do you listen to most?", impostors: ["Name the worst song ever made.", "Pick a genre that ruins music for everyone.", "Choose a track that makes people cringe."] },
  { name: "Travel", real: "What's your dream vacation spot?", impostors: ["Name a terrible vacation location.", "Pick a dangerous place you'd avoid.", "Describe an impossible vacation."] },
  { name: "Hobbies", real: "What's your favorite hobby?", impostors: ["Name the most boring hobby imaginable.", "Pick a pastime that seems dangerous.", "Describe a hobby nobody would try."] },
];

function expandTo200(seeds) {
  const categories = [];
  let counter = 0;
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
    const seed = seeds[counter % seeds.length];
    const tIdx = counter % templates.real.length;
    const impIdx = counter % templates.impostor.length;
    const topic = seed.name || `Topic${counter}`;
    const real = templates.real[tIdx].replace("{topic}", topic.toLowerCase());
    const impostors = [
      templates.impostor[impIdx].replace("{topic}", topic.toLowerCase()),
      templates.impostor[(impIdx + 1) % templates.impostor.length].replace("{topic}", topic.toLowerCase()),
      templates.impostor[(impIdx + 2) % templates.impostor.length].replace("{topic}", topic.toLowerCase()),
    ];

    categories.push({ name: `${topic} ${Math.floor(counter / seeds.length) + 1}`, real, impostors });
    counter++;
  }
  return categories;
}
const defaultCategories = expandTo200(seedCategories);

// ------------------------ CSV / JSON helpers ------------------------
function categoriesToCSV(categories) {
  const lines = [];
  lines.push(["name","real","impostor1","impostor2","impostor3"].join(","));
  categories.forEach(cat => {
    const row = [
      cat.name || "",
      cat.real || "",
      ...(cat.impostors || ["","",""])
    ].map(cell => {
      const s = String(cell || "");
      return '"' + s.replace(/"/g, '""') + '"';
    });
    lines.push(row.join(","));
  });
  return lines.join("\n");
}

function csvToCategories(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const parseRow = (line) => {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { cells.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  };
  const rows = lines.slice(1).map(parseRow);
  const categories = rows.map(cols => ({
    name: cols[0] || "",
    real: cols[1] || "",
    impostors: [cols[2] || "", cols[3] || "", cols[4] || ""].map(x => x || "")
  }));
  return categories;
}

// ------------------------ Confetti (DOM-based) ------------------------
function spawnConfetti(container, count = 40) {
  if (!container) return;
  const colors = ["#f43f5e","#fb923c","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899"];
  const fragments = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const size = Math.random() * 10 + 6;
    el.style.position = "absolute";
    el.style.width = `${size}px`;
    el.style.height = `${size * (Math.random() > 0.5 ? 0.6 : 1.4)}px`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.left = `${Math.random() * 100}%`;
    el.style.top = `${Math.random() * 20}%`;
    el.style.opacity = String(0.9 - Math.random() * 0.6);
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    el.style.borderRadius = `${Math.random() > 0.5 ? "2px" : "50%"}`;
    el.style.pointerEvents = "none";
    el.className = "confetti-frag";
    container.appendChild(el);
    fragments.push(el);

    // animate with CSS transitions
    const endX = (Math.random() - 0.5) * 200;
    const endY = 200 + Math.random() * 400;
    const rot = (Math.random() - 0.5) * 720;
    el.style.transition = `transform 1.6s cubic-bezier(.2,.8,.2,1), top 1.6s linear, left 1.6s linear, opacity 1.6s linear`;
    requestAnimationFrame(() => {
      el.style.top = `${endY}px`;
      el.style.left = `calc(${el.style.left} + ${endX}px)`;
      el.style.transform = `rotate(${rot}deg) translateY(${endY}px)`;
      el.style.opacity = "0";
    });
  }

  // cleanup
  setTimeout(() => {
    fragments.forEach(f => f.remove());
  }, 1800);
}

// ------------------------ Utilities: initials, jaccard (compatibility) ------------------------
function initialsOf(name) {
  if (!name) return "?";
  return name.split(" ").map(s => s[0]?.toUpperCase()).slice(0,2).join("");
}
function tokenize(s) {
  if (!s) return [];
  return s.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean).map(w => {
    if (w.endsWith("ing")) return w.slice(0, -3);
    if (w.endsWith("ed")) return w.slice(0, -2);
    if (w.endsWith("s") && w.length > 2) return w.slice(0, -1);
    return w;
  });
}
function jaccard(a,b) {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  const inter = [...A].filter(x => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
}

// ------------------------ Avatar presets ------------------------
const avatarGradients = [
  "linear-gradient(135deg,#f97316,#f43f5e)",
  "linear-gradient(135deg,#8b5cf6,#06b6d4)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#ec4899,#f97316)",
  "linear-gradient(135deg,#10b981,#84cc16)",
  "linear-gradient(135deg,#7c3aed,#06b6d4)"
];

// ------------------------ Main Component ------------------------
export default function AppArcadeTheme() {
  // player & room
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [categories, setCategories] = useState(defaultCategories);

  // local states
  const [localAnswer, setLocalAnswer] = useState("");
  const [selectedVotes, setSelectedVotes] = useState([]);
  const [importMessage, setImportMessage] = useState("");
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState({ label: "", gradientIndex: 0 });
  const confettiContainerRef = useRef(null);

  // subscribe to room
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onSnapshot(doc(db, "rooms", roomCode), (snap) => {
      if (!snap.exists()) { setRoom(null); return; }
      const data = snap.data();
      setRoom(data);

      // trigger confetti when we transition into reveal phase
      if (data.phase === "reveal") {
        // small delay to ensure UI updated
        setTimeout(() => {
          spawnConfetti(confettiContainerRef.current, 40);
        }, 120);
      }
    });
    return () => unsub();
  }, [roomCode]);

  // ------------------------ Room actions ------------------------
  const createRoom = async () => {
    if (!name.trim()) return alert("Enter a display name");
    const code = Math.random().toString(36).slice(2,6).toUpperCase();
    setRoomCode(code);
    const initial = {
      players: { [name]: { question: "", vote: [], ready: false, avatar: { label: initialsOf(name), gradient: 0 } } },
      host: name,
      impostors: [],
      phase: "lobby",
      realQuestion: "",
      round: 0,
      maxRounds: 10,
      answers: {},
      votes: {},
      scores: { [name]: 0 },
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "rooms", code), initial);
  };

  const joinRoom = async () => {
    if (!name.trim() || !roomCode.trim()) return alert("Enter name and room code");
    const r = doc(db, "rooms", roomCode);
    const snap = await getDoc(r);
    if (!snap.exists()) return alert("Room not found");
    await updateDoc(r, { [`players.${name}`]: { question: "", vote: [], ready: false, avatar: { label: initialsOf(name), gradient: 0 } }, [`scores.${name}`]: 0 });
  };

  // start a full match (creator)
  const startMatch = async () => {
    if (!room) return;
    if (name !== room.host) return alert("Only host can start");
    const playerNames = Object.keys(room.players || {});
    if (playerNames.length === 0) return;
    const numImpostors = Math.max(0, Math.floor(Math.random() * playerNames.length));
    const shuffled = [...playerNames].sort(() => 0.5 - Math.random());
    const selectedImpostors = shuffled.slice(0, numImpostors);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const canonicalReal = category.real;
    const updatedPlayers = {};
    playerNames.forEach(p => {
      if (selectedImpostors.includes(p)) {
        const variant = category.impostors[Math.floor(Math.random() * category.impostors.length)];
        updatedPlayers[p] = { question: variant, vote: [], ready: false, avatar: room.players?.[p]?.avatar || { label: initialsOf(p), gradient: 0 } };
      } else {
        updatedPlayers[p] = { question: canonicalReal, vote: [], ready: false, avatar: room.players?.[p]?.avatar || { label: initialsOf(p), gradient: 0 } };
      }
    });

    await updateDoc(doc(db, "rooms", roomCode), {
      players: updatedPlayers,
      impostors: selectedImpostors,
      realQuestion: canonicalReal,
      phase: "answer",
      timerEnd: Date.now() + 60 * 1000,
      round: (room.round || 0) + 1,
    });

    // initialize answers & votes for the new round
    const r = (room.round || 0) + 1;
    await updateDoc(doc(db, "rooms", roomCode), {
      [`answers.${r}`]: {},
      [`votes.${r}`]: {},
    });
  };

  // submit typed answer
  const submitAnswer = async () => {
    if (!room) return;
    const r = room.round || 0;
    await updateDoc(doc(db, "rooms", roomCode), { [`answers.${r}.${name}`]: localAnswer || "", [`players.${name}.ready`]: true });
    // small local feedback could be added
  };

  // toggle vote (multi up to n-1)
  const toggleVote = (target) => {
    if (!room) return;
    if (target === name) return;
    const max = Math.max(0, Object.keys(room.players || {}).length - 1);
    if (selectedVotes.includes(target)) {
      setSelectedVotes(selectedVotes.filter(s => s !== target));
    } else {
      if (selectedVotes.length >= max) {
        // optional UI pulse - ignore extra selection
        return;
      }
      setSelectedVotes([...selectedVotes, target]);
    }
  };

  // submit votes
  const submitVotes = async () => {
    if (!room) return;
    const r = room.round || 0;
    await updateDoc(doc(db, "rooms", roomCode), { [`votes.${r}.${name}`]: selectedVotes, [`players.${name}.ready`]: true, [`players.${name}.vote`]: selectedVotes.join(", ") });
    setSelectedVotes([]);
  };

  // compute scores & reveal (called after debate timer ends or host triggers)
  const computeScoresAndReveal = async () => {
    if (!room) return;
    const r = room.round || 0;
    const allVotes = (room.votes && room.votes[r]) || {};
    const impost = new Set(room.impostors || []);
    const currentScores = { ...(room.scores || {}) };
    const playersList = Object.keys(room.players || {});

    // ensure score entries
    playersList.forEach(p => { if (currentScores[p] === undefined) currentScores[p] = 0; });

    // voter + impostor scoring
    Object.entries(allVotes).forEach(([voter, arr]) => {
      const voted = Array.isArray(arr) ? arr : (arr ? [arr] : []);
      voted.forEach(target => { if (impost.has(target)) currentScores[voter] = (currentScores[voter] || 0) + 1; });
    });

    (room.impostors || []).forEach(imp => {
      let fooled = 0;
      playersList.forEach(p => {
        if (p === imp) return;
        const pVotes = (allVotes[p] || []);
        const votedFor = Array.isArray(pVotes) ? pVotes.includes(imp) : false;
        if (!votedFor) fooled += 1;
      });
      currentScores[imp] = (currentScores[imp] || 0) + fooled;
    });

    await updateDoc(doc(db, "rooms", roomCode), { scores: currentScores, phase: "reveal", timerEnd: null });
  };

  // finish round -> either next round or finalize match & compute compatibility
  const finalizeOrNext = async () => {
    if (!room) return;
    const next = (room.round || 0) + 1;
    if (next > (room.maxRounds || 10)) {
      // compute compatibility
      const answersByRound = room.answers || {};
      const playersList = Object.keys(room.players || {});
      const pairScores = {};
      playersList.forEach((a,i) => {
        for (let j = i+1; j < playersList.length; j++) {
          const b = playersList[j];
          pairScores[`${a}|${b}`] = { sum: 0, count: 0 };
        }
      });
      for (let r = 1; r <= (room.round || 0); r++) {
        const ans = answersByRound[r] || {};
        playersList.forEach((a,i) => {
          for (let j = i+1; j < playersList.length; j++) {
            const b = playersList[j];
            const sc = jaccard(ans[a]||"", ans[b]||"");
            pairScores[`${a}|${b}`].sum += sc;
            pairScores[`${a}|${b}`].count += 1;
          }
        });
      }
      const results = [];
      Object.entries(pairScores).forEach(([k,v]) => {
        const avg = v.count>0 ? v.sum/v.count : 0;
        const [a,b] = k.split("|");
        results.push({ a,b,avg });
      });
      results.sort((x,y) => y.avg - x.avg);
      const top3 = results.slice(0,3);
      const least = results.slice(-1)[0] || null;
      const perPlayer = {};
      playersList.forEach(p => {
        let sum = 0, count = 0;
        results.forEach(e => { if (e.a===p || e.b===p) { sum += e.avg; count++; }});
        perPlayer[p] = count>0 ? Math.round((sum/count)*100) : 0;
      });
      const summary = { top3, least, perPlayer, finalScores: room.scores || {} };
      await updateDoc(doc(db, "rooms", roomCode), { phase: "summary", summary });
    } else {
      // start next round - keep host, scores; pick fresh category & impostors
      const playerNames = Object.keys(room.players || {});
      let numImpostors = Math.max(0, Math.floor(Math.random() * playerNames.length));
      const shuffled = [...playerNames].sort(() => 0.5 - Math.random());
      const selectedImpostors = shuffled.slice(0, numImpostors);
      const category = categories[Math.floor(Math.random() * categories.length)];
      const canonicalReal = category.real;
      const updatedPlayers = {};
      playerNames.forEach(p => {
        if (selectedImpostors.includes(p)) {
          const variant = category.impostors[Math.floor(Math.random() * category.impostors.length)];
          updatedPlayers[p] = { question: variant, vote: [], ready: false, avatar: room.players?.[p]?.avatar || { label: initialsOf(p), gradient: 0 } };
        } else {
          updatedPlayers[p] = { question: canonicalReal, vote: [], ready: false, avatar: room.players?.[p]?.avatar || { label: initialsOf(p), gradient: 0 } };
        }
      });
      await updateDoc(doc(db, "rooms", roomCode), {
        players: updatedPlayers,
        impostors: selectedImpostors,
        realQuestion: canonicalReal,
        phase: "answer",
        timerEnd: Date.now() + 60*1000,
        round: next,
      });
      // init answers/votes
      await updateDoc(doc(db, "rooms", roomCode), {
        [`answers.${next}`]: {},
        [`votes.${next}`]: {},
      });
    }
  };

  // ------------------------ Import / Export Handlers ------------------------
  const exportJSON = () => {
    const dataStr = JSON.stringify(categories, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `categories_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const exportCSV = () => {
    const csv = categoriesToCSV(categories);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `categories_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const handleImportFile = (file) => {
    setImportMessage("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        let parsed;
        if (file.name.toLowerCase().endsWith('.json')) {
          parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) throw new Error("JSON must be an array of categories");
        } else {
          parsed = csvToCategories(text);
        }
        setCategories(parsed);
        setImportMessage(`Imported ${parsed.length} categories`);
        // Optionally persist globally:
        // await updateDoc(doc(db, "meta", "categories"), { categories: parsed });
      } catch (err) {
        console.error(err);
        setImportMessage("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  const onFileInput = (evt) => {
    const f = evt.target.files && evt.target.files[0];
    if (f) handleImportFile(f);
  };

  // ------------------------ Avatar Editor ------------------------
  const openAvatarEditor = () => {
    setAvatarModalOpen(true);
    const av = room?.players?.[name]?.avatar;
    setAvatarDraft({ label: av?.label || initialsOf(name), gradientIndex: av?.gradient || 0 });
  };
  const saveAvatar = async () => {
    if (!room) return;
    const av = { label: avatarDraft.label || initialsOf(name), gradient: avatarDraft.gradientIndex || 0 };
    // persist into players[name].avatar
    await updateDoc(doc(db, "rooms", roomCode), { [`players.${name}.avatar`]: av });
    setAvatarModalOpen(false);
  };

  // ------------------------ UI fragments ------------------------
  const NeonCard = ({ children, className = "" }) => (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className={`bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700 shadow-2xl p-4 rounded-2xl ${className}`}>
      {children}
    </motion.div>
  );

  const AvatarView = ({ player }) => {
    const av = player?.avatar || { label: initialsOf(player?.label || ""), gradient: 0 };
    const playerMeta = room?.players?.[player] || {};
    const gradient = avatarGradients[ playerMeta?.avatar?.gradient || 0 ] || avatarGradients[0];
    const label = playerMeta?.avatar?.label || initialsOf(player);
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-xl w-10 h-10 flex items-center justify-center text-white font-bold" style={{ background: gradient }}>
          {label}
        </div>
      </div>
    );
  };

  // ------------------------ Render ------------------------
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-indigo-950 via-slate-900 to-slate-800 p-8 text-slate-100">
      <div ref={confettiContainerRef} style={{ position: "absolute", left: 0, top: 0, right: 0, pointerEvents: "none", zIndex: 60 }} />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-yellow-300 to-cyan-300">ARCADE LIAR</div>
            <div className="text-sm text-slate-400">neon build</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">Room <strong className="ml-1">{roomCode || "—"}</strong></div>
            <div className="text-sm">You: <strong>{name || "anonymous"}</strong></div>
          </div>
        </div>

        {/* Top-level controls */}
        {!room && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <NeonCard>
              <div className="flex gap-2">
                <input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} className="flex-1 rounded-lg px-3 py-2 bg-slate-900/60 border border-slate-700" />
                <input placeholder="Room code" value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())} className="w-40 rounded-lg px-3 py-2 bg-slate-900/60 border border-slate-700" />
              </div>
              <div className="flex gap-2 mt-3">
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-cyan-400 font-bold" onClick={createRoom}><Play size={16}/> Create</button>
                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 font-bold" onClick={joinRoom}><Zap size={16}/> Join</button>
                <label className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 ml-auto flex items-center gap-2 cursor-pointer">
                  <input type="file" accept=".json,.csv" onChange={onFileInput} style={{ display: "none" }} />
                  <Upload size={16}/> Import
                </label>
              </div>

              <div className="mt-4 border-t border-slate-700 pt-3">
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-md bg-slate-700/40" onClick={exportJSON}><Download size={14}/> Export JSON</button>
                  <button className="px-3 py-2 rounded-md bg-slate-700/40" onClick={exportCSV}><Download size={14}/> Export CSV</button>
                </div>
                <div className="text-sm text-slate-400 mt-2">{importMessage}</div>
              </div>
            </NeonCard>

            <NeonCard>
              <h3 className="font-bold text-white">Preview Avatar</h3>
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ background: avatarGradients[avatarDraft.gradientIndex] }}>{avatarDraft.label || initialsOf(name)}</div>
                  <div>
                    <div className="text-sm text-slate-300">Open avatar editor to customize your badge</div>
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-2 rounded-md bg-teal-500" onClick={openAvatarEditor}><ImageIcon size={14}/> Edit Avatar</button>
                    </div>
                  </div>
                </div>
              </div>
            </NeonCard>
          </div>
        )}

        {/* In-room UI */}
        {room && (
          <AnimatePresence>
            <motion.div key={roomCode} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}>
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <NeonCard>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-400">Round</div>
                        <div className="text-2xl font-extrabold">{room.round}/{room.maxRounds}</div>
                        <div className="text-sm text-slate-500 mt-1">Phase: <strong className="text-teal-300">{room.phase}</strong></div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-sm text-slate-400">Impostors</div>
                        <div className="text-white font-bold">{(room.impostors||[]).length}</div>
                        {name === room.host && (
                          <button className="px-3 py-2 rounded-md bg-yellow-400 text-slate-900 flex items-center gap-2" onClick={() => {
                            // quick: choose a category for display (creator control)
                            const idx = Math.floor(Math.random() * categories.length);
                            const cat = categories[idx];
                            updateDoc(doc(db, "rooms", roomCode), { realQuestion: cat.real });
                          }}><Crown size={14}/> Next Q</button>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-sm text-slate-400">Real question (debate)</div>
                      <div className="mt-2 text-xl font-semibold text-white">{room.realQuestion || "—"}</div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-slate-400">Your private prompt</div>
                        <div className="mt-2 p-3 bg-slate-900/40 border border-slate-700 rounded-lg min-h-[72px]">{room.players?.[name]?.question || "Waiting..."}</div>

                        <textarea className="w-full mt-3 rounded-lg bg-slate-900/50 p-3 border border-slate-700" placeholder="Type your answer (optional)" value={localAnswer} onChange={(e)=>setLocalAnswer(e.target.value)} />
                        <div className="mt-2 flex gap-2">
                          <button className="px-3 py-2 rounded-md bg-cyan-500" onClick={submitAnswer}>Save Answer</button>
                          <button className="px-3 py-2 rounded-md bg-slate-700" onClick={()=>setLocalAnswer("")}>Clear</button>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-slate-400">Voting (pick who you think are impostors)</div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {Object.keys(room.players||{}).filter(p => p !== name).map(p => {
                            const selected = selectedVotes.includes(p);
                            return (
                              <motion.button
                                key={p}
                                onClick={() => toggleVote(p)}
                                whileTap={{ scale: 0.95 }}
                                animate={{ scale: selected ? 1.03 : 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                className={`p-2 rounded-lg border ${selected ? 'border-teal-300 bg-slate-700/30' : 'border-slate-700 bg-transparent'}`}
                              >
                                {p}
                              </motion.button>
                            );
                          })}
                        </div>
                        <div className="mt-3">
                          <button className="px-4 py-2 rounded-md bg-emerald-500" onClick={submitVotes}>Submit Vote</button>
                        </div>
                      </div>
                    </div>

                  </NeonCard>

                  {/* Reveal & Scores when phase is reveal */}
                  {room.phase === "reveal" && (
                    <NeonCard className="mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-slate-400">Reveal — Round {room.round}</div>
                          <div className="text-lg font-bold">Impostor(s): <span className="text-yellow-300">{(room.impostors||[]).length ? room.impostors.join(", ") : "None"}</span></div>
                        </div>
                        {name === room.host && (
                          <div className="flex gap-2">
                            <button className="px-3 py-2 rounded-md bg-blue-500" onClick={computeScoresAndReveal}>Recompute</button>
                            <button className="px-3 py-2 rounded-md bg-teal-500" onClick={finalizeOrNext}>Next Round</button>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm text-slate-400">Votes this round</h4>
                        <ul className="mt-2 space-y-1">
                          {Object.entries(room.players || {}).map(([p, d]) => (
                            <li key={p} className="flex justify-between">
                              <div>{p}</div>
                              <div className="text-slate-300">{d.vote || "—"}</div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm text-slate-400">Scores</h4>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {Object.entries(room.scores || {}).map(([p,s]) => (
                            <div key={p} className="p-2 rounded-md bg-slate-900/30 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: avatarGradients[(room.players?.[p]?.avatar?.gradient)||0] }}>{room.players?.[p]?.avatar?.label || initialsOf(p)}</div>
                                <div>{p}</div>
                              </div>
                              <div className="font-bold text-teal-300">{s}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </NeonCard>
                  )}

                  {/* Summary */}
                  {room.phase === "summary" && (
                    <NeonCard className="mt-4">
                      <h3 className="text-xl font-bold">Match Summary</h3>
                      <div className="mt-3">
                        <h4 className="text-sm text-slate-400">Final Scores</h4>
                        <ul className="mt-2 space-y-1">
                          {Object.entries(room.summary?.finalScores || room.scores || {}).sort((a,b)=>b[1]-a[1]).map(([p,s]) => (
                            <li key={p} className="flex justify-between"><div>{p}</div><div className="font-bold">{s}</div></li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm text-slate-400">Top compatible pairs</h4>
                        <ol className="mt-2 list-decimal ml-5 space-y-1">
                          {room.summary?.top3?.map((t,i) => <li key={i}>{t.a} & {t.b} — {Math.round(t.avg*100)}%</li>)}
                        </ol>
                      </div>
                    </NeonCard>
                  )}

                </div>

                {/* Right column: players list & controls */}
                <div>
                  <NeonCard>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold">Players</h4>
                      <div className="text-slate-400 text-sm">Scores</div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {Object.entries(room.players || {}).map(([p, meta]) => (
                        <div key={p} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-900/30 border border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: avatarGradients[meta?.avatar?.gradient || 0] }}>{meta?.avatar?.label || initialsOf(p)}</div>
                            <div className="text-white font-semibold">{p}{p===room.host? " (host)" : ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-teal-300 font-bold">{(room.scores||{})[p] || 0}</div>
                            {p === name && <button className="px-2 py-1 rounded-md bg-slate-700" onClick={openAvatarEditor}>Edit</button>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="text-sm text-slate-400">Controls</div>
                      <div className="mt-2 flex gap-2">
                        {name === room.host && <button className="px-3 py-2 rounded-md bg-emerald-500" onClick={startMatch}>Start Match</button>}
                        <button className="px-3 py-2 rounded-md bg-slate-700" onClick={() => {
                          // quick reset to lobby (host only)
                          if (name !== room.host) return alert("Host only");
                          updateDoc(doc(db, "rooms", roomCode), { phase: "lobby", timerEnd: null, impostors: [], realQuestion: "", round: 0 });
                        }}>Reset</button>
                      </div>
                    </div>
                  </NeonCard>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Avatar editor modal */}
        <AnimatePresence>
          {avatarModalOpen && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={()=>setAvatarModalOpen(false)} />
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="relative z-60 bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Edit Avatar</h3>
                  <button onClick={()=>setAvatarModalOpen(false)} className="p-2 rounded-md bg-slate-800"><X size={14}/></button>
                </div>

                <div className="mb-3">
                  <label className="text-sm text-slate-400">Label (initials or emoji)</label>
                  <input value={avatarDraft.label} onChange={(e)=>setAvatarDraft({...avatarDraft, label: e.target.value})} className="w-full mt-2 p-2 rounded-md bg-slate-800 border border-slate-700" />
                </div>

                <div className="mb-4">
                  <label className="text-sm text-slate-400">Background</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {avatarGradients.map((g, idx) => (
                      <button key={idx} onClick={()=>setAvatarDraft({...avatarDraft, gradientIndex: idx})} className={`h-12 rounded-lg ${avatarDraft.gradientIndex === idx ? 'ring-2 ring-offset-2 ring-cyan-400' : ''}`} style={{ background: g }} />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button className="px-3 py-2 rounded-md bg-slate-700" onClick={()=>setAvatarModalOpen(false)}>Cancel</button>
                  <button className="px-3 py-2 rounded-md bg-cyan-500" onClick={saveAvatar}>Save</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Small inline styles for confetti fragments */}
      <style>{`
        .confetti-frag { will-change: transform, opacity; border-radius: 3px; z-index: 9999; }
      `}</style>
    </div>
  );
}
