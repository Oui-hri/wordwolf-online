// =========================
// room.js
// ワードウルフ ルーム処理
// =========================

import { database } from "./firebase.js";

import * as game from "./game.js";
import * as vote from "./vote.js";
import { assignHints } from "./hints.js";

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
const categoryArea = document.getElementById("category-area");
const categorySelect = document.getElementById("category-select");
const topicCard = document.getElementById("player-word");
const voteList = document.getElementById("vote-list");
const voteButton = document.getElementById("vote-button");
const answerButton = document.getElementById("answer-button");
const answerArea = document.getElementById("answer-area");
const restartButton = document.getElementById("restart-button");
const quitGameButton = document.getElementById("quit-game-button");
const addTimeButton = document.getElementById("add-time-button");
const goVoteButton = document.getElementById("go-vote-button");
const discussionTopic = document.getElementById("discussion-topic");

const hintButton = document.getElementById("hint-button");
const hintModal = document.getElementById("hint-modal");
const hintText = document.getElementById("hint-text");
const hintCloseButton = document.getElementById("hint-close-button");

const createRoomScreen =
  document.getElementById("create-room-screen");

const joinRoomScreen =
  document.getElementById("join-room-screen");

const createRoomNameInput =
  document.getElementById("create-room-name-input");

const createPlayerNameInput =
  document.getElementById("create-player-name-input");

const joinRoomNameInput =
  document.getElementById("join-room-name-input");

const joinPlayerNameInput =
  document.getElementById("join-player-name-input");

const createRoomSubmitButton =
  document.getElementById("create-room-submit-button");

const joinRoomSubmitButton =
  document.getElementById("join-room-submit-button");

const createRoomBackButton =
  document.getElementById("create-room-back-button");

const joinRoomBackButton =
  document.getElementById("join-room-back-button");

const createRoomError =
  document.getElementById("create-room-error");

const joinRoomError =
  document.getElementById("join-room-error");

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
let lastDiscussionTime = null;

let isVoteCounted = false;
let lastStatus = "";

// =========================
// イベント登録
// =========================

if (createRoomButton) {
  createRoomButton.addEventListener(
    "click",
    showCreateRoomScreen
  );
}

if (joinRoomButton) {
  joinRoomButton.addEventListener(
    "click",
    showJoinRoomScreen
  );
}

if (createRoomSubmitButton) {
  createRoomSubmitButton.addEventListener(
    "click",
    createRoom
  );
}

if (joinRoomSubmitButton) {
  joinRoomSubmitButton.addEventListener(
    "click",
    joinRoom
  );
}

if (createRoomBackButton) {
  createRoomBackButton.addEventListener(
    "click",
    showTitleScreen
  );
}

if (joinRoomBackButton) {
  joinRoomBackButton.addEventListener(
    "click",
    showTitleScreen
  );
}

if (startGameButton) {
  startGameButton.addEventListener(
    "click",
    startGame
  );
}

if (voteButton) {
  voteButton.addEventListener(
    "click",
    submitVote
  );
}

if (answerButton) {
  answerButton.addEventListener(
    "click",
    showAnswerArea
  );
}

if (restartButton) {
  restartButton.addEventListener(
    "click",
    restartGame
  );
}

if (quitGameButton) {
  quitGameButton.addEventListener(
    "click",
    quitGame
  );
}

if (addTimeButton) {
  addTimeButton.addEventListener(
    "click",
    addOneMinute
  );
}

if (goVoteButton) {
  goVoteButton.addEventListener("click", () => {
    if (!currentIsHost) {
      alert("投票に移れるのはホストだけです");
      return;
    }

    changeStatusToVoting();
  });
}

if (hintButton) {
  hintButton.addEventListener(
    "click",
    showHintModal
  );
}

if (hintCloseButton) {
  hintCloseButton.addEventListener(
    "click",
    closeHintModal
  );
}

restoreSession();

// =========================
// 共通UI補助
// =========================

function setHidden(element, shouldHide) {
  if (!element) {
    return;
  }

  if (shouldHide) {
    element.classList.add("hidden");
  } else {
    element.classList.remove("hidden");
  }
}

function showTitleScreen() {
  hideAllScreens();

  const titleScreen =
    document.getElementById("title-screen");

  setHidden(titleScreen, false);
}

