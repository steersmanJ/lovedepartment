import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD6YZHC8ON9-SyRnKXXL4KZQbAiT1aY8u4",
  authDomain: "lovedepartment-81dbc.firebaseapp.com",
  projectId: "lovedepartment-81dbc",
  storageBucket: "lovedepartment-81dbc.firebasestorage.app",
  messagingSenderId: "1096053904502",
  appId: "1:1096053904502:web:6681cb3779523ea00a3b57",
  measurementId: "G-THDLLTQ5D9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
