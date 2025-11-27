# Guess The Liar

This is a ready-to-deploy React app for a private multi-player party game called **Guess The Liar**.
Players join a private room (room code), one or more players are randomly assigned as impostors (they get a different prompt),
and the family can play anonymously.

## What I included
- React + Vite project
- Firebase Firestore-backed realtime rooms
- Firebase Anonymous Authentication (no sign up required)
- Host controls (start round, set mode)
- Sample prompts and guess-mode items
- Starter Firestore security rules (see `firebase.rules`)

## How to deploy (recommended: Vercel)
1. Create a Firebase project: https://console.firebase.google.com/
   - In **Authentication** -> **Sign-in method** enable **Anonymous** sign-in.
   - In **Firestore Database**, create a database (Start in test mode while developing).
2. Copy your Firebase config object and paste it into `src/App.jsx` replacing the `firebaseConfig` placeholder.
3. Push this folder to a GitHub repo.
4. Go to https://vercel.com/new and import the GitHub repo. Vercel will auto-detect the React app (Vite).
5. After deployment, share the generated URL with your family.

## Security notes
The repo includes `firebase.rules` as a starter set. These allow only authenticated users to access `/rooms`.
You should improve/lock these rules if you make the site public. See `SECURITY.md` for suggestions.