function showCreateRoomScreen() {
  hideAllScreens();

  if (createRoomError) {
    createRoomError.textContent = "";
  }

  if (createRoomNameInput) {
    createRoomNameInput.value = "";
  }

  if (createPlayerNameInput) {
    createPlayerNameInput.value = "";
  }

  setHidden(createRoomScreen, false);
}

function showJoinRoomScreen() {
  hideAllScreens();

  if (joinRoomError) {
    joinRoomError.textContent = "";
  }

  if (joinRoomNameInput) {
    joinRoomNameInput.value = "";
  }

  if (joinPlayerNameInput) {
    joinPlayerNameInput.value = "";
  }

  setHidden(joinRoomScreen, false);
}
function watchMyPlayerStatus() {
  if (!currentRoomName || !currentPlayerId) {
    return;
  }

  const myPlayerRef = ref(
    database,
    "rooms/" +
    currentRoomName +
    "/players/" +
    currentPlayerId
  );

  onValue(myPlayerRef, (snapshot) => {
    if (snapshot.exists()) {
      return;
    }

    alert("ホストにより退出させられました");

    clearSession();

    currentRoomName = "";
    currentPlayerId = "";
    currentIsHost = false;

    location.reload();
  });
}
// =========================
// セッション
// =========================

function saveSession() {
  sessionStorage.setItem(
    "wordwolfRoomName",
    currentRoomName
  );

  sessionStorage.setItem(
    "wordwolfPlayerId",
    currentPlayerId
  );

  sessionStorage.setItem(
    "wordwolfIsHost",
    String(currentIsHost)
  );
}

function clearSession() {
  sessionStorage.removeItem("wordwolfRoomName");
  sessionStorage.removeItem("wordwolfPlayerId");
  sessionStorage.removeItem("wordwolfIsHost");
}

function restoreSession() {
  const savedRoomName =
    sessionStorage.getItem("wordwolfRoomName");

  const savedPlayerId =
    sessionStorage.getItem("wordwolfPlayerId");

  const savedIsHost =
    sessionStorage.getItem("wordwolfIsHost");

  if (!savedRoomName || !savedPlayerId) {
    return;
  }

  currentRoomName = savedRoomName;
  currentPlayerId = savedPlayerId;
  currentIsHost = savedIsHost === "true";

  const playerRef = ref(
    database,
    "rooms/" +
    currentRoomName +
    "/players/" +
    currentPlayerId
  );

  get(playerRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        clearSession();
        return;
      }

      listenPlayers(currentRoomName);
      listenRoomStatus(currentRoomName);
      watchMyPlayerStatus();
      updateStartGameButton();
    })
    .catch((error) => {
      console.error("復帰エラー", error);
      clearSession();
    });
}

// =========================
// 共通リセット
// =========================

function resetLocalState() {
  selectedVoteTargetId = "";
  hasVoted = false;
  isVoteCounted = false;
  lastStatus = "";
  lastDiscussionTime = null;
}

// =========================
// ルーム作成
// =========================

function createRoom() {
  const inputRoomName =
    createRoomNameInput
      ? createRoomNameInput.value
      : "";

  const playerName =
    createPlayerNameInput
      ? createPlayerNameInput.value
      : "";

  if (!inputRoomName || !playerName) {
    if (createRoomError) {
      createRoomError.textContent =
        "ルーム名と名前を入力してください";
    }

    return;
  }

  const roomName = inputRoomName.trim();
  const playerId = crypto.randomUUID();

  currentRoomName = roomName;
  currentPlayerId = playerId;
  currentIsHost = true;

  resetLocalState();

  const roomRef =
    ref(database, "rooms/" + roomName);

  get(roomRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        throw new Error(
          "このルーム名はすでに使われています"
        );
      }

      return set(roomRef, {
        roomName,
        hostId: playerId,
        status: "waiting",
        voteRound: 1,
        discussionTime: 120,
        revoteCandidates: null,
        tiePlayers: null,
        votes: null,
        voteResult: null,
        result: null,
        game: null,
        players: {
          [playerId]: {
            name: playerName,
            isHost: true
          }
        }
      });
    })
    .then(() => {
      saveSession();

      showWaitingRoom(roomName);
      listenPlayers(roomName);
      listenRoomStatus(roomName);
      watchMyPlayerStatus();
    })

    .catch((error) => {
      console.error("ルーム作成エラー", error);

      if (createRoomError) {
        createRoomError.textContent =
          error.message ||
          "ルーム作成に失敗しました";
      }
    });
}

