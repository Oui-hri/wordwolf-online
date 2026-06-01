// Firebase本体を読み込む
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

// Realtime Databaseを読み込む
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Firebaseの設定情報
const firebaseConfig = {
  apiKey: "AIzaSyA62vbFFsLqV4B2u6vYDqDPxJeqyPB09SM",
  authDomain: "wordwolf-online.firebaseapp.com",
  databaseURL: "https://wordwolf-online-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "wordwolf-online",
  storageBucket: "wordwolf-online.firebasestorage.app",
  messagingSenderId: "681380603333",
  appId: "1:681380603333:web:a3f0c833cd7bc19b7117ac"
};

// Firebaseに接続
const app = initializeApp(firebaseConfig);

// Realtime Databaseに接続
const database = getDatabase(app);

// 他のJSファイルでも使えるようにする
export { database };

console.log("Firebase接続OK");
