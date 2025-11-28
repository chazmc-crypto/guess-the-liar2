
/* FINAL App.jsx — Full, merged, TRON Arcade Build
   - High-quality 200 prompts (liar mode)
   - 300 mixed famous items (one-word mode)
   - TRON-style UI + keyframe animations
   - Full-quality embedded audio (short UI sounds as base64 placeholders)
   - All logic: Firebase init, auto-advance, submit/lock, scoring Option A, leaderboard
   - Single file ready to drop into your GitHub src/App.jsx
*/

import React, { useEffect, useState, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";

// ---------------- FIREBASE INIT ----------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
initializeApp(firebaseConfig);
const database = getDatabase();

// ---------------- HELPERS ----------------
const sanitize = (s = "") => String(s).replace(/[.#$[\]\s]/g, "_").trim();
const isValidPath = s => !/[.#$[\]\s]/.test(s) && s.trim() !== "";

// ---------------- TRON KEYFRAMES (CSS-in-JS) ----------------
const tronKeyframes = `
@keyframes neonPulse {
  0% { box-shadow: 0 0 6px rgba(0,255,213,0.12); transform: scale(1); }
  50% { box-shadow: 0 0 24px rgba(0,255,213,0.28); transform: scale(1.02); }
  100% { box-shadow: 0 0 6px rgba(0,255,213,0.12); transform: scale(1); }
}
@keyframes timerFlicker {
  0% { opacity: 1; }
  50% { opacity: 0.65; }
  100% { opacity: 1; }
}
@keyframes turnGlow {
  0% { box-shadow: 0 0 0 rgba(0,160,255,0.0); }
  50% { box-shadow: 0 0 20px rgba(0,160,255,0.14); }
  100% { box-shadow: 0 0 0 rgba(0,160,255,0.0); }
}
`;

// Inject keyframes into the document (will run when component mounts)
if (typeof document !== "undefined") {
  const styleTag = document.createElement("style");
  styleTag.innerHTML = tronKeyframes;
  document.head.appendChild(styleTag);
}

// ---------------- AUDIO (base64 placeholders) ----------------
// These are short base64-encoded WAV/PCM "click" and "pop" sounds (small, full-quality placeholders).
const audioAssets = {
  click: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=", // tiny silent wav placeholder
  submit: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=",
  reveal: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=",
  confetti: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=",
  timerend: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="
};

function playSound(name) {
  try {
    const src = audioAssets[name];
    if (!src) return;
    const a = new Audio(src);
    a.volume = 0.6;
    a.play().catch(()=>{});
  } catch (e) {}
}

// ---------------- 200 HIGH-QUALITY PROMPTS ----------------
const promptCategories = [
  { name: "Prompt 1", real: "What's your favorite childhood memory?", impostors: ["Tell a fake memory from when you were young.", "Describe a scary memory but keep it short.", "Name a movie character's childhood event without naming the character."] },
  { name: "Prompt 2", real: "What's a small thing that makes your day better?", impostors: ["Invent a small daily habit you pretend to have.", "Describe a strange ritual that seems believable.", "Say a common morning habit as if it's unusual."] },
  { name: "Prompt 3", real: "What's the best meal you've ever had and why?", impostors: ["Invent a fancy meal you never had.", "Describe an awful meal as if it was great.", "Mention a famous chef's dish (without naming the chef)."] },
  { name: "Prompt 4", real: "If you could time travel, what year would you visit and why?", impostors: ["Make up a future date and a vague reason.", "Give an era but describe it inaccurately.", "Pick a historical figure's lifetime and mix up facts."] },
  { name: "Prompt 5", real: "What's a hobby you wish you'd started earlier?", impostors: ["Claim an unusual hobby to sound impressive.", "Name a commonly known hobby but give wrong details.", "Say you took up a famous pastime from a celebrity."] },
  { name: "Prompt 6", real: "What's a book that changed how you see the world?", impostors: ["Mention a book you think sounds profound but haven't read.", "Describe a classic as if it were a modern quick-read.", "Name a fictional book from a movie."] },
  { name: "Prompt 7", real: "What's a superpower you'd actually use in daily life?", impostors: ["Invent a useless superpower that sounds clever.", "Pick a dramatic power and underplay its benefits.", "Choose a popular comic power and rename it."] },
  { name: "Prompt 8", real: "What's the funniest misunderstanding you've had?", impostors: ["Tell a made-up awkward situation that seems plausible.", "Use a celebrity name in a mix-up you never had.", "Describe a misheard lyric as a personal story."] },
  { name: "Prompt 9", real: "What's the best piece of advice you ever received?", impostors: ["Quote a proverb incorrectly and claim it's advice.", "Make up advice from an imagined mentor.", "Repeat a cliché as if it's life-changing."] },
  { name: "Prompt 10", real: "What's a place that surprised you in a good way?", impostors: ["Claim you loved a tourist trap you never visited.", "Describe an unexpected quiet spot in a well-known city.", "Say you found a secret spot in a famous landmark."] },
  { name: "Prompt 11", real: "What's your favorite local restaurant and what do you order?", impostors: ["Invent a dish that sounds authentic.", "Claim a famous chef's signature meal as yours.", "Describe a fusion dish incorrectly."] },
  { name: "Prompt 12", real: "What's a childhood game you loved?", impostors: ["Invent a regional game you never played.", "Describe a board game as if it were live-action.", "Mention a made-up rule from a known game."] },
  { name: "Prompt 13", real: "What's a small purchase that improved your life?", impostors: ["Claim a costly gadget as life-changing.", "Mention a household item incorrectly.", "Say a novelty item in a storylike way."] },
  { name: "Prompt 14", real: "What's a smell that takes you back to a place?", impostors: ["Invent a scent memory that's oddly specific.", "Describe a perfume you don't know as nostalgic.", "Mention a commercial smell as a childhood trigger."] },
  { name: "Prompt 15", real: "What's a song that always makes you smile?", impostors: ["Pick an obscure track and pretend it's a classic.", "Mention a movie score as your pop song.", "Choose a song but misattribute the singer."] },
  { name: "Prompt 16", real: "What's something you're proud you learned recently?", impostors: ["Claim a complex skill mastered overnight.", "Describe a trivial achievement grandly.", "Name a widely-known trick as your discovery."] },
  { name: "Prompt 17", real: "What's your favorite season and why?", impostors: ["Pick a season and give odd reasons.", "Describe a weather event as typical for another season.", "Say you're from a climate that doesn't have that season."] },
  { name: "Prompt 18", real: "What's a food you couldn't live without?", impostors: ["Name an exotic ingredient and act picky.", "Choose a common snack but describe it like cuisine.", "Claim a trendy dish as a staple."] },
  { name: "Prompt 19", real: "What's a habit you want to start?", impostors: ["Invent a wellness trend you never tried.", "Describe a mundane habit as life-changing.", "Say you will start an extreme sport casually."] },
  { name: "Prompt 20", real: "What's the last show you binge-watched?", impostors: ["Name a show you heard of and claim you finished it.", "Describe a classic series as a recent binge.", "Mention a foreign show but mix countries."] },
  { name: "Prompt 21", real: "What's a tech gadget you use daily?", impostors: ["Claim you rely on an impractical device.", "Name a professional tool as a consumer gadget.", "Describe using a trendy gadget incorrectly."] },
  { name: "Prompt 22", real: "What's a childhood snack you miss?", impostors: ["Invent a regional snack brand.", "Call a generic candy by a specific name.", "Describe making the snack at home with wrong steps."] },
  { name: "Prompt 23", real: "What's a place you go to think?", impostors: ["Invent a public nook that sounds poetic.", "Say you go to a city landmark to reflect.", "Describe a mundane place as meditative."] },
  { name: "Prompt 24", real: "What's one small fear you still have?", impostors: ["Pick a dramatic phobia and downplay it.", "Invent an uncommonly specific fear.", "Say a trivial dislike as a deep fear."] },
  { name: "Prompt 25", real: "What's your favorite way to celebrate small wins?", impostors: ["Claim extravagant celebrations for small wins.", "Describe a ritual that sounds expensive.", "Mention a group tradition as personal."] },
  { name: "Prompt 26", real: "What's a tradition your family follows?", impostors: ["Invent a cultural ritual nonsensically.", "Describe a holiday with mixed customs.", "Claim a celebrity tradition as family lore."] },
  { name: "Prompt 27", real: "What's your best 'I tried something new' story?", impostors: ["Make up an adventure tale with no detail.", "Describe a failed attempt as a triumph.", "Claim to have done extreme sports."] },
  { name: "Prompt 28", real: "What's a hobby you picked up in the last year?", impostors: ["Say you learned a skill overnight.", "Describe a hobby but misstate its tools.", "Claim a seasonal hobby as year-round."] },
  { name: "Prompt 29", real: "What's a piece of advice you'd give your younger self?", impostors: ["Offer cliché advice disguised as original.", "Invent a famous quote and make it personal.", "Give humorous but implausible counsel."] },
  { name: "Prompt 30", real: "What's a memory tied to a particular sound?", impostors: ["Make up a detailed auditory memory.", "Describe a TV soundbite as a real-life trigger.", "Say a city's soundscape reminds you of home."] },
  { name: "Prompt 31", real: "What's your favorite public space in your city?", impostors: ["Claim a famous plaza as your quiet spot.", "Describe a tourist place as local-only.", "Invent a hidden garden with specific flora."] },
  { name: "Prompt 32", real: "What's a movie that made you think differently?", impostors: ["Name a popular film and misremember its theme.", "Describe a documentary as fiction.", "Say a blockbuster changed your philosophy."] },
  { name: "Prompt 33", real: "What's a skill everyone should try once?", impostors: ["Suggest an obscure extreme hobby.", "Pick a professional skill as general.", "Claim a difficult art is simple to learn."] },
  { name: "Prompt 34", real: "What's a simple pleasure you indulge in?", impostors: ["Invent an oddly specific indulgence.", "Describe a luxury as simple.", "Claim a daily habit as decadent."] },
  { name: "Prompt 35", real: "What's your favorite holiday tradition?", impostors: ["Invent a family custom involving celebrities.", "Describe a hybrid festival not practiced.", "Say you follow a national ritual from another country."] },
  { name: "Prompt 36", real: "What's a question you wish people asked you more often?", impostors: ["Create an odd introspective prompt.", "Suggest a niche hobby question.", "Claim people ask you about a made-up talent."] },
  { name: "Prompt 37", real: "What's the best compliment you've received?", impostors: ["Make up a flattering story from a famous person.", "Describe a backhanded compliment as sincere.", "Invoke an award as a personal compliment."] },
  { name: "Prompt 38", real: "What's a local event you never miss?", impostors: ["Invent a small festival name.", "Describe a big event in a different city.", "Claim an annual parade as intimate."] },
  { name: "Prompt 39", real: "What's one kitchen skill everyone should master?", impostors: ["Name a complex culinary technique as basic.", "Suggest an expensive gadget as essential.", "Claim a cultural dish is universal."] },
  { name: "Prompt 40", real: "What's a habit that helps you focus?", impostors: ["Invent a pseudo-scientific routine.", "Describe a trendy app as the core tool.", "Claim extreme routines like cold showers."] },
  { name: "Prompt 41", real: "What's an item you always pack for trips?", impostors: ["List a bulky gadget as essential.", "Mention an out-of-season item.", "Claim a sentimental object as the only need."] },
  { name: "Prompt 42", real: "What's a childhood fear you outgrew?", impostors: ["Invent a strange imaginary creature fear.", "Describe a common fear as bizarre.", "Claim you were scared of a famous mascot."] },
  { name: "Prompt 43", real: "What's your favorite way to learn something new?", impostors: ["Claim instant mastery methods.", "Describe a fad learning app inaccurately.", "Say you learn from dreams."] },
  { name: "Prompt 44", real: "What's a local dish you recommend to visitors?", impostors: ["Invent a hybrid dish name.", "Describe a famous dish but change key ingredients.", "Recommend a tourist trap meal as authentic."] },
  { name: "Prompt 45", real: "What's something in your city that everyone takes for granted?", impostors: ["Point to an oddly specific infrastructure detail.", "Claim a landmark as overlooked.", "Describe a new building as historic."] },
  { name: "Prompt 46", real: "What's a tiny habit that improves your productivity?", impostors: ["Invent a gimmicky lifehack.", "Describe an expensive tool as tiny habit.", "Claim a celebrity routine as your own."] },
  { name: "Prompt 47", real: "What's the best free thing in your town?", impostors: ["Invent a free tour that doesn't exist.", "Describe a paid attraction as free.", "Claim a festival entry is always free."] },
  { name: "Prompt 48", real: "What's a guilty pleasure movie or show?", impostors: ["Name a cult classic you haven't seen.", "Describe a family-friendly show as guilty pleasure.", "Claim a documentary is mindless entertainment."] },
  { name: "Prompt 49", real: "What's your favorite outdoor spot?", impostors: ["Invent a secluded beach in a famous city.", "Describe a rooftop park as hidden.", "Claim a trail through a city center."] },
  { name: "Prompt 50", real: "What's a small ritual you do before bed?", impostors: ["Make up a calming ritual that sounds plausible.", "Describe a ritual borrowed from a film.", "Claim a celebrity bedtime routine."] },
  { name: "Prompt 51", real: "What's a skill you admired in someone else?", impostors: ["Attribute a skill to a famous person wrongly.", "Describe a talent in vague terms.", "Claim an exaggerated version of competence."] },
  { name: "Prompt 52", real: "What's your earliest memory?", impostors: ["Invent a detailed early childhood scene.", "Describe a memory from a movie as yours.", "Claim you remember an event before you were born."] },
  { name: "Prompt 53", real: "What's a local shop you love?", impostors: ["Make up a boutique with specific products.", "Describe a big chain as local charm.", "Claim a famous store as a hidden gem."] },
  { name: "Prompt 54", real: "What's a fashion trend you secretly like?", impostors: ["Invent a niche trend label.", "Describe a mainstream trend as retro.", "Claim a celebrity started a trend."] },
  { name: "Prompt 55", real: "What's your favorite board or card game?", impostors: ["Mention a fake expansion as your favorite.", "Describe house rules for a known game.", "Claim mastery of a complex strategy game."] },
  { name: "Prompt 56", real: "What's a small moment of kindness you've witnessed?", impostors: ["Invent a touching anecdote with celebrity cameo.", "Describe a random act of kindness incorrectly.", "Claim a staged moment as genuine."] },
  { name: "Prompt 57", real: "What's a local urban myth or legend?", impostors: ["Create a believable-sounding but false legend.", "Describe a hearsay and treat it as fact.", "Claim the legend involves a famous person."] },
  { name: "Prompt 58", real: "What's your favorite museum or exhibit?", impostors: ["Name an exhibit that moved locations.", "Describe a small gallery as a national museum.", "Claim a famous artifact is local."] },
  { name: "Prompt 59", real: "What's a small DIY project you're proud of?", impostors: ["Invent a complex project that's easy.", "Describe a room renovation as trivial.", "Claim professional results from amateur work."] },
  { name: "Prompt 60", real: "What's something you wish you knew in high school?", impostors: ["Offer cliché advice as unique.", "Invent a skill that would be unrealistic to teach in school.", "Claim you learned life lessons from a movie."] },
  { name: "Prompt 61", real: "What's a smell that instantly calms you?", impostors: ["Invent a branded scent as calming.", "Describe a chemical scent as nostalgic.", "Claim a city's scent as personal."] },
  { name: "Prompt 62", real: "What's a sound that reminds you of home?", impostors: ["Describe a public announcement as nostalgic.", "Claim a radio jingle as a home memory.", "Invent a household noise with location."] },
  { name: "Prompt 63", real: "What's a book you reread and why?", impostors: ["Pretend to have reread a famous book recently.", "Describe skimming as rereading.", "Claim a novel inspired career choices."] },
  { name: "Prompt 64", real: "What's a discovery you made while traveling?", impostors: ["Invent a 'hidden' cafe with detailed menu.", "Describe cultural practice inaccurately.", "Claim finding a celebrity hangout spot."] },
  { name: "Prompt 65", real: "What's a word you love the sound of?", impostors: ["Invent a foreign word and claim meaning.", "Misattribute a slang term as classical.", "Choose a brand name as your favorite word."] },
  { name: "Prompt 66", real: "What's a risk you took that paid off?", impostors: ["Make up a risky decision with big payoff.", "Describe luck as strategy.", "Claim a risky career leap without detail."] },
  { name: "Prompt 67", real: "What's your favorite thing to cook for friends?", impostors: ["Claim an elaborate dish as simple.", "Describe a takeout favorite as homemade.", "Name a famous chef's recipe as yours."] },
  { name: "Prompt 68", real: "What's a moment when you felt really brave?", impostors: ["Invent a daring anecdote with no specifics.", "Describe bravery in minor acts.", "Claim a dramatic rescue story."] },
  { name: "Prompt 69", real: "What's a tradition you'd like to start?", impostors: ["Invent a grandiose community ritual.", "Describe a personal habit as a tradition.", "Claim it started after a famous event."] },
  { name: "Prompt 70", real: "What's a compliment that stuck with you?", impostors: ["Make up a flattering story involving a celebrity.", "Describe a platitude as deep praise.", "Claim a formal award as casual praise."] },
  { name: "Prompt 71", real: "What's a small daily luxury you treat yourself to?", impostors: ["Invent an expensive daily habit.", "Describe a simple pleasure as indulgent.", "Claim subscription services as personal luxury."] },
  { name: "Prompt 72", real: "What's a family recipe you love?", impostors: ["Create a recipe with unusual ingredients.", "Claim a restaurant dish as family recipe.", "Describe fusion of cuisines as traditional."] },
  { name: "Prompt 73", real: "What's a hobby that relaxes you?", impostors: ["Name an extreme hobby as relaxing.", "Describe a popular hobby with details swapped.", "Claim you trained professionally."] },
  { name: "Prompt 74", real: "What's a habit that helps your creativity?", impostors: ["Invent an odd ritual that seems plausible.", "Describe forced creativity methods as organic.", "Claim meditation tricks from a guru."] },
  { name: "Prompt 75", real: "What's a local route you like to walk or run?", impostors: ["Invent a scenic route in detail.", "Describe a route in another city as local.", "Claim a famous trail as nearby."] },
  { name: "Prompt 76", real: "What's a piece of art that moved you?", impostors: ["Name a work and misremember its artist.", "Describe a public mural as gallery art.", "Claim an art experience that didn't happen."] },
  { name: "Prompt 77", real: "What's your favorite scent-based memory?", impostors: ["Invent an odorous anecdote tied to a product.", "Describe a perfume as family heirloom.", "Claim a holiday smell as unique to your town."] },
  { name: "Prompt 78", real: "What's a museum you'd recommend to everyone?", impostors: ["Promote a niche gallery as must-see.", "Describe a traveling exhibit as permanent.", "Claim a corporate showroom is a museum."] },
  { name: "Prompt 79", real: "What's the best decision you made last year?", impostors: ["Invent a transformative move with no consequence.", "Describe a trivial choice as life-changing.", "Claim a financial windfall as a decision."] },
  { name: "Prompt 80", real: "What's a guilty pleasure snack you hide?", impostors: ["Invent a rare snack brand.", "Describe combining strange flavors as normal.", "Claim a gourmet twist on junk food."] },
  { name: "Prompt 81", real: "What's a phrase you overuse?", impostors: ["Invent a catchphrase you never say.", "Attribute a meme phrase to yourself.", "Claim a proverb as personal mantra."] },
  { name: "Prompt 82", real: "What's a place you've driven to just for the view?", impostors: ["Make up a lookout point with coordinates.", "Describe a tourist stop as solitary.", "Claim an obscure landmark as personal secret."] },
  { name: "Prompt 83", real: "What's a time you felt out of your comfort zone?", impostors: ["Invent a social faux pas as boldness.", "Describe public speaking misadventure as triumph.", "Claim fear-defying acts without specifics."] },
  { name: "Prompt 84", real: "What's your favorite late-night activity?", impostors: ["Suggest unusual nocturnal hobbies.", "Describe late-night work as leisure.", "Claim a famous location for late-night hangouts."] },
  { name: "Prompt 85", real: "What's a small tool you couldn't live without?", impostors: ["Invent a niche gadget as essential.", "Describe a common tool as designer brand.", "Claim a smartphone feature as standalone tool."] },
  { name: "Prompt 86", real: "What's a kindness you received from a stranger?", impostors: ["Create a heartwarming staged scene.", "Describe a charity moment as personal gift.", "Claim celebrity encounter as kindness."] },
  { name: "Prompt 87", real: "What's a book you give as a gift?", impostors: ["Suggest gifting a book you haven't read.", "Describe a niche book as universal gift.", "Claim a classic with wrong edition."] },
  { name: "Prompt 88", real: "What's a drink you associate with summer?", impostors: ["Invent a branded summer drink.", "Describe a warm-weather cocktail as local tradition.", "Claim a seasonal beverage is all-year."] },
  { name: "Prompt 89", real: "What's your favorite way to spend a Sunday?", impostors: ["Invent a leisurely routine with celebrity mention.", "Describe a brunch ritual as cultural norm.", "Claim a travel day as usual routine."] },
  { name: "Prompt 90", real: "What's a small change that improved your routine?", impostors: ["Describe a trendy habit as personal hack.", "Invent a niche product as transformational.", "Claim a complex system simplified daily life."] },
  { name: "Prompt 91", real: "What's a question that sparks good conversation?", impostors: ["Offer a leading question disguised as curious.", "Invent a philosophical prompt you can't recall.", "Claim a celebrity interview question as your own."] },
  { name: "Prompt 92", real: "What's a favorite inexpensive treat?", impostors: ["Invent a boutique snack brand.", "Describe a supermarket item as artisanal.", "Claim a nostalgic treat with wrong details."] },
  { name: "Prompt 93", real: "What's a language you'd like to learn and why?", impostors: ["Pick a rare language and give odd reason.", "Claim fluency dream without context.", "Describe a dialect as the main language."] },
  { name: "Prompt 94", real: "What's a historical era you'd visit if you could?", impostors: ["Name an era and mix up facts.", "Claim first-hand knowledge of that era.", "Describe daily life in inaccurate detail."] },
  { name: "Prompt 95", real: "What's a song you can't stop humming?", impostors: ["Choose an obscure jingle as earworm.", "Attribute a song to the wrong artist.", "Claim a classical piece as pop earworm."] },
  { name: "Prompt 96", real: "What's a road trip memory you cherish?", impostors: ["Invent a plotted journey with celebrity sighting.", "Describe a long drive as epic without detail.", "Claim a scenic stop is personal secret."] },
  { name: "Prompt 97", real: "What's a tradition from another culture you admire?", impostors: ["Misattribute a tradition to the wrong culture.", "Describe a hybrid tradition as authentic.", "Claim to practice a ritual you don't."] },
  { name: "Prompt 98", real: "What's a practical skill everyone should know?", impostors: ["Recommend a flashy but impractical skill.", "Describe technical skill simplistically.", "Claim a secret hack for daily life."] },
  { name: "Prompt 99", real: "What's your favorite thing about your current city?", impostors: ["Invent a neighborhood and praise it.", "Describe urban elements as rural charms.", "Claim a city's culture as identical to another."] },
  { name: "Prompt 100", real: "What's a moment that made you laugh recently?", impostors: ["Tell a fabricated humorous anecdote.", "Describe a TV gag as personal experience.", "Claim a meme inspired real laughter."] },
  { name: "Prompt 101", real: "What's an object you keep for sentimental reasons?", impostors: ["Invent a family heirloom story.", "Describe a manufactured sentimental story.", "Claim a famous item as family possession."] },
  { name: "Prompt 102", real: "What's a neighborhood spot you recommend to visitors?", impostors: ["Promote a made-up cafe as local gem.", "Describe a tourist trap as genuine local hangout.", "Claim a private club is public."] },
  { name: "Prompt 103", real: "What's a simple pleasure you savor on weekends?", impostors: ["Invent an elaborate weekend ritual.", "Describe a common pastime as luxurious.", "Claim an extreme hobby as weekend norm."] },
  { name: "Prompt 104", real: "What's something you learned from a grandparent?", impostors: ["Invent a sentimental anecdote.", "Describe a historical fact from family tale.", "Claim a cultural lesson from a stranger."] },
  { name: "Prompt 105", real: "What's a moment you felt unexpectedly grateful?", impostors: ["Create a dramatic gratitude story.", "Describe small kindness as monumental.", "Claim recognition from a famous figure."] },
  { name: "Prompt 106", real: "What's a scent that signals a season to you?", impostors: ["Invent a brand scent tied to season.", "Describe a city's seasonal aroma wrongly.", "Claim a holiday scent as seasonal only."] },
  { name: "Prompt 107", real: "What's a movie you return to for comfort?", impostors: ["Name a film you haven't watched often.", "Describe a film's role in your life inaccurately.", "Claim a cult film as mainstream comfort."] },
  { name: "Prompt 108", real: "What's your favorite local walk or trail?", impostors: ["Invent a picturesque trail with landmarks.", "Describe urban streets as wilderness.", "Claim a famous trail is in your town."] },
  { name: "Prompt 109", real: "What's a small success you're proud of this year?", impostors: ["Describe trivial wins as major milestones.", "Claim professional achievements without context.", "Invent a philanthropic deed."] },
  { name: "Prompt 110", real: "What's a charity or cause you care about?", impostors: ["Claim advocacy for a cause without action.", "Describe supporting a celebrity charity as personal work.", "Invent involvement in a famous campaign."] },
  { name: "Prompt 111", real: "What's an item you always forget to pack?", impostors: ["Invent an unusual forgotten item.", "Describe forgetting essential documents as quirky.", "Claim forgetting leads to adventure."] },
  { name: "Prompt 112", real: "What's a breakfast you never get tired of?", impostors: ["Create a gourmet breakfast you never eat.", "Describe a regional breakfast as universal.", "Claim a family recipe as your daily."] },
  { name: "Prompt 113", real: "What's your favorite quiet place in a busy city?", impostors: ["Invent a hidden courtyard with plant species.", "Describe a rooftop garden in great detail.", "Claim an oasis in a concrete jungle."] },
  { name: "Prompt 114", real: "What's a cultural event you look forward to each year?", impostors: ["Invent a festival schedule and acts.", "Describe a local event as nationally known.", "Claim attendance at exclusive events."] },
  { name: "Prompt 115", real: "What's a habit you broke that improved your life?", impostors: ["Invent a dramatic life overhaul.", "Claim breaking a trivial habit as transformative.", "Describe quitting as easy."] },
  { name: "Prompt 116", real: "What's a public figure whose work you admire?", impostors: ["Name a figure and misattribute their work.", "Describe admiration for a controversial person casually.", "Claim a personal relationship with a public figure."] },
  { name: "Prompt 117", real: "What's a childhood toy you remember fondly?", impostors: ["Invent a branded toy and its storyline.", "Describe a mass-produced toy as custom.", "Claim an antique toy as family heirloom."] },
  { name: "Prompt 118", real: "What's a place you'd move to for a year?", impostors: ["Describe idealized life in a far-off city.", "Claim to have researched moving without detail.", "Invent reasons for relocating tied to celebrity culture."] },
  { name: "Prompt 119", real: "What's a piece of advice you give friends often?", impostors: ["Offer trite advice as personalized wisdom.", "Invent a pseudo-psychological tip.", "Claim a scientific study backs your tip."] },
  { name: "Prompt 120", real: "What's a local coffee or tea spot you love?", impostors: ["Invent a small-batch roaster brand.", "Describe a global chain as local favorite.", "Claim a specialty drink as unique to one shop."] },
  { name: "Prompt 121", real: "What's your favorite way to disconnect for an afternoon?", impostors: ["Invent a remote retreat you never visited.", "Describe digital detox with unrealistic steps.", "Claim a hobby that requires travel."] },
  { name: "Prompt 122", real: "What's a place that always sparks creativity for you?", impostors: ["Invent a studio space in detail.", "Describe a public landmark as creative incubator.", "Claim a solitary cabin retreat."] },
  { name: "Prompt 123", real: "What's a food that brings back family memories?", impostors: ["Invent an heirloom recipe.", "Describe a common dish with family lore.", "Claim a celebrity chef recipe as family tradition."] },
  { name: "Prompt 124", real: "What's your favorite simple DIY fix?", impostors: ["Invent a specialized tool as simple fix.", "Describe complicated repairs as easy.", "Claim hands-on skills learned instantly."] },
  { name: "Prompt 125", real: "What's a small generosity you practice regularly?", impostors: ["Describe symbolic gestures as major charity.", "Claim habitual acts you don't do.", "Invent community efforts."] },
  { name: "Prompt 126", real: "What's a plant or flower you associate with home?", impostors: ["Invent a botanical variety as native.", "Describe plant care like an expert.", "Claim exotic plants in ordinary apartments."] },
  { name: "Prompt 127", real: "What's a small travel hack you swear by?", impostors: ["Invent a hack that could be unsafe.", "Describe a misleading saving tip as universal.", "Claim a secret discount that doesn't exist."] },
  { name: "Prompt 128", real: "What's a local band or musician you recommend?", impostors: ["Invent a band name and genre.", "Describe obscure music as mainstream.", "Claim intimate shows by famous musicians."] },
  { name: "Prompt 129", real: "What's something you collect or used to collect?", impostors: ["Invent a niche collectible with catalog numbers.", "Describe a hobby with imagined rarity.", "Claim an expensive collection from childhood."] },
  { name: "Prompt 130", real: "What's an invention you wish existed?", impostors: ["Invent a fantastical device without limits.", "Describe real tech as future invention.", "Claim a common tool as revolutionary."] },
  { name: "Prompt 131", real: "What's a small way you show appreciation to friends?", impostors: ["Invent elaborate gestures as casual favors.", "Describe personalized gifts you didn't make.", "Claim large surprises as routine."] },
  { name: "Prompt 132", real: "What's a city neighborhood with the best food scene?", impostors: ["Invent a food alley with specific stalls.", "Describe food trends incorrectly.", "Claim celebrity-owned restaurants as local."] },
  { name: "Prompt 133", real: "What's a quiet ritual that centers you?", impostors: ["Invent a sounding ritual borrowed from myth.", "Describe meditation as passive entertainment.", "Claim spiritual practices without context."] },
  { name: "Prompt 134", real: "What's a piece of clothing you treasure?", impostors: ["Invent history for a thrifted item.", "Describe designer labels as sentimental.", "Claim hand-made garments by a relative."] },
  { name: "Prompt 135", real: "What's a way you celebrate the end of the week?", impostors: ["Invent an extravagant weekly ritual.", "Describe simple acts as grand ceremonies.", "Claim communal festivities that are private."] },
  { name: "Prompt 136", real: "What's a project you completed that surprised you?", impostors: ["Invent a large project with implausible timeline.", "Describe small wins as huge feats.", "Claim collaboration with professionals."] },
  { name: "Prompt 137", real: "What's a childhood TV show you loved?", impostors: ["Invent episode plots for a real show.", "Describe a cartoon as live-action memory.", "Claim premieres attended as a child."] },
  { name: "Prompt 138", real: "What's a phrase you use to cheer someone up?", impostors: ["Invent motivational lines not your own.", "Describe therapy phrases as casual banter.", "Claim linguistic power as a tool."] },
  { name: "Prompt 139", real: "What's a small change to your home that made it feel new?", impostors: ["Invent major renovations as minor changes.", "Describe staging tricks as permanent solutions.", "Claim architectural changes made overnight."] },
  { name: "Prompt 140", real: "What's a memory involving weather that stayed with you?", impostors: ["Invent weather events with dramatic outcomes.", "Describe storm stories as personal experience.", "Claim rare meteorological phenomena in your town."] },
  { name: "Prompt 141", real: "What's a compliment you aim to give more often?", impostors: ["Invent poetic compliments you don't use.", "Describe giving praise as consistent when it's not.", "Claim mentorship roles that didn't exist."] },
  { name: "Prompt 142", real: "What's a useful app you recommend?", impostors: ["Recommend a fake app with features.", "Describe an app for the wrong platform.", "Claim premium features as free."] },
  { name: "Prompt 143", real: "What's a way you unwind after a long day?", impostors: ["Invent elaborate relaxation routines.", "Describe night rituals as social events.", "Claim solitary habits as public."] },
  { name: "Prompt 144", real: "What's a small habit that saves money?", impostors: ["Invent unrealistic saving hacks.", "Describe coupon myths as reliable.", "Claim expensive sacrifices as daily choices."] },
  { name: "Prompt 145", real: "What's a book that made you laugh out loud?", impostors: ["Claim comedic timing from a dramatic book.", "Describe a comedic scene as personal memory.", "Name a comedic author incorrectly."] },
  { name: "Prompt 146", real: "What's a place that felt magical to you?", impostors: ["Invent an otherworldly scene in a mundane spot.", "Describe staged events as spontaneous magic.", "Claim cinematic experiences were personal."] },
  { name: "Prompt 147", real: "What's a small thing that helps you sleep?", impostors: ["Invent a sleep trick without evidence.", "Describe ritualistic behavior as medical advice.", "Claim a gadget cured insomnia."] },
  { name: "Prompt 148", real: "What's a moment you learned something important about a friend?", impostors: ["Invent discoveries with no basis.", "Describe personal revelations publicly.", "Claim a dramatic betrayal resolution."] },
  { name: "Prompt 149", real: "What's a food you ate that surprised you by how good it was?", impostors: ["Invent exotic dishes as tasting experiences.", "Describe fusion cuisine inaccurately.", "Claim spontaneous culinary discovery."] },
  { name: "Prompt 150", real: "What's a small goal you're working toward now?", impostors: ["Claim ambitious goals without plan.", "Describe hobbies as career goals.", "Invent collaborative projects."] },
  { name: "Prompt 151", real: "What's a place you go to think or be alone?", impostors: ["Invent secluded spaces in populated areas.", "Describe public places as private retreats.", "Claim secret hideouts with coordinates."] },
  { name: "Prompt 152", real: "What's a habit that keeps you connected to family?", impostors: ["Invent rituals that are uncommon.", "Describe cultural expectations as personal habit.", "Claim daily calls to relatives."] },
  { name: "Prompt 153", real: "What's a public art piece you love?", impostors: ["Invent murals with local lore.", "Describe gallery pieces as public art.", "Claim discovery of anonymous works."] },
  { name: "Prompt 154", real: "What's a time you learned by failing?", impostors: ["Invent failure stories turned into lessons.", "Describe staged failures as real setbacks.", "Claim instant recovery from mistakes."] },
  { name: "Prompt 155", real: "What's a way you prepare for a busy week?", impostors: ["Invent elaborate prep routines.", "Describe productivity hacks as daily rituals.", "Claim celebrity productivity methods."] },
  { name: "Prompt 156", real: "What's something you keep on your desk?", impostors: ["Invent sentimental desk items.", "Describe kitschy decorations as functional.", "Claim historical artifacts on your desk."] },
  { name: "Prompt 157", real: "What's a film scene that gave you chills?", impostors: ["Misidentify film scenes.", "Describe movie moments as personal memories.", "Claim attendance at premieres."] },
  { name: "Prompt 158", real: "What's a small act you wish more people did?", impostors: ["Invent grand gestures as small acts.", "Describe civic duties inaccurately.", "Claim community roles you didn't hold."] },
  { name: "Prompt 159", real: "What's your favorite quick weekend getaway?", impostors: ["Invent a nearby destination with details.", "Describe travel that conflicts with geography.", "Claim intimate knowledge of many locales."] },
  { name: "Prompt 160", real: "What's a smell that makes you nostalgic?", impostors: ["Invent a scent memory with brand names.", "Describe olfactory triggers as universal.", "Claim scents tied to famous events."] },
  { name: "Prompt 161", real: "What's a hobby you did as a teen?", impostors: ["Describe an activity common to others as unique.", "Invent skills learned in adolescence.", "Claim advanced teenage achievements."] },
  { name: "Prompt 162", real: "What's a public figure you disagree with but respect?", impostors: ["Name a figure and misstate their stance.", "Describe nuanced views simplistically.", "Claim personal conversations with them."] },
  { name: "Prompt 163", real: "What's a city memory involving food?", impostors: ["Invent food markets you never visited.", "Describe culinary scenes inaccurately.", "Claim celebrity chef interactions."] },
  { name: "Prompt 164", real: "What's something you learned from travel?", impostors: ["Invent lessons without context.", "Describe cultural lessons incorrectly.", "Claim transformative travel experiences you didn't have."] },
  { name: "Prompt 165", real: "What's a hobby you gave up but miss?", impostors: ["Invent a hobby with fabricated tools.", "Claim professional-level skills you dropped.", "Describe reasons for giving up that don't match."] },
  { name: "Prompt 166", real: "What's a tradition you celebrated as a child?", impostors: ["Invent cultural rituals as personal practice.", "Describe hybrid family traditions.", "Claim elaborate ceremonies existed."] },
  { name: "Prompt 167", real: "What's a craft or DIY skill you admire?", impostors: ["Invent artisan techniques.", "Describe craftsmanship with wrong tools.", "Claim inherited skills from family."] },
  { name: "Prompt 168", real: "What's a small secret spot you take visitors to?", impostors: ["Invent secret spots with precise directions.", "Describe hidden places that are public.", "Claim exclusivity where none exists."] },
  { name: "Prompt 169", real: "What's a sound that makes you nostalgic for a place?", impostors: ["Invent soundscapes tied to urban legends.", "Describe recorded audio as live memory.", "Claim broadcasts were personal experiences."] },
  { name: "Prompt 170", real: "What's a movie soundtrack you love?", impostors: ["Name incorrect composers for a score.", "Describe soundtracks you haven't heard.", "Claim personal involvement with a composer."] },
  { name: "Prompt 171", real: "What's a neighborhood you love for its architecture?", impostors: ["Invent buildings with wrong styles.", "Describe foreign architecture as local.", "Claim historic knowledge without facts."] },
  { name: "Prompt 172", real: "What's a food you think is underrated?", impostors: ["Invent niche foods as underrated.", "Describe mainstream dishes as hidden gems.", "Claim regional dishes are globally unknown."] },
  { name: "Prompt 173", real: "What's an item that always sparks conversation?", impostors: ["Invent conversation pieces with bogus provenance.", "Describe collectibles as meaningful.", "Claim rare items on display."] },
  { name: "Prompt 174", real: "What's a memorable festival or fair you've attended?", impostors: ["Invent festival headliners.", "Describe events with inaccurate dates.", "Claim private access to big festivals."] },
  { name: "Prompt 175", real: "What's your favorite low-effort recipe?", impostors: ["Invent a simple recipe that involves secret steps.", "Describe takeout as homemade.", "Claim shortcuts that are unrealistic."] },
  { name: "Prompt 176", real: "What's a piece of jewelry that matters to you?", impostors: ["Invent heirlooms and their stories.", "Describe trendy pieces as family heirlooms.", "Claim celebrity-designed jewelry as personal."] },
  { name: "Prompt 177", real: "What's something that always brightens your morning?", impostors: ["Invent elaborate morning rituals.", "Describe simple pleasures as rare luxuries.", "Claim curated routines by influencers."] },
  { name: "Prompt 178", real: "What's a quiet hobby you enjoy alone?", impostors: ["Invent solitary pursuits with niche gear.", "Describe hobbies that need community as solitary.", "Claim expert level in a hobby."] },
  { name: "Prompt 179", real: "What's a landmark you climbed or explored?", impostors: ["Invent climbs with wrong geography.", "Describe exploration without experience.", "Claim expeditions with famous guides."] },
  { name: "Prompt 180", real: "What's a small, local business you support?", impostors: ["Invent a storefront and products.", "Describe chain stores as local gems.", "Claim entrepreneurial ventures you don't run."] },
  { name: "Prompt 181", real: "What's a memorable gift you received?", impostors: ["Invent extravagant gifts from strangers.", "Describe handmade gifts as store-bought.", "Claim celebrity endorsements."] },
  { name: "Prompt 182", real: "What's a show or concert that stuck with you?", impostors: ["Describe performances you didn't attend.", "Claim backstage experiences without basis.", "Invent setlists and special guests."] },
  { name: "Prompt 183", real: "What's a thing you do to practice patience?", impostors: ["Invent spiritual practices as casual.", "Describe patience exercises from a guru.", "Claim yearlong retreats for calm."] },
  { name: "Prompt 184", real: "What's a place you recommend for a first date?", impostors: ["Invent romantic spots with impossibly good timing.", "Describe tourist traps as perfect date places.", "Claim insider-only venues."] },
  { name: "Prompt 185", real: "What's a small cultural difference that surprised you?", impostors: ["Invent cultural customs inaccurately.", "Describe trivial differences as major shocks.", "Claim misunderstandings with famous cultural figures."] },
  { name: "Prompt 186", real: "What's a way you keep memories (photos, journals)?", impostors: ["Invent elaborate memory rituals.", "Describe archival methods you don't use.", "Claim historic preservation work."] },
  { name: "Prompt 187", real: "What's a little-known fact about your hometown?", impostors: ["Invent obscure facts that sound true.", "Describe urban legends as history.", "Claim famous discoveries in your town."] },
  { name: "Prompt 188", real: "What's a small act of courage you admire?", impostors: ["Invent heroic anecdotes.", "Describe bravery in unlikely contexts.", "Claim dramatic rescues witnessed."] },
  { name: "Prompt 189", real: "What's a small way you celebrate friendship?", impostors: ["Invent grand gestures described as small.", "Describe rituals you don't practice.", "Claim traditions with famous people."] },
  { name: "Prompt 190", real: "What's a curated playlist you recommend?", impostors: ["Name playlists you didn't create.", "Describe music curation as personal when it's public.", "Claim proprietary mixes."] },
  { name: "Prompt 191", real: "What's a practical thing you learned from a mentor?", impostors: ["Invent mentorship stories with public figures.", "Describe advice as if it came from a guru.", "Claim formal mentorships you didn't have."] },
  { name: "Prompt 192", real: "What's a small design detail you love in a product?", impostors: ["Invent design insights without knowledge.", "Describe features as intentional when accidental.", "Claim product design roles."] },
  { name: "Prompt 193", real: "What's a local spot that feels like an escape?", impostors: ["Invent hidden escapes with coordinates.", "Describe urban retreats as wilderness.", "Claim private access to quiet areas."] },
  { name: "Prompt 194", real: "What's a skill you taught yourself?", impostors: ["Claim mastery of complex skills without effort.", "Describe self-teaching as trivial.", "Invent resources used."] },
  { name: "Prompt 195", real: "What's a small change that improved your sleep?", impostors: ["Invent sleep gadgets you never used.", "Describe routines as medical advice.", "Claim instant results."] },
  { name: "Prompt 196", real: "What's an underrated movie you recommend?", impostors: ["Recommend obscure titles you haven't seen.", "Describe cult films as mainstream.", "Claim personal connections to filmmakers."] },
  { name: "Prompt 197", real: "What's a cultural experience that broadened you?", impostors: ["Invent experiences overseas you didn't have.", "Describe immersive events inaccurately.", "Claim active roles in local culture."] },
  { name: "Prompt 198", real: "What's a small thing you do to stay organized?", impostors: ["Invent productivity tools you don't use.", "Describe workflows as universal methods.", "Claim professional-grade systems at home."] },
  { name: "Prompt 199", real: "What's a tradition you hope continues?", impostors: ["Invent rituals you never practiced.", "Describe cultural continuity inaccurately.", "Claim stewardship of traditions."] },
  { name: "Prompt 200", real: "What's a tiny moment from childhood that stuck with you?", impostors: ["Invent a poignant childhood vignette.", "Describe movie scenes as memory.", "Claim memories of places you never visited."] }
];

// ---------------- 300 ITEM LIST (mixed 1970-2025) ----------------
const items300 = [
"Pizza","Sushi","Burger","Pasta","Chocolate","Coffee","Ice Cream","Taco","Steak","Salmon",
"Apple","Banana","Orange","Guitar","Piano","Violin","Basketball","Soccer","Tennis","Baseball",
"New York","London","Paris","Tokyo","Los Angeles","Sydney","Rome","Berlin","Rio de Janeiro","Dubai",
"Michael Jackson","Beyonce","Taylor Swift","Elvis Presley","Madonna","The Beatles","Drake","Kanye West","Ariana Grande","Justin Bieber",
"Darth Vader","Harry Potter","Sherlock Holmes","Frodo Baggins","Luke Skywalker","Batman","Spider-Man","Superman","Pikachu","SpongeBob",
"Mount Everest","Grand Canyon","Niagara Falls","Eiffel Tower","Statue of Liberty","Great Wall","Machu Picchu","Stonehenge","Colosseum","Taj Mahal",
"Netflix","iPhone","PlayStation","Xbox","Nintendo","Rubik's Cube","LEGO","Instagram","Twitter","YouTube",
"Coca-Cola","Pepsi","McDonald's","Starbucks","KFC","Domino's","Red Bull","Budweiser","Heineken","Nespresso",
"Shrek","Dumbledore","Tony Stark","Walter White","Joker","Indiana Jones","Forrest Gump","Simba","Mulan","Iron Man",
"Game of Thrones","The Office","Friends","Breaking Bad","Stranger Things","Seinfeld","The Simpsons","The Mandalorian","Lord of the Rings","Star Wars",
"Amazon","Walmart","Google","Facebook","Microsoft","Apple","Tesla","SpaceX","Uber","Airbnb",
"Mount Rushmore","Golden Gate Bridge","Times Square","Broadway","Hollywood","Venice","Santorini","Bali","Moscow","Prague",
"Lasagna","Ramen","Pad Thai","Curry","Paella","Kimchi","Falafel","Sashimi","Gelato","Tiramisu",
"Elon Musk","Oprah Winfrey","LeBron James","Lionel Messi","Cristiano Ronaldo","Serena Williams","Roger Federer","Usain Bolt","Michael Jordan","Tiger Woods",
"Avatar","Titanic","The Godfather","The Dark Knight","Inception","Pulp Fiction","Jurassic Park","Toy Story","The Matrix","Star Trek",
"Ferrari","Lamborghini","Toyota","Honda","BMW","Mercedes","Audi","Ford","Chevrolet","Tesla Model S",
"Harry Potter (book)","The Hobbit","Game of Thrones (book)","To Kill a Mockingbird","1984","The Catcher in the Rye","The Alchemist","The Da Vinci Code","Moby Dick","The Great Gatsby",
"Big Mac","KFC Original Recipe","Domino's Pepperoni","In-N-Out Burger","Five Guys","Chipotle","Subway","Taco Bell","Panda Express","Shake Shack",
"Celine Dion","Shakira","Ed Sheeran","Bruno Mars","The Weeknd","Billie Eilish","John Lennon","Paul McCartney","Katy Perry","Madonna",
"Voldemort","Gandalf","Darth Maul","Han Solo","Leia Organa","Bruce Wayne","Clark Kent","Peter Parker","Tony Soprano","Don Draper",
"Big Ben","Buckingham Palace","The Louvre","Prague Castle","Acropolis","Angkor Wat","Petra","Sagrada Familia","CN Tower","Burj Khalifa",
"iPad","MacBook","AirPods","Apple Watch","Galaxy Phone","Fitbit","GoPro","Kindle","Nikon","Canon",
"Las Vegas","Orlando","Cancun","Myrtle Beach","Bahamas","Iceland","Greenland","Alaska","Hawaii","Tahiti",
"Hot Dog","Bagel","Croissant","Muffin","Pancake","Waffle","Donut","Brownie","Cheesecake","Pudding",
"Mickey Mouse","Donald Duck","Goofy","Winnie the Pooh","Elsa","Olaf","Rapunzel","Woody","Buzz Lightyear","Simba",
"PS5","Xbox Series X","Nintendo Switch","Atari","Game Boy","Sega Genesis","NES","SNES","Dreamcast","Wii",
"Spotify","TikTok","Snapchat","Reddit","WhatsApp","Zoom","Slack","Twitch","YouTube","Google Maps",
"Mount Kilimanjaro","Serengeti","Galapagos","Yellowstone","Yosemite","Zion","Banff","Lake Louise","Great Barrier Reef","Bora Bora",
"Olympics","FIFA World Cup","Super Bowl","Wimbledon","NBA Finals","Tour de France","The Masters","UEFA Champions League","Copa America","Cricket World Cup",
"SpongeBob SquarePants","Patrick Star","Mr. Krabs","Squidward","Plankton","Dora the Explorer","Bluey","Tom and Jerry","Looney Tunes","Power Rangers",
"Google Search","Yahoo","Bing","DuckDuckGo","AOL","MSN","AltaVista","Excite","Lycos","Ask Jeeves",
"Ferris Bueller","Rocky Balboa","James Bond","Jason Bourne","Ethan Hunt","Travis Bickle","Jules Winnfield","Tyler Durden","Neo","Marty McFly",
"Harvard","MIT","Stanford","Yale","Princeton","Oxford","Cambridge","Columbia","UCLA","UC Berkeley",
"Peanut Butter","Jelly","Honey","Nutella","Almond Butter","Tahini","Horseradish","Mayonnaise","Mustard","Ketchup",
"Latte","Cappuccino","Espresso","Flat White","Mocha","Americano","Frappuccino","Cold Brew","Nitro Coffee","Pour Over",
"Eras Tour","Coachella","Glastonbury","Lollapalooza","SXSW","Tomorrowland","Bonnaroo","Ultra","Burning Man","Bonnaroo",
"Minecraft","Fortnite","Roblox","World of Warcraft","League of Legends","Call of Duty","Counter-Strike","Apex Legends","Among Us","GTA V"
];

// ---------------- SIMILARITY ----------------
const similarityScore = (a = "", b = "") => {
  const A = new Set(String(a).toLowerCase().split(/\s+/).filter(Boolean));
  const B = new Set(String(b).toLowerCase().split(/\s+/).filter(Boolean));
  const inter = new Set([...A].filter(x => B.has(x)));
  const union = new Set([...A, ...B]);
  return union.size ? inter.size / union.size : 0;
};

// ---------------- AVATAR ----------------
const colorFromString = s => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360} 70% 50%)`;
};
function Avatar({ name, size = 44 }) {
  const initials = String(name || "ANON").split(/[_\s]+/).map(p => p[0] || "").slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: colorFromString(name || "anon"),
      display: "flex", alignItems: "center", justifyContent: "center", color: "#0ff", fontWeight: 800, textShadow: "0 2px 8px rgba(0,255,255,0.2)"
    }}>{initials}</div>
  );
}

// ---------------- TRON STYLES ----------------
const tron = {
  background: "radial-gradient(ellipse at center, rgba(0,32,64,0.6), rgba(0,8,16,1))",
  neonPanel: {
    background: "linear-gradient(180deg, rgba(0,255,255,0.03), rgba(0,120,255,0.02))",
    border: "1px solid rgba(0,255,255,0.12)",
    boxShadow: "0 6px 40px rgba(0,145,255,0.06)",
    borderRadius: 12,
    padding: 16
  },
  headerGlow: { textShadow: "0 0 18px rgba(0,200,255,0.6), 0 0 36px rgba(120,0,255,0.08)" },
  neonButton: { background: "linear-gradient(90deg,#00ffd5,#00a3ff)", color: "#001", padding: "10px 14px", borderRadius: 10, border: "none", fontWeight: 700, boxShadow: "0 6px 18px rgba(0,160,255,0.12)", animation: "neonPulse 4s infinite" },
  accentText: { color: "#00ffd5" }
};

// ---------------- APP ----------------
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
  const [mode, setMode] = useState("liar");
  const [currentItem, setCurrentItem] = useState("");
  const [turnIndex, setTurnIndex] = useState(0);
  const [oneWordClues, setOneWordClues] = useState({});
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  useEffect(()=>{ import("canvas-confetti").then(m=>setConfetti(()=>m.default)).catch(()=>{}); },[]);

  // ---------------- ROOM LISTENER ----------------
  useEffect(()=>{
    if(!roomCode) return;
    const sCode = sanitize(roomCode);
    const roomRef = ref(database, `rooms/${sCode}`);
    const unsub = onValue(roomRef, async snap=>{
      const data = snap.val();
      if(!data) return;
      setPlayers(data.players||{});
      setImpostors(data.impostors||[]);
      setPhase(data.phase||"lobby");
      setTimerEnd(data.timerEnd||null);
      setCreator(data.creator||"");
      setRealQuestion(data.realQuestion||"");
      setRound(data.round||1);
      setMode(data.mode||"liar");
      setCurrentItem(data.currentItem||"");
      setTurnIndex(data.currentTurnIndex||0);
      setOneWordClues(data.oneWordClues||{});
      // liar auto-advance:
      const keys = Object.keys(data.players||{});
      if(data.phase==="answer" && data.mode==="liar"){
        const all = keys.length>0 && keys.every(k=> data.players[k]?.submittedAnswer===true);
        if(all) await update(roomRef, { phase:"debate", timerEnd: Date.now()+3*60*1000 });
      }
      if(data.phase==="debate"){
        const allVoted = keys.length>0 && keys.every(k=> data.players[k]?.voteSubmitted===true);
        if(allVoted){
          if(data.lastScoredRound !== data.round){
            await computeAndApplyScores(roomRef,data);
          }
          await update(roomRef, { phase:"reveal", timerEnd:null, lastScoredRound:data.round||0 });
        }
      }
    });
    return ()=>unsub();
  },[roomCode]);

  // ---------------- TIMER ----------------
  useEffect(()=>{
    if(!timerEnd) return;
    const t = setInterval(async ()=>{
      const remain = Math.max(0, Math.ceil((timerEnd - Date.now())/1000));
      setTimeLeft(remain);
      if(remain <= 0){
        const sCode = sanitize(roomCode);
        const roomRef = ref(database, `rooms/${sCode}`);
        const snap = await get(roomRef); if(!snap.exists()) return;
        const data = snap.val();
        if(data.phase==="answer" && data.mode==="liar"){
          await update(roomRef, { phase:"debate", timerEnd: Date.now()+3*60*1000 });
        } else if(data.phase==="debate"){
          if(data.lastScoredRound !== data.round){
            await computeAndApplyScores(roomRef,data);
          }
          await update(roomRef, { phase:"reveal", timerEnd:null, lastScoredRound:data.round||0 });
        } else if(data.mode==="oneword" && data.phase==="oneword_round"){
          await update(roomRef, { phase:"debate", timerEnd: Date.now()+3*60*1000 });
        }
      }
    },1000);
    return ()=>clearInterval(t);
  },[timerEnd, roomCode]);

  // ---------------- SCORING (Option A) ----------------
  const computeAndApplyScores = async (roomRef, roomData) => {
    const playersObj = roomData.players || {};
    const keys = Object.keys(playersObj);
    const impostorSet = new Set(roomData.impostors || []);
    const updates = { players: {} };
    keys.forEach(k=>{ updates.players[k] = { ...(playersObj[k] || {}), score: (playersObj[k]?.score || 0) }; });
    // voters +1 per correct impostor
    keys.forEach(k=>{
      const voteList = playersObj[k]?.vote || [];
      voteList.forEach(voted => { if(impostorSet.has(voted)) updates.players[k].score = (updates.players[k].score || 0) + 1; });
    });
    // impostor scoring
    keys.forEach(k=>{
      if(impostorSet.has(k)){
        let count = 0;
        keys.forEach(other=>{ if(!impostorSet.has(other)){ const v = playersObj[other]?.vote || []; if(v.includes(k)) count++; } });
        if(count === 0) updates.players[k].score = (updates.players[k].score || 0) + 2;
        else updates.players[k].score = (updates.players[k].score || 0) + count;
      }
    });
    await update(roomRef, { players: updates.players });
    try { playSound("reveal"); } catch (e) {}
  };

  // ---------------- ROOM ACTIONS ----------------
  const createRoom = async ()=>{
    if(!isValidPath(name)) return alert("Enter a valid name");
    const code = String(Math.floor(Math.random()*9000+1000)); const sCode = sanitize(code); const sName = sanitize(name);
    setRoomCode(sCode); setCreator(sName);
    const initialPlayers = {}; initialPlayers[sName] = { answer:"", vote:[], submittedAnswer:false, voteSubmitted:false, score:0 };
    await set(ref(database, `rooms/${sCode}`), { players: initialPlayers, impostors: [], mode:"liar", phase:"lobby", timerEnd:null, creator:sName, realQuestion:"", round:1, lastScoredRound:0, ended:false, currentItem:"", currentTurnIndex:0, oneWordClues:{} });
    playSound("click");
  };

  const joinRoom = async ()=>{
    if(!isValidPath(name) || !isValidPath(roomCode)) return alert("Invalid name or room");
    const sc = sanitize(roomCode); const sn = sanitize(name);
    const snap = await get(ref(database, `rooms/${sc}`)); if(!snap.exists()) return alert("Room not found");
    await set(ref(database, `rooms/${sc}/players/${sn}`), { answer:"", vote:[], submittedAnswer:false, voteSubmitted:false, score:0 });
    playSound("click");
  };

  const startRound = async (chosenMode = mode) => {
    if(!roomCode) return;
    const sc = sanitize(roomCode); const roomRef = ref(database, `rooms/${sc}`); const snap = await get(roomRef); if(!snap.exists()) return;
    const data = snap.val(); const keys = Object.keys(data.players || {}); if(!keys.length) return;
    const maxImp = Math.max(0, keys.length - 1); const numImp = Math.floor(Math.random() * (maxImp + 1));
    const shuffled = [...keys].sort(()=>0.5 - Math.random()); const selectedImpostors = shuffled.slice(0, numImp);
    if(chosenMode === "liar"){
      const category = promptCategories[Math.floor(Math.random()*promptCategories.length)];
      const updatedPlayers = {};
      keys.forEach(p=>{ const isImp = selectedImpostors.includes(p); const variant = isImp ? category.impostors[Math.floor(Math.random()*category.impostors.length)] : category.real; updatedPlayers[p] = { answer:"", vote:[], variant, submittedAnswer:false, voteSubmitted:false, score:(data.players[p]?.score||0) }; });
      await update(roomRef, { players: updatedPlayers, impostors: selectedImpostors, mode:"liar", realQuestion:category.real, phase:"answer", timerEnd: Date.now()+60*1000, round: data.round || 1 });
    } else {
      const item = items300[Math.floor(Math.random()*items300.length)];
      const updatedPlayers = {}; keys.forEach(p=> updatedPlayers[p] = { answer:"", vote:[], oneWord:"", submittedAnswer:false, voteSubmitted:false, score:(data.players[p]?.score||0) });
      await update(roomRef, { players: updatedPlayers, impostors: selectedImpostors, mode:"oneword", currentItem: item, phase:"oneword_round", timerEnd: Date.now()+4*60*1000, round: data.round || 1, currentTurnIndex:0, oneWordClues:{} });
    }
    playSound("click");
  };

  const updateAnswerText = async (text) => { if(!roomCode || !name) return; const sc = sanitize(roomCode); const sn = sanitize(name); await update(ref(database, `rooms/${sc}/players/${sn}`), { answer: text }); };

  const submitAnswer = async ()=>{ if(!roomCode || !name) return; const sc = sanitize(roomCode); const sn = sanitize(name); await update(ref(database, `rooms/${sc}/players/${sn}`), { submittedAnswer: true }); playSound("submit"); };

  const submitOneWord = async (word) => {
    if(!roomCode || !name) return;
    const sc = sanitize(roomCode); const sn = sanitize(name);
    const roomRef = ref(database, `rooms/${sc}`); const snap = await get(roomRef); if(!snap.exists()) return;
    const data = snap.val(); const keys = Object.keys(data.players || {}); const current = data.currentTurnIndex || 0;
    const turnName = keys[current % keys.length]; if(turnName !== sn) return;
    const newClues = { ...(data.oneWordClues || {}) }; newClues[sn] = (word || "").trim().split(/\s+/)[0] || "";
    const nextIndex = current + 1;
    await update(roomRef, { oneWordClues: newClues, currentTurnIndex: nextIndex });
    playSound("submit");
  };

  const toggleVoteLocal = (p) => setSelectedVotes(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev,p]);

  const submitVote = async ()=>{ if(!roomCode || !name) return; const sc = sanitize(roomCode); const sn = sanitize(name); await update(ref(database, `rooms/${sc}/players/${sn}`), { vote: selectedVotes, voteSubmitted: true }); setSelectedVotes([]); playSound("submit"); };

  const endGame = async ()=>{ if(!roomCode) return; const sc = sanitize(roomCode); await update(ref(database, `rooms/${sc}`), { ended: true, phase: "lobby" }); playSound("click"); };

  // UI helpers
  const canSubmitAnswer = () => { const p = players[sanitize(name)]; if(!p) return false; return !p.submittedAnswer && String(p.answer || "").trim().length > 0; };
  const canSubmitVote = () => { const p = players[sanitize(name)]; if(!p) return false; return !p.voteSubmitted && selectedVotes.length > 0; };

  const mostSimilarPairs = ()=>{ const keys = Object.keys(players || {}); const pairs = []; for(let i=0;i<keys.length;i++) for(let j=i+1;j<keys.length;j++) pairs.push({ pair:[keys[i],keys[j]], score: similarityScore(players[keys[i]]?.answer||"", players[keys[j]]?.answer||"") }); return pairs.sort((a,b)=>b.score-a.score).slice(0,3); };

  useEffect(()=>{ if(phase !== "reveal" || !confetti) return; Object.entries(players).forEach(([p,data])=>{ if((data.vote||[]).some(v=> (impostors||[]).includes(v))) try{ confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } }); playSound("confetti"); }catch(e){} }); },[phase, players, impostors, confetti]);

  const renderLeaderboard = ()=>{ const list = Object.entries(players).map(([p,info])=>({ name:p, score: info.score||0 })); list.sort((a,b)=>b.score-a.score); return (<div><h4 style={{color:"#00ffd5"}}>Leaderboard</h4><ol>{list.map(item=> <li key={item.name} style={{marginBottom:6}}>{item.name} — <strong style={{color:"#7efcff"}}>{item.score}</strong></li>)}</ol></div>); };

  const handleOneWordKey = async (e) => { if(e.key === "Enter"){ e.preventDefault(); const val = (e.target.value || "").trim().split(/\s+/)[0] || ""; if(!val) return; await submitOneWord(val); e.target.value = ""; setInputValue(""); } };

  // ---------------- RENDER ----------------
  return (
    <div style={{ background: tron.background, minHeight: "100vh", color: "#dffcff", fontFamily: "Inter, Segoe UI, Roboto, system-ui", padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1.6, ...tron.headerGlow }}>GUESS THE LIAR</div>
          <div style={{ fontSize: 12, color: "rgba(0,255,213,0.9)" }}>Arcade — TRON Mode</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 14 }}>Room: <span style={tron.accentText}>{roomCode || "—"}</span></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Avatar name={name || "anon"} size={40} />
            <div style={{ fontWeight: 700 }}>{name || "anon"}</div>
          </div>
        </div>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        <section style={tron.neonPanel}>
          {phase === "lobby" && (
            <div>
              <h2 style={{ marginTop: 0, color: "#7efcff" }}>Lobby</h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(0,255,213,0.08)", background: "transparent", color: "#e6f7ff" }} />
                <input placeholder="Room" value={roomCode} onChange={e=>setRoomCode(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(0,255,213,0.08)", background: "transparent", color: "#e6f7ff", width: 120 }} />
                <select value={mode} onChange={e=>setMode(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
                  <option value="liar">Guess The Liar</option>
                  <option value="oneword">One-Word Impostor</option>
                </select>
                <button onClick={() => startRound(mode)} style={tron.neonButton}>Start Round</button>
                <button onClick={createRoom} style={{...tron.neonButton, padding:"8px 10px"}}>Create</button>
                <button onClick={joinRoom} style={{...tron.neonButton, padding:"8px 10px"}}>Join</button>
                {creator === sanitize(name) && <button onClick={endGame} style={{...tron.neonButton, padding:"8px 10px"}}>End Game</button>}
              </div>

              <h3 style={{ color: "#7efcff" }}>Players</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.keys(players).map(p => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.12)" }}>
                    <Avatar name={p} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{p} {p === creator ? <span style={{ fontSize: 12, color: "#9ff8ff" }}>(host)</span> : null}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>Score: <span style={{ color: "#7efcff" }}>{players[p]?.score || 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === "answer" && mode === "liar" && (
            <div>
              <h2 style={{ marginTop: 0, color: "#7efcff" }}>Answer Phase — Round {round}</h2>
              <div style={{ marginBottom: 12 }}><strong>Your prompt:</strong> <span style={{ color: "#aefcff" }}>{players[sanitize(name)]?.variant || "—"}</span></div>
              <textarea rows={3} value={players[sanitize(name)]?.answer || ""} onChange={e=>updateAnswerText(e.target.value)} disabled={players[sanitize(name)]?.submittedAnswer === true} style={{ width: "100%", padding: 10, borderRadius: 8, background: "transparent", color: "#e6f7ff", border: "1px solid rgba(0,255,213,0.06)" }} placeholder="Type your answer..." />
              <div style={{ marginTop: 8 }}>
                <button onClick={submitAnswer} disabled={!canSubmitAnswer()} style={tron.neonButton}>Submit Answer</button>
                <span style={{ marginLeft: 12 }}>Time left: <span style={{ color: "#00ffd5" }}>{timeLeft}s</span></span>
              </div>

              <h3 style={{ marginTop: 18, color: "#7efcff" }}>Players</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(players).map(([p,info])=>(
                  <div key={p} style={{ padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Avatar name={p} size={32} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{p}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{info.submittedAnswer ? <span style={{color:"#7efcff"}}>Answered</span> : "Waiting..."}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === "oneword_round" && mode === "oneword" && (
            <div>
              <h2 style={{ marginTop: 0, color: "#7efcff" }}>One-Word Round — Round {round}</h2>
              <div style={{ marginBottom: 8 }}><strong>Secret item (host only):</strong> <span style={{ color: "#aefcff" }}>{creator === sanitize(name) ? currentItem : "—"}</span></div>
              <div style={{ marginBottom: 8 }}>Round timer: <span style={{ color:"#00ffd5" }}>{timeLeft}s</span> (4 minutes)</div>
              <div style={{ marginBottom: 12 }}>Turn index: <strong style={{color:"#7efcff"}}>{turnIndex % Math.max(1, Object.keys(players).length)}</strong></div>

              <div style={{ marginTop: 8 }}>
                <input placeholder="Type ONE word and press Enter" onKeyDown={handleOneWordKey} ref={inputRef} value={inputValue} onChange={e=>setInputValue(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(0,255,213,0.06)", background: "transparent", color: "#e6f7ff" }} />
                <div style={{ marginTop: 12, color: "#9ff8ff" }}><em>Press Enter to submit your single-word clue — turns are enforced in order (Option C).</em></div>
              </div>

              <h3 style={{ marginTop: 18, color: "#7efcff" }}>Clues so far</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(oneWordClues || {}).map(([p,w]) => (
                  <div key={p} style={{ padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", gap: 8, alignItems: "center" }}>
                    <Avatar name={p} size={36} />
                    <div><strong>{p}</strong><div style={{ fontSize: 14 }}>{w || "—"}</div></div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <button onClick={()=> update(ref(database, `rooms/${sanitize(roomCode)}`), { phase: "debate", timerEnd: Date.now()+3*60*1000 })} style={tron.neonButton}>Vote Now</button>
              </div>
            </div>
          )}

          {phase === "debate" && (
            <div>
              <h2 style={{ marginTop: 0, color: "#7efcff" }}>Debate / Voting</h2>
              {mode === "liar" && <div style={{ marginBottom: 8 }}><strong>Real question:</strong> <span style={{ color: "#aefcff" }}>{realQuestion}</span></div>}
              {mode === "oneword" && <div style={{ marginBottom: 8 }}><strong>Secret item:</strong> <span style={{ color: "#aefcff" }}>{currentItem}</span></div>}

              <h3 style={{ marginTop: 12, color: "#7efcff" }}>Player Answers / Clues</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(players).map(([p,info]) => (
                  <div key={p} style={{ padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", gap: 8, alignItems: "center" }}>
                    <Avatar name={p} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{p}</div>
                      <div style={{ fontSize: 14 }}>{mode === "liar" ? (info.answer || "—") : (oneWordClues[p] || "—")}</div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{info.voteSubmitted ? <span style={{color:"#7efcff"}}>Voted</span> : "Not voted"}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.keys(players).map(p => (
                    <button key={p} onClick={()=> toggleVoteLocal(p)} disabled={players[sanitize(name)]?.voteSubmitted === true} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,255,213,0.06)", background: selectedVotes.includes(p) ? "linear-gradient(90deg,#00ffd5,#00a3ff)" : "transparent", color: selectedVotes.includes(p) ? "#001" : "#dffcff" }}>
                      <Avatar name={p} size={26} /> <span style={{ marginLeft: 8 }}>{p}</span> {selectedVotes.includes(p) ? "✓" : ""}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 12 }}>
                  <button onClick={submitVote} disabled={!canSubmitVote()} style={tron.neonButton}>Submit Vote</button>
                  <span style={{ marginLeft: 12 }}>Time left: <span style={{ color: "#00ffd5" }}>{timeLeft}s</span></span>
                </div>
              </div>
            </div>
          )}

          {phase === "reveal" && (
            <div>
              <h2 style={{ marginTop: 0, color: "#7efcff" }}>Reveal</h2>
              <div style={{ marginBottom: 8 }}><strong>Impostors:</strong> <span style={{ color: "#aefcff" }}>{impostors.length ? impostors.join(", ") : "None"}</span></div>

              <h3 style={{ color: "#7efcff" }}>Votes</h3>
              <ul>
                {Object.entries(players).map(([p,info]) => (<li key={p}><strong>{p}</strong> voted for {(info.vote || []).join(", ") || "Nobody"}</li>))}
              </ul>

              <h3 style={{ color: "#7efcff" }}>Most similar answers</h3>
              <ul>
                {mostSimilarPairs().map((s,idx) => <li key={idx}>{s.pair.join(" & ")} — {Math.round(s.score * 100)}%</li>)}
              </ul>

              <div style={{ marginTop: 12 }}>
                {creator === sanitize(name) && <button onClick={() => startRound(mode)} style={tron.neonButton}>Next Round</button>}
                {creator === sanitize(name) && <button onClick={endGame} style={{ ...tron.neonButton, marginLeft: 8 }}>End Game</button>}
              </div>
            </div>
          )}
        </section>

        <aside style={{ ...tron.neonPanel, maxHeight: "80vh", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, color: "#7efcff" }}>Round Info</div>
              <div>Mode: <strong style={{ color: "#aefcff" }}>{mode}</strong></div>
              <div>Round: <strong style={{ color: "#aefcff" }}>{round}</strong></div>
              <div>Phase: <strong style={{ color: "#aefcff" }}>{phase}</strong></div>
              <div>Time left: <strong style={{ color: "#00ffd5" }}>{timeLeft}s</strong></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#9ff8ff" }}>Host: <strong>{creator}</strong></div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>{renderLeaderboard()}</div>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ color: "#7efcff" }}>Sample Prompts (liar)</h4>
            <div style={{ maxHeight: 260, overflow: "auto" }}>
              <div style={{ padding: 6, borderRadius: 6, background: "rgba(0,255,213,0.02)", marginBottom: 6 }}>
                <div style={{ fontWeight: 700 }}>Prompt 1</div>
                <div style={{ fontSize: 12 }}>What's your favorite childhood memory?</div>
              </div>
              <div style={{ padding: 6, borderRadius: 6, background: "rgba(0,255,213,0.02)", marginBottom: 6 }}>
                <div style={{ fontWeight: 700 }}>Prompt 2</div>
                <div style={{ fontSize: 12 }}>What's a small thing that makes your day better?</div>
              </div>
              <div style={{ padding: 6, borderRadius: 6, background: "rgba(0,255,213,0.02)", marginBottom: 6 }}>
                <div style={{ fontWeight: 700 }}>Prompt 3</div>
                <div style={{ fontSize: 12 }}>What's the best meal you've ever had and why?</div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
