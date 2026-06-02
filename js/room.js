import { database } from "./firebase.js";

import {
  ref,
  set
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

console.log("room.js 読み込みOK");

// HTMLの要素を取得
const createRoomButton = document.getElementById("create-room-button");
const roomCode = document.getElementById("room-code");
const playerList = document.getElementById("player-list");

// ルーム作成ボタンが押されたときの処理
createRoomButton.addEventListener("click", () => {
  createRoom();
});

// ルーム作成処理
function createRoom() {
  const inputRoomName = prompt("ルーム名を入力してください");
  const playerName = prompt("あなたの名前を入力してください");

  if (!inputRoomName || !playerName) {
    alert("ルーム名と名前を入力してください");
    return;
  }

  const roomName = inputRoomName.trim();
  const playerId = crypto.randomUUID();

  const roomData = {
    roomName: roomName,
    hostId: playerId,
    status: "waiting",
    players: {
      [playerId]: {
        name: playerName,
        isHost: true
      }
    }
  };

  set(ref(database, "rooms/" + roomName), roomData)
    .then(() => {
      console.log("ルーム作成OK");
      console.log(roomData);

      alert("ルームを作成しました");

      showWaitingRoom(roomName, playerName);
    })
    .catch((error) => {
      console.error("ルーム作成エラー", error);
      alert("ルーム作成に失敗しました");
    });
}

// 待機部屋画面を表示する処理
function showWaitingRoom(roomName, playerName) {
  const titleScreen = document.getElementById("title-screen");
  const waitingScreen = document.getElementById("waiting-screen");

  titleScreen.classList.add("hidden");
  waitingScreen.classList.remove("hidden");

  roomCode.textContent = roomName;

  playerList.innerHTML = "";

  const li = document.createElement("li");
  li.textContent = playerName + "（ホスト）";
  playerList.appendChild(li);
}
