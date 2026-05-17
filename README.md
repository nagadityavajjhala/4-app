# 4 — Your Private Family Hub

A minimalistic, end-to-end encrypted messaging app for your inner circle. Built with React + Firebase, deployable to GitHub Pages.

---

## ✨ Features

- **🔐 Encrypted Chats** — X25519 + XSalsa20-Poly1305 E2E encryption (TweetNaCl). Only you and your recipient can read messages.
- **📞 Calls** — Audio & video calling via WebRTC (peer-to-peer, signaled through Firebase).
- **💫 Status** — 24-hour disappearing status updates in an Instagram Stories-style horizontal bar.
- **🎬 Shorts** — Curated YouTube Shorts viewer built in.
- **🎵 Music** — YouTube-powered music player with curated playlists.
- **📰 News** — Clean, minimal news feed via GNews API.
- **👤 Unique IDs** — Each user gets a permanent, auto-generated username (e.g. `swift.moon.4721`) stored in Firebase. Chats and data persist forever.

---

## 🛠 Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Auth | Firebase Auth (Email/Password) |
| Database | Firestore (messages, profiles, statuses) |
| Realtime | Firebase Realtime DB (online presence) |
| Calls | WebRTC + Firebase signaling |
| Encryption | TweetNaCl (libsodium bindings) |
| Hosting | GitHub Pages |

---

## 🚀 Setup Guide

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/4-app.git
cd 4-app
npm install
```

### 2. Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `4-app` → continue
3. **Disable** Google Analytics (optional) → Create project

#### Enable Firebase services:
- **Authentication**: Build → Authentication → Get started → Email/Password → Enable
- **Firestore**: Build → Firestore Database → Create database → Start in **production mode** → choose region
- **Realtime Database**: Build → Realtime Database → Create database → Start in **locked mode**
- **Storage** (optional for future avatar uploads): Build → Storage → Get started

#### Get your config:
1. Project settings (⚙️ gear icon) → General → Your apps → Add app → Web (`</>`)
2. Register app as `4-app` → Copy the `firebaseConfig` object

### 3. Add Firebase Config

Edit `src/lib/firebase.js` — replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
}
```

### 4. Deploy Security Rules

Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init
```

Select: Firestore, Realtime Database → use existing project → use `firestore.rules` and `database.rules.json` as defaults.

```bash
firebase deploy --only firestore:rules,database
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 6. Deploy to GitHub Pages

1. In `package.json`, update the deploy script with your repo URL.
2. In `vite.config.js`, if your repo is `github.com/you/4-app`, set `base: '/4-app/'` (or keep `'./'` for custom domain).

```bash
npm run deploy
```

This builds the app and pushes to the `gh-pages` branch. Enable GitHub Pages in your repo settings to serve from that branch.

### 7. (Optional) Add News API

Get a free key at [https://gnews.io](https://gnews.io) and paste it into `src/pages/NewsPage.jsx`:

```js
const GNEWS_API_KEY = 'your_key_here'
```

---

## 👥 Inviting Family & Friends

1. Share your GitHub Pages URL with them (e.g. `https://you.github.io/4-app`)
2. They create an account with their email + password
3. To chat: they tap the **+** in Chats, enter YOUR email to start a conversation

Each person gets a permanent unique username like `calm.river.8823` auto-assigned. Their messages, chats, and keys are tied to their account forever.

---

## 🔑 How Encryption Works

```
Alice's browser          Firebase          Bob's browser
     |                      |                   |
     |  Bob's public key ───▶|───────────────────▶ (stored in profile)
     |                      |                   |
     |── encrypt(msg, Bob's pubkey) ──▶ Firestore ──▶ decrypt(msg, Alice's pubkey)
     |                      |                   |
     |  Only Bob can decrypt. Firebase sees only ciphertext.
```

- Each user generates an X25519 keypair on first load (stored in `localStorage`)
- Public key is uploaded to their Firestore profile
- Messages are encrypted client-side before upload
- Firebase never sees plaintext
- Key is permanent across sessions (localStorage persists)

---

## 🎨 Customization

| File | What to change |
|---|---|
| `src/pages/MusicPage.jsx` | Add your own YouTube playlists & tracks |
| `src/pages/ReelsPage.jsx` | Change the Shorts IDs |
| `src/pages/NewsPage.jsx` | API key, categories |
| `src/index.css` | Colors, fonts |
| `tailwind.config.js` | Design tokens |

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── firebase.js      # Firebase init
│   ├── crypto.js        # E2E encryption (TweetNaCl)
│   └── store.js         # Zustand global state
├── pages/
│   ├── AuthPage.jsx     # Sign in / Sign up
│   ├── MainApp.jsx      # App shell + tab router
│   ├── ChatsPage.jsx    # Chat list + individual chat
│   ├── ReelsPage.jsx    # YouTube Shorts viewer
│   ├── MusicPage.jsx    # Music player
│   └── NewsPage.jsx     # News feed
├── components/
│   ├── ui/              # Avatar, TabBar, LoadingScreen
│   ├── status/          # StatusBar (stories)
│   ├── calling/         # WebRTC call overlay
│   └── music/           # MiniPlayer
└── index.css            # Global styles
```

---

## 🔒 Privacy Notes

- This app is only as private as your Firebase project's access rules.
- With the included `firestore.rules`, only authenticated users can read anything.
- For maximum privacy, do NOT enable Firebase Google Analytics.
- Calls are WebRTC peer-to-peer (your ISP can see the connection, not Firebase).
- Consider setting up your own TURN server for calls behind strict NAT.

---

*Built with ♥ for the ones who matter most.*
