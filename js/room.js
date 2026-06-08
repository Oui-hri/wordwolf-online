// =========================
// room.js
// ワードウルフ ルーム処理
// =========================

import { database } from "./firebase.js";

import * as game from "./game.js";
import * as vote from "./vote.js";

import {
  ref,
  set,
  get,
  onValue,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

console.log("room.js 読み込みOK");

// =========================
// HTML要素取得
// =========================

const createRoomButton = document.getElementById("create-room-button");
const joinRoomButton = document.getElementById("join-room-button");
const roomCode = document.getElementById("room-code");
const playerList = document.getElementById("player-list");
const startGameButton = document.getElementById("start-game-button");
const topicCard = document.getElementById("player-word");
const voteList = document.getElementById("vote-list");
const voteButton = document.getElementById("vote-button");
const answerButton = document.getElementById("answer-button");
const answerArea = document.getElementById("answer-area");
const restartButton = document.getElementById("restart-button");
const quitGameButton = document.getElementById("quit-game-button");

// =========================
// 状態管理
// =========================

let currentRoomName = "";
let currentPlayerId = "";
let currentIsHost = false;

let selectedVoteTargetId = "";
let hasVoted = false;

let topicCountdownTimer = null;
let discussionTimer = null;

let isVoteCounted = false;
let lastStatus = "";

// =========================
// イベント登録
// =========================

createRoomButton.addEventListener("click", () => {
  createRoom();
});

joinRoomButton.addEventListener("click", () => {
  joinRoom();
});

startGameButton.addEventListener("click", () => {
  startGame();
});

if (voteButton) {
  voteButton.addEventListener("click", () => {
    submitVote();
  });
}

if (answerButton) {
  answerButton.addEventListener("click", () => {
    showAnswerArea();
  });
}

if (restartButton) {
  restartButton.addEventListener("click", () => {
    restartGame();
  });
}

if (quitGameButton) {
  quitGameButton.addEventListener("click", () => {
    quitGame();
  });
}

restoreSession();

// ========================
// セッション保存
// =========================

function saveSession() {
  sessionStorage.setItem("wordwolfRoomName", currentRoomName);
  sessionStorage.setItem("wordwolfPlayerId", currentPlayerId);
  sessionStorage.setItem("wordwolfIsHost", String(currentIsHost));
}

function clearSession() {
  sessionStorage.removeItem("wordwolfRoomName");
  sessionStorage.removeItem("wordwolfPlayerId");
  sessionStorage.removeItem("wordwolfIsHost");
}

function restoreSession() {
  const savedRoomName = sessionStorage.getItem("wordwolfRoomName");
  const savedPlayerId = sessionStorage.getItem("wordwolfPlayerId");
  const savedIsHost = sessionStorage.getItem("wordwolfIsHost");

  if (!savedRoomName || !savedPlayerId) {
    return;
  }

  currentRoomName = savedRoomName;
  currentPlayerId = savedPlayerId;
  currentIsHost = savedIsHost === "true";

  const playerRef = ref(
    database,
    "rooms/" + currentRoomName + "/players/" + currentPlayerId
  );

  get(playerRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        clearSession();
        return;
      }

      listenPlayers(currentRoomName);
      listenRoomStatus(currentRoomName);
      updateStartGameButton();
    })
    .catch((error) => {
      console.error("復帰エラー", error);
      clearSession();
    });
}

// =========================
// ルーム作成
// =========================

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

  resetLocalState();

  const roomRef = ref(database, "rooms/" + roomName);

  get(roomRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        throw new Error("このルーム名はすでに使われています");
      }

      const roomData = {
        roomName: roomName,
        hostId: playerId,
        status: "waiting",
        voteRound: 1,
        discussionTime: 120,
        revoteCandidates: null,
        votes: null,
        voteResult: null,
        result: null,
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
      saveSession();
      alert("ルームを作成しました");

      showWaitingRoom(roomName);
      listenPlayers(roomName);
      listenRoomStatus(roomName);
    })
    .catch((error) => {
      console.error("ルーム作成エラー", error);
      alert(error.message || "ルーム作成に失敗しました");
    });
}