// =========================
// ルーム参加
// =========================

function joinRoom() {
  const inputRoomName =
    joinRoomNameInput
      ? joinRoomNameInput.value
      : "";

  const playerName =
    joinPlayerNameInput
      ? joinPlayerNameInput.value
      : "";

  if (!inputRoomName || !playerName) {
    if (joinRoomError) {
      joinRoomError.textContent =
        "ルーム名と名前を入力してください";
    }

    return;
  }

  const roomName = inputRoomName.trim();
  const playerId = crypto.randomUUID();

  currentRoomName = roomName;
  currentPlayerId = playerId;
  currentIsHost = false;

  resetLocalState();

  const roomRef =
    ref(database, "rooms/" + roomName);

  const playerRef = ref(
    database,
    "rooms/" +
    roomName +
    "/players/" +
    playerId
  );

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        throw new Error("そのルームは存在しません");
      }

      const roomData = snapshot.val();
      const players = roomData.players || {};

      const isDuplicateName =
        Object.values(players).some((player) => {
          return player.name === playerName;
        });

      if (isDuplicateName) {
        throw new Error(
          "この名前はすでに使われています"
        );
      }

      return set(playerRef, {
        name: playerName,
        isHost: false
      });
    })
    .then(() => {
      saveSession();

      showWaitingRoom(roomName);
      listenPlayers(roomName);
      listenRoomStatus(roomName);
      watchMyPlayerStatus();
    })
    .catch((error) => {
      console.error("ルーム参加エラー", error);

      if (joinRoomError) {
        joinRoomError.textContent =
          error.message ||
          "ルーム参加に失敗しました";
      }
    });
}

// =========================
// 待機画面
// =========================

function showWaitingRoom(roomName) {
  hideAllScreens();

  const waitingScreen =
    document.getElementById("waiting-screen");

  setHidden(waitingScreen, false);

  if (roomCode) {
    roomCode.textContent = roomName;
  }

  if (topicCard) {
    topicCard.textContent = "";
  }

  setHidden(answerArea, true);

  updateStartGameButton();
}

function updateStartGameButton() {
  setHidden(startGameButton, !currentIsHost);

  if (startGameButton) {
    startGameButton.disabled = !currentIsHost;
  }

  setHidden(categoryArea, !currentIsHost);
}

// =========================
// ゲーム開始
// =========================

