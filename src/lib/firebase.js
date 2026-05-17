// ============================================================
// FIREBASE CONFIGURATION
// Replace these values with your own Firebase project config.
// Go to: https://console.firebase.google.com
//   → Create a project → Add a web app → Copy config below
// ============================================================

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBm2Kb0ViOzHMEdu1aHpqmfh1XAK8kPwBU",
  authDomain: "app-89062.firebaseapp.com",
  databaseURL: "https://app-89062-default-rtdb.firebaseio.com",
  projectId: "app-89062",
  storageBucket: "app-89062.firebasestorage.app",
  messagingSenderId: "681098406464",
  appId: "1:681098406464:web:df8b592681d6a9a1ebcda5",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const rtdb = getDatabase(app)
export const storage = getStorage(app)

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch(() => {})

export default app