// =========================
// ルーム参加
// =========================

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

  resetLocalState();

  const roomRef = ref(database, "rooms/" + roomName);
  const playerRef = ref(
    database,
    "rooms/" + roomName + "/players/" + playerId
  );

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        throw new Error("そのルームは存在しません");
      }

      const roomData = snapshot.val();
      const players = roomData.players || {};

      const isDuplicateName = Object.values(players).some((player) => {
        return player.name === playerName;
      });

      if (isDuplicateName) {
        throw new Error("この名前はすでに使われています");
      }

      return set(playerRef, {
        name: playerName,
        isHost: false
      });
    })
    .then(() => {
      saveSession();
      alert("ルームに参加しました");

      showWaitingRoom(roomName);
      listenPlayers(roomName);
      listenRoomStatus(roomName);
    })
    .catch((error) => {
      console.error("ルーム参加エラー", error);
      alert(error.message || "ルーム参加に失敗しました");
    });
}

// =========================
// ローカル状態リセット
// =========================

function resetLocalState() {
  selectedVoteTargetId = "";
  hasVoted = false;
  isVoteCounted = false;
  lastStatus = "";
}

// =========================
// 待機画面
// =========================

function showWaitingRoom(roomName) {
  hideAllScreens();

  const waitingScreen = document.getElementById("waiting-screen");
  waitingScreen.classList.remove("hidden");

  roomCode.textContent = roomName;
  updateStartGameButton();
}

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

// =========================
// ゲーム開始
// =========================

function startGame() {
  if (!currentIsHost) {
    alert("ゲームを開始できるのはホストだけです");
    return;
  }

  const roomRef = ref(database, "rooms/" + currentRoomName);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        throw new Error("ルーム情報が見つかりません");
      }

      const roomData = snapshot.val();
      const playersData = roomData.players || {};

      const players = Object.keys(playersData).map((playerId) => {
        return {
          uid: playerId,
          id: playerId,
          name: playersData[playerId].name,
          isHost: playersData[playerId].isHost
        };
      });

      if (players.length < 3) {
        throw new Error("ゲーム開始には3人以上必要です");
      }

      const startResult = game.startGame(players, "random");

      const updates = {};

      startResult.players.forEach((player) => {
        const playerId = player.uid || player.id;

        updates["players/" + playerId + "/role"] = player.role;
        updates["players/" + playerId + "/topic"] = player.topic;
      });

      updates["game/category"] = startResult.category;
      updates["game/citizenTopic"] = startResult.citizenTopic;
      updates["game/wolfTopic"] = startResult.wolfTopic;

      updates["status"] = "topic";
      updates["voteRound"] = 1;
      updates["discussionTime"] = 120;
      updates["revoteCandidates"] = null;
      updates["votes"] = null;
      updates["voteResult"] = null;
      updates["result"] = null;

      return update(roomRef, updates);
    })
    .then(() => {
      setTimeout(() => {
        if (!currentIsHost) {
          return;
        }

        const roomRef = ref(database, "rooms/" + currentRoomName);

        update(roomRef, {
          status: "discussion",
          discussionTime: 120
        });
      }, 10000);
    })
    .catch((error) => {
      console.error("ゲーム開始エラー", error);
      alert(error.message || "ゲーム開始に失敗しました");
    });
}

// =========================
// ステータス監視
// =========================

function listenRoomStatus(roomName) {
  const statusRef = ref(database, "rooms/" + roomName + "/status");

  onValue(statusRef, (snapshot) => {
    const status = snapshot.val();

    if (!status) {
      return;
    }

    if (status === lastStatus) {
      return;
    }

    lastStatus = status;

    if (status === "waiting") {
      showWaitingRoom(roomName);
    }

    if (status === "topic") {
      showTopicScreen();
    }

    if (status === "discussion") {
      showDiscussionScreen();
    }

    if (status === "voting") {
      showVoteScreen();
    }

    if (status === "result") {
      showResultScreen();
    }
  });
}

// =========================
// お題画面
// =========================

function showTopicScreen() {
  hideAllScreens();

  const topicScreen = document.getElementById("topic-screen");
  const countdownElement = document.getElementById("countdown");

  topicScreen.classList.remove("hidden");

  if (topicCountdownTimer) {
    clearInterval(topicCountdownTimer);
  }

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

      startTopicCountdown(countdownElement);
    })
    .catch((error) => {
      console.error("お題取得エラー", error);
      alert("お題の取得に失敗しました");
    });
}

function startTopicCountdown(countdownElement) {
  let countdown = 10;

  if (countdownElement) {
    countdownElement.textContent = countdown;
  }

  topicCountdownTimer = setInterval(() => {
    countdown--;

    if (countdownElement) {
      countdownElement.textContent = countdown;
    }

    if (countdown <= 0) {
      clearInterval(topicCountdownTimer);
      topicCountdownTimer = null;
    }
  }, 1000);
}