function startGame() {
  if (!currentIsHost) {
    alert("ゲームを開始できるのはホストだけです");
    return;
  }

  resetLocalState();

  if (topicCard) {
    topicCard.textContent = "";
  }

  const selectedCategory =
    categorySelect && categorySelect.value
      ? categorySelect.value
      : "random";

  const roomRef =
    ref(database, "rooms/" + currentRoomName);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        throw new Error("ルーム情報が見つかりません");
      }

      const roomData = snapshot.val();
      const playersData = roomData.players || {};

      const players =
        Object.keys(playersData).map((playerId) => {
          return {
            uid: playerId,
            id: playerId,
            name: playersData[playerId].name,
            isHost: playersData[playerId].isHost
          };
        });

      if (players.length < 3) {
        throw new Error(
          "ゲーム開始には3人以上必要です"
        );
      }

      const startResult =
        game.startGame(players, selectedCategory);

      const playersWithHints =
        typeof assignHints === "function"
          ? assignHints(
            startResult.players,
            startResult.category
          )
          : startResult.players;

      const updates = {};

      playersWithHints.forEach((player) => {
        const playerId = player.uid || player.id;

        updates["players/" + playerId + "/role"] =
          player.role;

        updates["players/" + playerId + "/topic"] =
          player.topic;

        if (player.hint) {
          updates["players/" + playerId + "/hint"] =
            player.hint;
        }
      });

      updates["game/category"] =
        startResult.category;

      updates["game/citizenTopic"] =
        startResult.citizenTopic;

      updates["game/wolfTopic"] =
        startResult.wolfTopic;

      updates["status"] = "topic";
      updates["voteRound"] = 1;
      updates["discussionTime"] = 120;
      updates["revoteCandidates"] = null;
      updates["tiePlayers"] = null;
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

        const roomRef =
          ref(database, "rooms/" + currentRoomName);

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
  const statusRef =
    ref(database, "rooms/" + roomName + "/status");

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

    if (status === "tie") {
      showTieScreen();
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

  const topicScreen =
    document.getElementById("topic-screen");

  const countdownElement =
    document.getElementById("countdown");

  setHidden(topicScreen, false);

  if (topicCountdownTimer) {
    clearInterval(topicCountdownTimer);
  }

  if (topicCard) {
    topicCard.textContent = "";
  }

  const playerRef = ref(
    database,
    "rooms/" +
    currentRoomName +
    "/players/" +
    currentPlayerId
  );

  get(playerRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        alert("プレイヤー情報が見つかりません");
        return;
      }

      const playerData = snapshot.val();

      if (topicCard) {
        topicCard.textContent =
          playerData.topic || "";
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

  const discussionScreen =
    document.getElementById("discussion-screen");

  setHidden(discussionScreen, false);

  if (topicCountdownTimer) {
    clearInterval(topicCountdownTimer);
    topicCountdownTimer = null;
  }

  showDiscussionTopic();

  setHidden(addTimeButton, !currentIsHost);
  setHidden(goVoteButton, !currentIsHost);

  listenDiscussionTime();
}

// =========================
// 同票説明画面
// =========================

function showTieScreen() {
  hideAllScreens();

  const tieScreen =
    document.getElementById("tie-screen");

  setHidden(tieScreen, false);

  lastDiscussionTime = null;

  if (discussionTimer) {
    clearInterval(discussionTimer);
    discussionTimer = null;
  }

  if (!currentIsHost) {
    return;
  }

  setTimeout(() => {
    const roomRef =
      ref(database, "rooms/" + currentRoomName);

    update(roomRef, {
      status: "discussion"
    });
  }, 5000);
}

function listenDiscussionTime() {
  const discussionTimeRef = ref(
    database,
    "rooms/" +
    currentRoomName +
    "/discussionTime"
  );

  onValue(discussionTimeRef, (snapshot) => {
    const discussionTime = snapshot.val();

    if (!discussionTime) {
      return;
    }

    if (discussionTime === lastDiscussionTime) {
      return;
    }

    lastDiscussionTime = discussionTime;

    restartDiscussionTimer(discussionTime);
  });
}

function restartDiscussionTimer(totalTime) {
  const timerElement =
    document.getElementById("discussion-timer");

  const circle =
    document.getElementById("progress-ring");

  if (discussionTimer) {
    clearInterval(discussionTimer);
  }

  let circumference = 0;

  if (circle) {
    const radius = 150;
    circumference = 2 * Math.PI * radius;

    circle.setAttribute(
      "stroke-dasharray",
      circumference
    );

    circle.setAttribute(
      "stroke-dashoffset",
      0
    );
  }

  discussionTimer =
    game.startDiscussionTimer(
      totalTime,
      (time) => {
        const minutes =
          String(Math.floor(time / 60)).padStart(2, "0");

        const seconds =
          String(time % 60).padStart(2, "0");

        if (timerElement) {
          timerElement.textContent =
            `${minutes}:${seconds}`;
        }

        if (circle) {
          const offset =
            circumference * (1 - time / totalTime);

          circle.setAttribute(
            "stroke-dashoffset",
            offset
          );
        }
      },
      () => {
        if (currentIsHost) {
          changeStatusToVoting();
        }
      }
    );
}

function showDiscussionTopic() {
  if (!discussionTopic) {
    return;
  }

  const playerRef = ref(
    database,
    "rooms/" +
    currentRoomName +
    "/players/" +
    currentPlayerId
  );

  get(playerRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const playerData = snapshot.val();

      const topicData =
        game.createDiscussionTopicData(playerData);

      discussionTopic.textContent =
        topicData.message;
    })
    .catch((error) => {
      console.error(
        "話し合い中のお題表示エラー",
        error
      );
    });
}

// =========================
// ヒント表示
// =========================

