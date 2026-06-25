import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeV77Dr1Kyeh0PPfkEXkhW42T1zmb9acs",
  authDomain: "allen-7d647.firebaseapp.com",
  projectId: "allen-7d647",
  storageBucket: "allen-7d647.firebasestorage.app",
  messagingSenderId: "19202987630",
  appId: "1:19202987630:web:5c7550b44c65d4fae8387f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