// =========================
// 話し合い画面
// =========================

function showDiscussionScreen() {
  hideAllScreens();

  const discussionScreen = document.getElementById("discussion-screen");
  const timerElement = document.getElementById("discussion-timer");

  discussionScreen.classList.remove("hidden");

  if (topicCountdownTimer) {
    clearInterval(topicCountdownTimer);
    topicCountdownTimer = null;
  }

  if (discussionTimer) {
    clearInterval(discussionTimer);
  }

  getDiscussionTime()
    .then((discussionTime) => {
      const totalTime = discussionTime || 120;

      const circle = document.getElementById("progress-ring");

      let circumference = 0;

      if (circle) {
        const radius = 150;
        circumference = 2 * Math.PI * radius;

        circle.setAttribute("stroke-dasharray", circumference);
        circle.setAttribute("stroke-dashoffset", 0);
      }

      discussionTimer = game.startDiscussionTimer(
        totalTime,
        (time) => {
          const minutes = String(Math.floor(time / 60)).padStart(2, "0");
          const seconds = String(time % 60).padStart(2, "0");

          if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds}`;
          }

          if (circle) {
            const offset = circumference * (1 - time / totalTime);
            circle.setAttribute("stroke-dashoffset", offset);
          }
        },
        () => {
          if (currentIsHost) {
            changeStatusToVoting();
          }
        }
      );
    });
}

function getDiscussionTime() {
  const discussionTimeRef = ref(
    database,
    "rooms/" + currentRoomName + "/discussionTime"
  );

  return get(discussionTimeRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return 120;
      }

      return snapshot.val() || 120;
    })
    .catch(() => {
      return 120;
    });
}

function changeStatusToVoting() {
  const roomRef = ref(database, "rooms/" + currentRoomName);

  update(roomRef, {
    status: "voting",
    votes: null,
    voteResult: null
  });
}

// =========================
// 投票画面
// =========================

function showVoteScreen() {
  hideAllScreens();

  const voteScreen = document.getElementById("vote-screen");
  voteScreen.classList.remove("hidden");

  if (discussionTimer) {
    clearInterval(discussionTimer);
    discussionTimer = null;
  }

  selectedVoteTargetId = "";
  hasVoted = false;
  isVoteCounted = false;

  if (voteButton) {
    voteButton.disabled = false;
    voteButton.style.display = "none";
    voteButton.textContent = "投票する";
  }

  renderVoteList();

  if (currentIsHost) {
    listenVotes();
  }
}

function renderVoteList() {
  if (!voteList) {
    return;
  }

  voteList.innerHTML = "";

  const roomRef = ref(database, "rooms/" + currentRoomName);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const roomData = snapshot.val();
      const players = roomData.players || {};
      const revoteCandidates = roomData.revoteCandidates || null;

      Object.keys(players).forEach((playerId) => {
        if (playerId === currentPlayerId) {
          return;
        }

        if (!isVoteCandidate(playerId, revoteCandidates)) {
          return;
        }

        const player = players[playerId];

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("vote-player-button");
        button.dataset.playerId = playerId;

        button.innerHTML = `
          <div class="player-left">
            <div class="player-icon">👤</div>
            <div class="player-name">${player.name}</div>
          </div>
          <div class="check">✓</div>
        `;

        button.addEventListener("click", () => {
          selectVoteTarget(playerId);
        });

        voteList.appendChild(button);
      });
    })
    .catch((error) => {
      console.error("投票候補取得エラー", error);
    });
}

function isVoteCandidate(playerId, revoteCandidates) {
  if (!revoteCandidates) {
    return true;
  }

  if (Array.isArray(revoteCandidates)) {
    return revoteCandidates.includes(playerId);
  }

  return revoteCandidates[playerId] === true;
}

function selectVoteTarget(targetPlayerId) {
  if (hasVoted) {
    return;
  }

  selectedVoteTargetId = targetPlayerId;

  const buttons = document.querySelectorAll(".vote-player-button");

  buttons.forEach((button) => {
    if (button.dataset.playerId === targetPlayerId) {
      button.classList.add("selected");
      button.style.opacity = "1";
      button.style.border = "3px solid #ffcc00";
      button.style.transform = "scale(1.05)";
    } else {
      button.classList.remove("selected");
      button.style.opacity = "0.35";
      button.style.border = "none";
      button.style.transform = "scale(1)";
    }
  });

  if (voteButton) {
    voteButton.style.display = "block";
  }
}

function submitVote() {
  if (hasVoted) {
    return;
  }

  if (!selectedVoteTargetId) {
    alert("投票する相手を選んでください");
    return;
  }

  const voteRef = ref(
    database,
    "rooms/" + currentRoomName + "/votes/" + currentPlayerId
  );

  set(voteRef, selectedVoteTargetId)
    .then(() => {
      hasVoted = true;
      showVoteWaiting();
    })
    .catch((error) => {
      console.error("投票保存エラー", error);
      alert("投票に失敗しました");
    });
}

function showVoteWaiting() {
  if (voteList) {
    voteList.innerHTML = "";

    const message = document.createElement("p");
    message.textContent = "投票しました。他の人の投票を待っています...";
    voteList.appendChild(message);
  }

  if (voteButton) {
    voteButton.disabled = true;
    voteButton.style.display = "none";
  }
}

// =========================
// 投票監視・集計
// =========================

function listenVotes() {
  const votesRef = ref(
    database,
    "rooms/" + currentRoomName + "/votes"
  );

  onValue(votesRef, (snapshot) => {
    if (isVoteCounted) {
      return;
    }

    const votes = snapshot.val();

    if (!votes) {
      return;
    }

    checkAllVotesSubmitted(votes);
  });
}

function checkAllVotesSubmitted(votes) {
  const roomRef = ref(database, "rooms/" + currentRoomName);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const roomData = snapshot.val();
      const players = roomData.players || {};
      const voteRound = roomData.voteRound || 1;

      const voterCount = Object.keys(players).length;
      const voteCount = Object.keys(votes).length;

      if (voteCount === voterCount) {
        isVoteCounted = true;
        handleVoteFinished(players, votes, voteRound);
      }
    })
    .catch((error) => {
      console.error("投票完了確認エラー", error);
    });
}

function handleVoteFinished(players, votes, voteRound) {
  const roomRef = ref(database, "rooms/" + currentRoomName);

  const voteResult = vote.judgeVoteResult(votes);

  // 同票の場合
  if (voteResult.isTie) {
    // 初回投票: voteRound 1
    // 再投票1回目: voteRound 2
    // 再投票2回目: voteRound 3
    if (voteRound >= 3) {
      update(roomRef, {
        status: "result",
        result: {
          winner: "wolf",
          message: "再投票を2回しても同票のためワードウルフ勝利",
          reason: "tieLimit",
          voteResult: voteResult
        },
        voteResult: voteResult
      });

      return;
    }

    const revoteCandidates = convertCandidatesToObject(
      voteResult.topVotedPlayerIds
    );

    update(roomRef, {
      status: "discussion",
      voteResult: voteResult,
      voteRound: voteRound + 1,
      revoteCandidates: revoteCandidates,
      discussionTime: 60,
      votes: null
    });

    return;
  }

  // 最多票の人
  const eliminatedPlayerId = voteResult.eliminatedPlayerId;

  const playersArray = Object.keys(players).map((playerId) => {
    return {
      uid: playerId,
      id: playerId,
      ...players[playerId]
    };
  });

  const eliminatedPlayer = game.getEliminatedPlayer(
    playersArray,
    eliminatedPlayerId
  );

  const resultData = game.createResultData(
    playersArray,
    eliminatedPlayer
  );

  update(roomRef, {
    status: "result",
    result: resultData,
    voteResult: voteResult
  });
}

function convertCandidatesToObject(candidates) {
  const candidateObject = {};

  candidates.forEach((playerId) => {
    candidateObject[playerId] = true;
  });

  return candidateObject;
}

// =========================
// 結果画面
// =========================

function showResultScreen() {
  hideAllScreens();

  const resultScreen = document.getElementById("result-screen");
  const resultContent = document.getElementById("result-content");

  resultScreen.classList.remove("hidden");

  const resultRef = ref(
    database,
    "rooms/" + currentRoomName + "/result"
  );

  get(resultRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const resultData = snapshot.val();

      if (!resultContent) {
        return;
      }

      resultContent.innerHTML = "";

      const eliminatedName =
        resultData.eliminatedPlayerName ||
        resultData.eliminatedName ||
        "不明";

      if (resultData.winner === "citizen") {

        resultContent.innerHTML = `
    <h2 class="result-title citizen-win">
      👑 市民チームの勝利
    </h2>

    <p class="result-message">
      市民たちはワードウルフを見抜いた
    </p>
  `;

      } else {

        resultContent.innerHTML = `
  <h2 class="result-title wolf-win">

    <img
    src="images/ookam_red.png"
    class="result-icon"
    alt="wolf"
  >

  <h2 class="result-banner">
    <span></span>
    WOLF WIN
    <span></span>
  </h2>

  <h2 class="result-title wolf-win">
    ワードウルフの勝利
  </h2>

  <p class="result-message">
    ワードウルフは正体を隠し通した
  </p>

  <div class="vote-result-card">

    <div class="vote-result-title">

      <span></span>

      投票結果

      <span></span>

    </div>

    <div id="vote-result-list"></div>

  </div>
`;

        renderVoteResult();
      }
    })
    .catch((error) => {
      console.error("結果表示エラー", error);
    });
}

function renderVoteResult() {

  const roomRef = ref(
    database,
    "rooms/" + currentRoomName
  );

  get(roomRef)
    .then((snapshot) => {

      if (!snapshot.exists()) {
        return;
      }

      const roomData = snapshot.val();

      const players = roomData.players || {};
      const votes = roomData.votes || {};

      const voteResultList =
        document.getElementById(
          "vote-result-list"
        );

      if (!voteResultList) {
        return;
      }

      voteResultList.innerHTML = "";

      const voteCounts = {};

      Object.values(votes).forEach(
        (targetPlayerId) => {

          voteCounts[targetPlayerId] =
            (voteCounts[targetPlayerId] || 0) + 1;
        }
      );

      const sortedPlayers =
        Object.keys(players)
          .map((playerId) => {

            return {
              playerId,
              name: players[playerId].name,
              votes: voteCounts[playerId] || 0
            };
          })
          .sort((a, b) => b.votes - a.votes);

      sortedPlayers.forEach(
        (player) => {

          voteResultList.innerHTML += `
      <div class="vote-row">
        <span>
          👤 ${player.name}
        </span>

        <span>
          ${player.votes}票
        </span>
      </div>
    `;
        }
      );

    })
    .catch((error) => {

      console.error(
        "投票結果表示エラー",
        error
      );
    });
}

function showAnswerArea() {
  const gameRef = ref(
    database,
    "rooms/" + currentRoomName + "/game"
  );

  get(gameRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        alert("お題情報が見つかりません");
        return;
      }

      const gameData = snapshot.val();

      answerArea.innerHTML = `
        <h3>お題</h3>
        <p>市民のお題：${gameData.citizenTopic || "不明"}</p>
        <p>ワードウルフのお題：${gameData.wolfTopic || "不明"}</p>
      `;

      answerArea.classList.remove("hidden");
    })
    .catch((error) => {
      console.error("お題表示エラー", error);
      alert("お題の表示に失敗しました");
    });
}

// =========================
// もう一度遊ぶ
// =========================

function restartGame() {
  if (!currentIsHost) {
    alert("もう一度遊ぶを押せるのはホストだけです");
    return;
  }

  const roomRef = ref(database, "rooms/" + currentRoomName);

  update(roomRef, {
    status: "waiting",
    voteRound: 1,
    votes: null,
    voteResult: null,
    result: null,
    revoteCandidates: null,
    discussionTime: 120
  })
    .then(() => {
      resetLocalState();

      if (answerArea) {
        answerArea.classList.add("hidden");
      }
    })
    .catch((error) => {
      console.error("再スタートエラー", error);
      alert("もう一度遊ぶ準備に失敗しました");
    });
}

// =========================
// ゲーム退出
// =========================

function quitGame() {
  if (!currentRoomName || !currentPlayerId) {
    clearSession();
    location.reload();
    return;
  }

  const playerRef = ref(
    database,
    "rooms/" + currentRoomName + "/players/" + currentPlayerId
  );

  remove(playerRef)
    .then(() => {
      clearSession();

      currentRoomName = "";
      currentPlayerId = "";
      currentIsHost = false;

      location.reload();
    })
    .catch((error) => {
      console.error("退出エラー", error);
      alert("退出に失敗しました");
    });
}

// =========================
// 参加者一覧
// =========================

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

// =========================
// 画面非表示共通処理
// =========================

function hideAllScreens() {
  const screens = [
    "title-screen",
    "waiting-screen",
    "topic-screen",
    "discussion-screen",
    "vote-screen",
    "result-screen"
  ];

  screens.forEach((screenId) => {
    const screen = document.getElementById(screenId);

    if (screen) {
      screen.classList.add("hidden");
    }
  });
}