function showHintModal() {
  if (!currentRoomName || !currentPlayerId) {
    alert("プレイヤー情報が見つかりません");
    return;
  }

  if (!hintModal || !hintText) {
    alert("ヒント表示エリアが見つかりません");
    return;
  }

  const playerRef = ref(
    database,
    "rooms/" +
    currentRoomName +
    "/players/" +
    currentPlayerId
  );

  get(playerRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        alert("ヒント情報が見つかりません");
        return;
      }

      const playerData = snapshot.val();

      hintText.textContent =
        playerData.hint ||
        "自由に話題を広げてみよう";

      setHidden(hintModal, false);
    })
    .catch((error) => {
      console.error("ヒント取得エラー", error);
      alert("ヒントの取得に失敗しました");
    });
}

function closeHintModal() {
  setHidden(hintModal, true);
}

function addOneMinute() {
  if (!currentIsHost) {
    alert("時間を追加できるのはホストだけです");
    return;
  }

  const timerElement =
    document.getElementById("discussion-timer");

  let currentTime = 120;

  if (timerElement && timerElement.textContent) {
    const [minutes, seconds] =
      timerElement.textContent.split(":").map(Number);

    currentTime = minutes * 60 + seconds;
  }

  const newTime = currentTime + 60;

  const roomRef =
    ref(database, "rooms/" + currentRoomName);

  update(roomRef, {
    discussionTime: newTime
  })
    .then(() => {
      console.log("1分追加OK");
    })
    .catch((error) => {
      console.error("1分追加エラー", error);
      alert("時間追加に失敗しました");
    });
}

