import { database } from "./firebase.js";

import {
  assignRoles
} from "./game.js";

import {
  ref,
  set,
  get,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

console.log("room.js 読み込みOK");

// HTMLの要素を取得
const createRoomButton = document.getElementById("create-room-button");
const joinRoomButton = document.getElementById("join-room-button");
const roomCode = document.getElementById("room-code");
const playerList = document.getElementById("player-list");
const startGameButton = document.getElementById("start-game-button");
const topicCard = document.querySelector("#topic-screen .card");

// 今操作している人の情報を一時的に覚えるための変数
let currentRoomName = "";
let currentPlayerId = "";
let currentIsHost = false;

// ルーム作成ボタンが押されたときの処理
createRoomButton.addEventListener("click", () => {
  createRoom();
});

// ルーム参加ボタンが押されたときの処理
joinRoomButton.addEventListener("click", () => {
  joinRoom();
});

// ゲーム開始ボタンが押されたときの処理
startGameButton.addEventListener("click", () => {
  startGame();
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

  currentRoomName = roomName;
  currentPlayerId = playerId;
  currentIsHost = true;

  const roomRef = ref(database, "rooms/" + roomName);

  get(roomRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        alert("このルーム名はすでに使われています");
        return;
      }

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

      return set(roomRef, roomData);
    })
    .then(() => {
      console.log("ルーム作成OK");

      alert("ルームを作成しました");

      showWaitingRoom(roomName);
      listenPlayers(roomName);
      listenRoomStatus(roomName);
    })
    .catch((error) => {
      console.error("ルーム作成エラー", error);
      alert("ルーム作成に失敗しました");
    });
}

// ルーム参加処理
function joinRoom() {
  const inputRoomName = prompt("参加するルーム名を入力してください");
  const playerName = prompt("あなたの名前を入力してください");

  if (!inputRoomName || !playerName) {
    alert("ルーム名と名前を入力してください");
    return;
  }

  const roomName = inputRoomName.trim();
  const playerId = crypto.randomUUID();

  currentRoomName = roomName;
  currentPlayerId = playerId;
  currentIsHost = false;

  const roomRef = ref(database, "rooms/" + roomName);
  const playerRef = ref(database, "rooms/" + roomName + "/players/" + playerId);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        alert("そのルームは存在しません");
        return;
      }

      const playerData = {
        name: playerName,
        isHost: false
      };

      return set(playerRef, playerData);
    })
    .then(() => {
      console.log("ルーム参加OK");

      alert("ルームに参加しました");

      showWaitingRoom(roomName);
      listenPlayers(roomName);
      listenRoomStatus(roomName);
    })
    .catch((error) => {
      console.error("ルーム参加エラー", error);
      alert("ルーム参加に失敗しました");
    });
}

// 待機部屋画面を表示する処理
function showWaitingRoom(roomName) {
  const titleScreen = document.getElementById("title-screen");
  const waitingScreen = document.getElementById("waiting-screen");

  titleScreen.classList.add("hidden");
  waitingScreen.classList.remove("hidden");

  roomCode.textContent = roomName;
  updateStartGameButton();
}

// ホストだけゲーム開始ボタンを押せるようにする処理
function updateStartGameButton() {
  if (!startGameButton) {
    return;
  }

  if (currentIsHost) {
    startGameButton.style.display = "block";
    startGameButton.disabled = false;
  } else {
    startGameButton.style.display = "none";
    startGameButton.disabled = true;
  }
}

// ゲーム開始処理
function startGame() {
  if (!currentIsHost) {
    alert("ゲームを開始できるのはホストだけです");
    return;
  }

  if (!currentRoomName) {
    alert("ルーム情報が見つかりません");
    return;
  }

  const roomRef = ref(database, "rooms/" + currentRoomName);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        throw new Error("ルーム情報が見つかりません");
      }

      const roomData = snapshot.val();
      const playersData = roomData.players;

      if (!playersData) {
        throw new Error("参加者がいません");
      }

      const players = Object.keys(playersData).map((playerId) => {
        return {
          uid: playerId,
          name: playersData[playerId].name,
          isHost: playersData[playerId].isHost
        };
      });

      if (players.length < 3) {
        throw new Error("ゲーム開始には3人以上必要です");
      }

      const assignedData = assignRoles(players, "random");

      const updates = {};

      assignedData.players.forEach((player) => {
        updates["players/" + player.uid + "/role"] = player.role;
        updates["players/" + player.uid + "/topic"] = player.topic;
      });

      updates["game/category"] = assignedData.category;
      updates["status"] = "discussion";

      return update(roomRef, updates);
    })
    .then(() => {
      console.log("ゲーム開始OK");
      alert("ゲームを開始しました");
    })
    .catch((error) => {
      console.error("ゲーム開始エラー", error);
      alert(error.message || "ゲーム開始に失敗しました");
    });
}

// ルームの状態をリアルタイムで監視する処理
function listenRoomStatus(roomName) {
  const statusRef = ref(database, "rooms/" + roomName + "/status");

  onValue(statusRef, (snapshot) => {
    const status = snapshot.val();

    console.log("現在のステータス:", status);

    if (status === "discussion") {
      showTopicScreen();
    }
  });
}

// 話し合い画面を表示する処理
function showDiscussionScreen() {
  const waitingScreen = document.getElementById("waiting-screen");
  const discussionScreen = document.getElementById("discussion-screen");

  waitingScreen.classList.add("hidden");
  discussionScreen.classList.remove("hidden");
}

// お題確認画面を表示する処理
function showTopicScreen() {
  const waitingScreen = document.getElementById("waiting-screen");
  const topicScreen = document.getElementById("topic-screen");

  waitingScreen.classList.add("hidden");
  topicScreen.classList.remove("hidden");

  const playerRef = ref(
    database,
    "rooms/" + currentRoomName + "/players/" + currentPlayerId
  );

  get(playerRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        alert("プレイヤー情報が見つかりません");
        return;
      }

      const playerData = snapshot.val();

      if (topicCard) {
        topicCard.textContent = playerData.topic;
      }
    })
    .catch((error) => {
      console.error("お題取得エラー", error);
      alert("お題の取得に失敗しました");
    });
}

// 参加者一覧をリアルタイムで表示する処理
function listenPlayers(roomName) {
  const playersRef = ref(database, "rooms/" + roomName + "/players");

  onValue(playersRef, (snapshot) => {
    const players = snapshot.val();

    playerList.innerHTML = "";

    if (!players) {
      return;
    }

    Object.keys(players).forEach((playerId) => {
      const player = players[playerId];

      const li = document.createElement("li");

      if (player.isHost) {
        li.textContent = player.name + "（ホスト）";
      } else {
        li.textContent = player.name;
      }

      playerList.appendChild(li);
    });
  });
}
