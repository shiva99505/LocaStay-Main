import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase Applet Configuration loaded dynamically or statically
const firebaseConfig = {
  projectId: "gen-lang-client-0724128799",
  appId: "1:227178202171:web:074b0ef5f69804ce81081e",
  apiKey: "AIzaSyDPxOIEmfrxOYEEVz2wiap9TKcSLd7wmPI",
  authDomain: "gen-lang-client-0724128799.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-dc4361c6-a3dd-4b3b-b684-c00b18a16d29",
  storageBucket: "gen-lang-client-0724128799.firebasestorage.app",
  messagingSenderId: "227178202171",
  measurementId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firebase is running in offline-fallback or network has issues:", error.message);
    } else {
      console.log("Firebase connection response:", error);
    }
  }
}

testConnection();