function changeStatusToVoting() {
  if (discussionTimer) {
    clearInterval(discussionTimer);
    discussionTimer = null;
  }

  if (game.stopTimer) {
    game.stopTimer();
  }

  const roomRef =
    ref(database, "rooms/" + currentRoomName);

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

  const voteScreen =
    document.getElementById("vote-screen");

  setHidden(voteScreen, false);

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

  const roomRef =
    ref(database, "rooms/" + currentRoomName);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const roomData = snapshot.val();
      const players = roomData.players || {};

      Object.keys(players).forEach((playerId) => {
        if (playerId === currentPlayerId) {
          return;
        }

        const player = players[playerId];

        const button =
          document.createElement("button");

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

function selectVoteTarget(targetPlayerId) {
  if (hasVoted) {
    return;
  }

  selectedVoteTargetId = targetPlayerId;

  const buttons =
    document.querySelectorAll(".vote-player-button");

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
    "rooms/" +
    currentRoomName +
    "/votes/" +
    currentPlayerId
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

    const message =
      document.createElement("p");

    message.textContent =
      "投票しました。他の人の投票を待っています...";

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
    "rooms/" +
    currentRoomName +
    "/votes"
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
  const roomRef =
    ref(database, "rooms/" + currentRoomName);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const roomData = snapshot.val();
      const players = roomData.players || {};
      const voteRound = roomData.voteRound || 1;

      const voterCount =
        Object.keys(players).length;

      const voteCount =
        Object.keys(votes).length;

      if (voteCount === voterCount) {
        isVoteCounted = true;

        handleVoteFinished(
          players,
          votes,
          voteRound
        );
      }
    })
    .catch((error) => {
      console.error("投票完了確認エラー", error);
    });
}

function handleVoteFinished(players, votes, voteRound) {
  const roomRef =
    ref(database, "rooms/" + currentRoomName);

  const voteResult =
    vote.judgeVoteResult(votes);

  if (voteResult.isTie) {
    if (voteRound >= 3) {
      const tieLimitData =
        vote.createTieLimitResultData(voteResult);

      update(roomRef, tieLimitData);
      return;
    }

    const revoteData =
      vote.createRevoteDiscussionData(
        voteResult,
        voteRound
      );

    update(roomRef, {
      ...revoteData,
      status: "tie"
    });

    return;
  }

  const eliminatedPlayerId =
    voteResult.eliminatedPlayerId;

  const playersArray =
    Object.keys(players).map((playerId) => {
      return {
        uid: playerId,
        id: playerId,
        ...players[playerId]
      };
    });

  const eliminatedPlayer =
    game.getEliminatedPlayer(
      playersArray,
      eliminatedPlayerId
    );

  const resultData =
    game.createResultData(
      playersArray,
      eliminatedPlayer
    );

  update(roomRef, {
    status: "result",
    result: resultData,
    voteResult: voteResult
  });
}

// =========================
// 結果画面
// =========================

function showResultScreen() {
  hideAllScreens();

  const resultScreen =
    document.getElementById("result-screen");

  const resultContent =
    document.getElementById("result-content");

  setHidden(resultScreen, false);

  const resultRef = ref(
    database,
    "rooms/" +
    currentRoomName +
    "/result"
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

      if (resultData.winner === "citizen") {
        resultContent.innerHTML = `
          <img src="images/gold.png" class="result-icon citizen-icon">

          <h2 class="result-banner citizen-banner">
            <span></span>
            CITIZEN WIN
            <span></span>
          </h2>

          <h2 class="result-title citizen-win">
            市民チームの勝利
          </h2>

          <p class="result-message">
            市民たちはワードウルフを見抜いた
          </p>

          <p>
            追放者：${resultData.eliminatedName || "不明"}
          </p>

          <div class="vote-result-card citizen-card">
            <div class="vote-result-title">
              <span></span>
              投票結果
              <span></span>
            </div>

            <div id="vote-result-list"></div>
          </div>

         <div class="result-buttons">
  <button class="result-btn citizen-btn"
          id="result-answer-button">
    お題を確認
  </button>

  <div id="answer-area" class="answer-card hidden"></div>

  <button class="result-btn citizen-btn"
          id="result-restart-button">
    もう一度遊ぶ
  </button>
</div>

<div class="result-buttons">
  <button class="result-btn citizen-btn"
          id="result-quit-button">
    ゲームをやめる
  </button>
</div>

        `;
      } else {
        resultContent.innerHTML = `
          <img src="images/ookam_red.png" class="result-icon">

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

          <p>
            追放者：${resultData.eliminatedName || "不明"}
          </p>

          <div class="vote-result-card">
            <div class="vote-result-title">
              <span></span>
              投票結果
              <span></span>
            </div>

            <div id="vote-result-list"></div>
          </div>

          <div class="result-buttons">
  <button class="result-btn wolf-btn"
          id="result-answer-button">
    お題を確認
  </button>

  <div id="answer-area" class="answer-card hidden"></div>

  <button class="result-btn wolf-btn"
          id="result-restart-button">
    もう一度遊ぶ
  </button>
</div>


<div class="result-buttons">
  <button class="result-btn wolf-btn"
          id="result-quit-button">
    ゲームをやめる
  </button>
</div>
        `;
      }

      renderVoteResult();
      setupResultButtons();
    })
    .catch((error) => {
      console.error("結果表示エラー", error);
    });
}

function setupResultButtons() {
  const resultAnswerButton =
    document.getElementById("result-answer-button");

  const resultRestartButton =
    document.getElementById("result-restart-button");

  const resultQuitButton =
    document.getElementById("result-quit-button");

  if (resultAnswerButton) {
    resultAnswerButton.addEventListener(
      "click",
      showAnswerArea
    );
  }

  if (resultRestartButton) {
    resultRestartButton.addEventListener(
      "click",
      restartGame
    );
  }

  if (resultQuitButton) {
    resultQuitButton.addEventListener(
      "click",
      quitGame
    );
  }
}

function renderVoteResult() {
  const roomRef =
    ref(database, "rooms/" + currentRoomName);

  get(roomRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const roomData = snapshot.val();

      const players = roomData.players || {};
      const votes = roomData.votes || {};

      const voteResultList =
        document.getElementById("vote-result-list");

      if (!voteResultList) {
        return;
      }

      voteResultList.innerHTML = "";

      const voteCounts = {};

      Object.values(votes).forEach((targetPlayerId) => {
        voteCounts[targetPlayerId] =
          (voteCounts[targetPlayerId] || 0) + 1;
      });

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

      sortedPlayers.forEach((player) => {
        voteResultList.innerHTML += `
          <div class="vote-row">
            <span>👤 ${player.name}</span>
            <span>${player.votes}票</span>
          </div>
        `;
      });
    })
    .catch((error) => {
      console.error("投票結果表示エラー", error);
    });
}

