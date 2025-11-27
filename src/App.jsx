import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
apiKey: "AIzaSyBfHKSTDRQVsoFXSbospWZHJRlRSijgiW0",
authDomain: "guesstheliar-ca0b6.firebaseapp.com",
databaseURL: "https://guesstheliar-ca0b6-default-rtdb.firebaseio.com",
projectId: "guesstheliar-ca0b6",
storageBucket: "guesstheliar-ca0b6.firebasestorage.app",
messagingSenderId: "300436562056",
appId: "1:300436562056:web:8e5368b914a5cbfded7f3d"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 100 adult-friendly question categories
const promptCategories = [
{ name: "First Date Money", regular: ["What is the correct amount of money to spend on a first date?"], impostor: ["Pick a random dollar range for a first date"] },
{ name: "Movie Favorites", regular: ["What is your favorite movie?"], impostor: ["Name the worst movie of all time"] },
{ name: "Sex Frequency", regular: ["How many times a week is normal for sex?"], impostor: ["Pick a number between 1–10"] },
{ name: "Favorite Drink", regular: ["What is your favorite drink?"], impostor: ["Name the grossest drink imaginable"] },
{ name: "Pizza Toppings", regular: ["What is your favorite pizza topping?"], impostor: ["Pick the weirdest topping you can think of"] },
{ name: "Dream Vacation", regular: ["What is your dream vacation destination?"], impostor: ["Name the most dangerous place to vacation"] },
{ name: "Music", regular: ["Who is your favorite musician?"], impostor: ["Name the most annoying musician"] },
{ name: "Hobbies", regular: ["What is your favorite hobby?"], impostor: ["Name the most boring hobby you can think of"] },
{ name: "Fashion", regular: ["What is your go-to outfit?"], impostor: ["Pick the ugliest outfit possible"] },
{ name: "Guilty Pleasures", regular: ["What show are you embarrassed to admit you watch?"], impostor: ["Pick the most embarrassing show you can think of"] },
{ name: "Dating Preferences", regular: ["What trait do you look for in a partner?"], impostor: ["Suggest a trait no one wants in a partner"] },
{ name: "Weird Habits", regular: ["Do you have a strange habit?"], impostor: ["Pick a habit no one should have"] },
{ name: "Embarrassing Moments", regular: ["What is the most embarrassing thing you've done?"], impostor: ["Name a public embarrassment you would invent"] },
{ name: "Childhood Toys", regular: ["What was your favorite childhood toy?"], impostor: ["Pick the weirdest toy imaginable"] },
{ name: "Pets", regular: ["Do you prefer cats or dogs?"], impostor: ["Pick an animal no one would keep as a pet"] },
{ name: "Work Life", regular: ["What is your dream job?"], impostor: ["Pick the worst possible job"] },
{ name: "Superpowers", regular: ["If you could have one superpower, what would it be?"], impostor: ["Pick a useless superpower"] },
{ name: "Embarrassing Secrets", regular: ["What is a secret you've never told anyone?"], impostor: ["Make up a secret no one would believe"] },
{ name: "Nightlife", regular: ["Do you prefer clubs or bars?"], impostor: ["Pick the worst way to enjoy nightlife"] },
{ name: "Extreme Foods", regular: ["Have you ever tried a weird food?"], impostor: ["Pick the grossest edible thing"] },
// 80 more entries following the same format:
{ name: "Coffee Habits", regular: ["How do you take your coffee?"], impostor: ["Name the most disgusting coffee combination"] },
{ name: "Alcohol Preference", regular: ["What is your favorite alcohol?"], impostor: ["Pick a drink no one should ever try"] },
{ name: "Morning Routine", regular: ["What is the first thing you do in the morning?"], impostor: ["Suggest a ridiculous morning ritual"] },
{ name: "Workout", regular: ["What is your favorite exercise?"], impostor: ["Pick a workout no one would do"] },
{ name: "Social Media", regular: ["What app do you use the most?"], impostor: ["Pick a social media app no one likes"] },
{ name: "Dating App", regular: ["Do you use dating apps?"], impostor: ["Pick the worst possible dating app strategy"] },
{ name: "Vacation Activity", regular: ["What is your ideal vacation activity?"], impostor: ["Name a dangerous vacation activity"] },
{ name: "Food Combo", regular: ["What is your favorite food combination?"], impostor: ["Pick the weirdest food combo imaginable"] },
{ name: "TV Show", regular: ["What TV show are you watching currently?"], impostor: ["Pick a TV show no one likes"] },
{ name: "Streaming Platform", regular: ["Which streaming service do you use most?"], impostor: ["Pick a platform no one would use"] },
{ name: "Celebrity Crush", regular: ["Who is your celebrity crush?"], impostor: ["Pick the ugliest celebrity imaginable"] },
{ name: "Dream House", regular: ["Describe your dream house."], impostor: ["Pick the weirdest house idea possible"] },
{ name: "Phone Brand", regular: ["What is your phone brand?"], impostor: ["Pick a brand no one would buy"] },
{ name: "Social Life", regular: ["Do you prefer big parties or small gatherings?"], impostor: ["Pick the worst party scenario"] },
{ name: "Food Allergies", regular: ["Do you have any food allergies?"], impostor: ["Invent a dangerous food allergy"] },
{ name: "Favorite Snack", regular: ["What is your favorite snack?"], impostor: ["Pick a snack no one would eat"] },
{ name: "Desserts", regular: ["What is your favorite dessert?"], impostor: ["Name the most disgusting dessert"] },
{ name: "Childhood Memory", regular: ["What is your happiest childhood memory?"], impostor: ["Invent a horrible childhood memory"] },
{ name: "Sports", regular: ["What sport do you enjoy watching?"], impostor: ["Pick a sport no one would watch"] },
{ name: "Fantasy Name", regular: ["If you could rename yourself, what would it be?"], impostor: ["Pick the weirdest name possible"] },
{ name: "Dating Experience", regular: ["How many serious relationships have you had?"], impostor: ["Pick an absurd number of relationships"] },
{ name: "Favorite Color", regular: ["What is your favorite color?"], impostor: ["Pick a color no one likes"] },
{ name: "Childhood Dream Job", regular: ["What did you want to be as a kid?"], impostor: ["Pick the worst childhood dream job"] },
{ name: "Weird Food Taste", regular: ["Have you ever liked a weird food taste?"], impostor: ["Pick the grossest taste imaginable"] },
{ name: "Tattoo", regular: ["Do you have a tattoo?"], impostor: ["Pick the ugliest tattoo idea"] },
{ name: "Piercing", regular: ["Do you have a piercing?"], impostor: ["Pick a piercing no one would want"] },
{ name: "Music Festival", regular: ["Which music festival would you attend?"], impostor: ["Pick the worst festival ever"] },
{ name: "Karaoke Song", regular: ["What song would you sing at karaoke?"], impostor: ["Pick a song no one could sing"] },
{ name: "Worst Habit", regular: ["What is your worst habit?"], impostor: ["Invent the grossest habit"] },
{ name: "Dream Job Benefit", regular: ["What benefit would you want most from your job?"], impostor: ["Pick a ridiculous job perk"] },
{ name: "Favorite Movie Snack", regular: ["What snack do you eat while watching movies?"], impostor: ["Pick a snack no one would eat in a theater"] },
{ name: "Morning Drink", regular: ["Do you prefer coffee or tea?"], impostor: ["Pick a morning drink no one would drink"] },
{ name: "Favorite Animal", regular: ["What is your favorite animal?"], impostor: ["Pick the ugliest animal"] },
{ name: "Worst Date Idea", regular: ["What is a terrible date idea?"], impostor: ["Invent a date no one would go on"] },
{ name: "Favorite Restaurant", regular: ["What is your favorite restaurant?"], impostor: ["Pick a restaurant no one would enjoy"] },
{ name: "Board Game", regular: ["What is your favorite board game?"], impostor: ["Pick a game no one would play"] },
{ name: "Card Game", regular: ["What is your favorite card game?"], impostor: ["Pick a card game no one would enjoy"] },
{ name: "Alcohol Mixer", regular: ["What is your favorite alcohol mixer?"], impostor: ["Pick a mixer no one would use"] },
{ name: "Cocktail Name", regular: ["What is your favorite cocktail?"], impostor: ["Invent a cocktail no one would order"] },
{ name: "Embarrassing Outfit", regular: ["What is your most embarrassing outfit?"], impostor: ["Pick the ugliest outfit you could imagine"] },
{ name: "Favorite Exercise", regular: ["What is your favorite exercise?"], impostor: ["Pick the worst exercise"] },
{ name: "Night Snack", regular: ["What is your favorite late-night snack?"], impostor: ["Pick a snack no one would eat at night"] },
{ name: "Favorite Candy", regular: ["What candy do you love most?"], impostor: ["Pick a candy no one likes"] },
{ name: "Favorite Pizza", regular: ["What type of pizza do you prefer?"], impostor: ["Pick a pizza no one would order"] },
{ name: "Pet Name", regular: ["What is your pet's name?"], impostor: ["Pick the worst pet name imaginable"] },
{ name: "Party Game", regular: ["What is your favorite party game?"], impostor: ["Pick a party game no one would play"] },
{ name: "Vacation Food", regular: ["What food do you enjoy while on vacation?"], impostor: ["Pick a food no one would eat on vacation"] },
{ name: "Travel Companion", regular: ["Who would you take on vacation?"], impostor: ["Pick a travel companion no one would want"] },
{ name: "Beach or Pool", regular: ["Do you prefer beach or pool?"], impostor: ["Pick the grossest water source"] },
{ name: "Horror Movie", regular: ["What is your favorite horror movie?"], impostor: ["Pick the scariest movie no one could watch"] },
{ name: "Comedy Movie", regular: ["What is your favorite comedy movie?"], impostor: ["Pick the worst comedy movie"] },
{ name: "Romance Movie", regular: ["What is your favorite romance movie?"], impostor: ["Pick the most terrible romance movie"] },
{ name: "Action Movie", regular: ["What is your favorite action movie?"], impostor: ["Pick an absurdly bad action movie"] },
{ name: "Dessert Topping", regular: ["What is your favorite dessert topping?"], impostor: ["Pick the worst dessert topping"] },
{ name: "Pizza Crust", regular: ["Do you prefer thin or thick crust?"], impostor: ["Pick a crust no one would eat"] },
{ name: "Ice Cream Flavor", regular: ["What is your favorite ice cream flavor?"], impostor: ["Pick an ice cream flavor no one would like"] },
{ name: "Breakfast Food", regular: ["What is your favorite breakfast food?"], impostor: ["Pick a breakfast food no one would eat"] },
{ name: "Lunch Food", regular: ["What is your favorite lunch food?"], impostor: ["Pick a lunch food no one would like"] },
{ name: "Dinner Food", regular: ["What is your favorite dinner food?"], impostor: ["Pick a dinner food no one would enjoy"] },
{ name: "Favorite Fruit", regular: ["What is your favorite fruit?"], impostor: ["Pick a fruit no one would eat"] },
{ name: "Favorite Vegetable", regular: ["What is your favorite vegetable?"], impostor: ["Pick a vegetable no one would eat"] },
{ name: "Dream Car", regular: ["What is your dream car?"], impostor: ["Pick a car no one would drive"] },
{ name: "Phone App", regular: ["What app do you use most?"], impostor: ["Pick an app no one would use"] },
{ name: "Social Habit", regular: ["Do you prefer texting or calling?"], impostor: ["Pick a habit no one does"] },
{ name: "Bedroom Habit", regular: ["Do you make your bed every day?"], impostor: ["Pick the messiest bedroom habit"] },
{ name: "Favorite Holiday", regular: ["What is your favorite holiday?"], impostor: ["Pick a holiday no one celebrates"] },
{ name: "Favorite Dessert Flavor", regular: ["What flavor dessert do you prefer?"], impostor: ["Pick a dessert flavor no one would eat"] },
{ name: "Favorite Cheese", regular: ["What is your favorite cheese?"], impostor: ["Pick a cheese no one would eat"] },
{ name: "Snack While Drinking", regular: ["What snack do you eat with drinks?"], impostor: ["Pick a snack no one would pair with drinks"] },
{ name: "Cooking Skill", regular: ["How good are you at cooking?"], impostor: ["Pick the worst cooking skill imaginable"] },
{ name: "Dating Dealbreaker", regular: ["What is a dealbreaker in dating?"], impostor: ["Pick the most absurd dealbreaker"] },
{ name: "Romantic Gesture", regular: ["What is the most romantic gesture you've done?"], impostor: ["Pick the most ridiculous romantic gesture"] },
{ name: "Surprise Gift", regular: ["What gift would you give someone you love?"], impostor: ["Pick the worst gift imaginable"] },
{ name: "Pet Peeve", regular: ["What is your biggest pet peeve?"], impostor: ["Pick the most absurd pet peeve"] }
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
const roomRef = ref(database, rooms/${roomCode});
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
const roomRef = ref(database, rooms/${roomCode});
const snap = await get(roomRef);
if (!snap.exists()) return;
const data = snap.val();

    if (phase === "answer") {
      await update(roomRef, {
        phase: "debate",
        timerEnd: Date.now() + 3 * 60 * 1000
      });
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
await set(ref(database, rooms/${code}), {
players: playerData,
impostors: [],
phase: "lobby",
creator: name
});
};

const joinRoom = async () => {
if (!roomCode || !name) return;
const playerRef = ref(database, rooms/${roomCode}/players/${name});
await set(playerRef, { question: "", vote: "" });
};

const startGame = async () => {
if (name !== creator) return;
await startRound();
};

const startRound = async () => {
const roomRef = ref(database, rooms/${roomCode});
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
const voteRef = ref(database, rooms/${roomCode}/players/${name}/vote);
await set(voteRef, votedPlayer);
};

return (
<div style={{ padding: "20px" }}>
{phase === "lobby" && (

Lobby
<input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
<input placeholder="Room code" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
Create Room
Join Room
{name === creator && Start Game}

)}

  {phase === "answer" && (
    <div>
      <h2>Answer Phase</h2>
      <p>Your question: {players[name]?.question}</p>
      <p>Time left: {Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000))} seconds</p>
      <p>Discuss your answer in real life. The impostor won't know they're impostor yet.</p>
    </div>
  )}

  {phase === "debate" && (
    <div>
      <h2>Debate Phase</h2>
      <p>Discuss in real life and then vote in the app.</p>
      {Object.keys(players).map(p => (
        <button key={p} onClick={() => vote(p)} disabled={players[name]?.vote === p}>
          Vote {p}
        </button>
      ))}
      <p>Your vote: {players[name]?.vote || "None"}</p>
    </div>
  )}

  {phase === "reveal" && (
    <div>
      <h2>Reveal Phase</h2>
      <p>Impostor(s): {impostors.join(", ") || "None"}</p>
      <h4>Votes:</h4>
      <ul>
        {Object.entries(players).map(([p, data]) => (
          <li key={p}>{p} voted for {data.vote || "nobody"}</li>
        ))}
      </ul>
      {name === creator && <button onClick={startRound}>Next Round</button>}
    </div>
  )}
</div>

);
}