function showAnswerArea() {
  const currentAnswerArea =
    document.getElementById("answer-area");

  if (!currentAnswerArea) {
    return;
  }

  const gameRef =
    ref(database, "rooms/" + currentRoomName + "/game");

  get(gameRef)
    .then((snapshot) => {
      if (!snapshot.exists()) {
        currentAnswerArea.textContent =
          "お題情報が見つかりません";

        currentAnswerArea.classList.remove("hidden");
        return;
      }

      const gameData = snapshot.val();

      currentAnswerArea.innerHTML = `
        <h3 class="answer-card-title">
          お題
        </h3>

        <div class="answer-topic-row">
          <span class="answer-topic-label">
            市民のお題
          </span>

          <span class="answer-topic-text">
            ${gameData.citizenTopic || "不明"}
          </span>
        </div>

        <div class="answer-topic-row">
          <span class="answer-topic-label">
            ワードウルフのお題
          </span>

          <span class="answer-topic-text">
            ${gameData.wolfTopic || "不明"}
          </span>
        </div>
      `;

      currentAnswerArea.classList.remove("hidden");
    })
    .catch((error) => {
      console.error("お題表示エラー", error);

      currentAnswerArea.textContent =
        "お題の表示に失敗しました";

      currentAnswerArea.classList.remove("hidden");
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

  const roomRef =
    ref(database, "rooms/" + currentRoomName);

  const restartData =
    game.createRestartData
      ? game.createRestartData()
      : {
        status: "waiting",
        voteRound: 1,
        votes: null,
        voteResult: null,
        result: null,
        revoteCandidates: null,
        tiePlayers: null,
        discussionTime: 120
      };

  update(roomRef, restartData)
    .then(() => {
      resetLocalState();

      if (topicCard) {
        topicCard.textContent = "";
      }

      setHidden(answerArea, true);

      showWaitingRoom(currentRoomName);
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
    "rooms/" +
    currentRoomName +
    "/players/" +
    currentPlayerId
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
  const playersRef =
    ref(database, "rooms/" + roomName + "/players");

  onValue(playersRef, (snapshot) => {
    const players = snapshot.val();

    if (!playerList) {
      return;
    }

    playerList.innerHTML = "";

    if (!players) {
      return;
    }

    Object.keys(players).forEach((playerId) => {
      const player = players[playerId];

      const li = document.createElement("li");
      const nameSpan = document.createElement("span");

      nameSpan.textContent = player.isHost
        ? player.name + "（ホスト）"
        : player.name;

      li.appendChild(nameSpan);

      if (
        currentIsHost &&
        playerId !== currentPlayerId
      ) {
        const kickButton =
          document.createElement("button");

        kickButton.textContent = "退出";
        kickButton.classList.add("kick-button");

        kickButton.addEventListener("click", () => {
          kickPlayer(playerId, player.name);
        });

        li.appendChild(kickButton);
      }

      playerList.appendChild(li);
    });
  });
}

function kickPlayer(targetPlayerId, targetPlayerName) {
  if (!currentIsHost) {
    alert("退出させられるのはホストだけです");
    return;
  }

  if (targetPlayerId === currentPlayerId) {
    alert("自分自身は退出させられません");
    return;
  }

  const isOk = confirm(
    targetPlayerName + "さんを退出させますか？"
  );

  if (!isOk) {
    return;
  }

  const targetPlayerRef = ref(
    database,
    "rooms/" +
    currentRoomName +
    "/players/" +
    targetPlayerId
  );

  remove(targetPlayerRef)
    .then(() => {
      console.log("プレイヤー退出OK");
    })
    .catch((error) => {
      console.error("退出処理エラー", error);
      alert("退出処理に失敗しました");
    });
}

// =========================
// 画面非表示共通処理
// =========================

function hideAllScreens() {
  const screens = [
    "title-screen",
    "create-room-screen",
    "join-room-screen",
    "waiting-screen",
    "topic-screen",
    "discussion-screen",
    "vote-screen",
    "tie-screen",
    "result-screen"
  ];

  screens.forEach((screenId) => {
    const screen =
      document.getElementById(screenId);

    if (screen) {
      screen.classList.add("hidden");
    }
  });
}
