import { database } from "./firebase.js";

import * as game from "./game.js";

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
const topicCard = document.getElementById("player-word");
const voteList = document.getElementById("vote-list");
const voteButton = document.getElementById("vote-button");

// 今操作している人の情報を一時的に覚えるための変数
let currentRoomName = "";
let currentPlayerId = "";
let currentIsHost = false;

// 投票で選択中のプレイヤーID
let selectedVoteTargetId = "";
let hasVoted = false;

// タイマー管理用
let topicCountdownTimer = null;
let discussionTimer = null;

// 画面遷移の重複防止用
let isTopicFlowStarted = false;
let isDiscussionStarted = false;
let isVotingStarted = false;
let isVoteResultShown = false;
let isResultShown = false;

// 投票集計の重複防止用
let isVoteCounted = false;

// 同じstatusで何度も画面切り替えしないための変数
let lastStatus = "";

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

// 投票ボタンが押されたときの処理
if (voteButton) {
  voteButton.addEventListener("click", () => {
    submitVote();
  });
}

// ページ更新後にルームへ復帰する処理
restoreSession();

// セッション情報を保存する処理
function saveSession() {
  sessionStorage.setItem("wordwolfRoomName", currentRoomName);
  sessionStorage.setItem("wordwolfPlayerId", currentPlayerId);
  sessionStorage.setItem("wordwolfIsHost", String(currentIsHost));
}

// セッション情報を削除する処理
function clearSession() {
  sessionStorage.removeItem("wordwolfRoomName");
  sessionStorage.removeItem("wordwolfPlayerId");
  sessionStorage.removeItem("wordwolfIsHost");
}

// ページ更新後にルームへ復帰する処理
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
        console.log("復帰できるプレイヤー情報がありません");
        clearSession();
        return;
      }

      console.log("ルームへ復帰します");

      listenPlayers(currentRoomName);
      listenRoomStatus(currentRoomName);
      updateStartGameButton();
    })
    .catch((error) => {
      console.error("復帰エラー", error);
      clearSession();
    });
}

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

  selectedVoteTargetId = "";
  hasVoted = false;
  isTopicFlowStarted = false;
  isDiscussionStarted = false;
  isVotingStarted = false;
  isVoteResultShown = false;
  isResultShown = false;
  isVoteCounted = false;
  lastStatus = "";

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
      console.log("ルーム作成OK");

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

  selectedVoteTargetId = "";
  hasVoted = false;
  isTopicFlowStarted = false;
  isDiscussionStarted = false;
  isVotingStarted = false;
  isVoteResultShown = false;
  isResultShown = false;
  isVoteCounted = false;
  lastStatus = "";

  const roomRef = ref(database, "rooms/" + roomName);
  const playerRef = ref(database, "rooms/" + roomName + "/players/" + playerId);

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

      const playerData = {
        name: playerName,
        isHost: false
      };

      return set(playerRef, playerData);
    })
    .then(() => {
      console.log("ルーム参加OK");

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

// 待機部屋画面を表示する処理
function showWaitingRoom(roomName) {
  const titleScreen = document.getElementById("title-screen");
  const waitingScreen = document.getElementById("waiting-screen");
  const topicScreen = document.getElementById("topic-screen");
  const discussionScreen = document.getElementById("discussion-screen");
  const voteScreen = document.getElementById("vote-screen");
  const resultScreen = document.getElementById("result-screen");

  titleScreen.classList.add("hidden");
  topicScreen.classList.add("hidden");
  discussionScreen.classList.add("hidden");
  voteScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
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
          id: playerId,
          name: playersData[playerId].name,
          isHost: playersData[playerId].isHost
        };
      });

      if (players.length < 3) {
        throw new Error("ゲーム開始には3人以上必要です");
      }

      const category = "random";

      let startResult;

      if (typeof game.startGame === "function") {
        startResult = game.startGame(players, category);
      } else if (typeof game.assignRoles === "function") {
        startResult = game.assignRoles(players, category);
      } else {
        throw new Error("game.jsにゲーム開始処理がありません");
      }

      const normalizedStartResult = normalizeStartGameResult(
        startResult,
        category
      );

      const updates = {};

      normalizedStartResult.players.forEach((player) => {
        const playerId = player.uid || player.id;

        updates["players/" + playerId + "/role"] = player.role;
        updates["players/" + playerId + "/topic"] = player.topic;
      });

      updates["game/category"] = normalizedStartResult.category;
      updates["game/citizenTopic"] = normalizedStartResult.citizenTopic;
      updates["game/wolfTopic"] = normalizedStartResult.wolfTopic;
      updates["voteRound"] = 1;
      updates["revoteCandidates"] = null;
      updates["votes"] = null;
      updates["voteResult"] = null;
      updates["result"] = null;
      updates["discussionTime"] = 120;

      // まずは全員をお題確認画面へ進める
      updates["status"] = "topic";

      return update(roomRef, updates);
    })
    .then(() => {
      console.log("ゲーム開始OK");

      // ホストだけが10秒後にstatusをdiscussionへ変える
      setTimeout(() => {
        const roomRef = ref(
          database,
          "rooms/" + currentRoomName
        );

        update(roomRef, {
          status: "discussion",
          discussionTime: 120
        })
          .then(() => {
            console.log("話し合い開始OK");
          })
          .catch((error) => {
            console.error("話し合い開始エラー", error);
          });
      }, 10000);
    })
    .catch((error) => {
      console.error("ゲーム開始エラー", error);
      alert(error.message || "ゲーム開始に失敗しました");
    });
}

// game.jsのゲーム開始結果をroom.js側で扱いやすい形に整える処理
function normalizeStartGameResult(startResult, fallbackCategory) {
  const players = startResult.players || [];
  const category = startResult.category || fallbackCategory;

  let citizenTopic =
    startResult.citizenTopic ||
    startResult.word1 ||
    "";

  let wolfTopic =
    startResult.wolfTopic ||
    startResult.word2 ||
    "";

  if (!citizenTopic || !wolfTopic) {
    const citizenPlayer = players.find((player) => {
      return player.role !== "wolf";
    });

    const wolfPlayer = players.find((player) => {
      return player.role === "wolf";
    });

    if (citizenPlayer) {
      citizenTopic = citizenPlayer.topic;
    }

    if (wolfPlayer) {
      wolfTopic = wolfPlayer.topic;
    }
  }

  return {
    players: players,
    category: category,
    citizenTopic: citizenTopic,
    wolfTopic: wolfTopic
  };
}

// ルームの状態をリアルタイムで監視する処理
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

    console.log("現在のステータス:", status);

    if (status === "waiting") {
      showWaitingRoom(roomName);
    }

    if (status === "topic") {
      isTopicFlowStarted = true;
      showTopicScreen();
    }

    if (status === "discussion") {
      isDiscussionStarted = true;
      showDiscussionScreen();
    }

    if (status === "voting") {
      isVotingStarted = true;
      showVoteScreen();
    }

    if (status === "voteResult") {
      isVoteResultShown = true;
      showVoteResult();
    }

    if (status === "result") {
      isResultShown = true;
      showResultScreen();
    }
  });
}

// お題確認画面を表示する処理
function showTopicScreen() {
  const titleScreen = document.getElementById("title-screen");
  const waitingScreen = document.getElementById("waiting-screen");
  const topicScreen = document.getElementById("topic-screen");
  const discussionScreen = document.getElementById("discussion-screen");
  const voteScreen = document.getElementById("vote-screen");
  const resultScreen = document.getElementById("result-screen");
  const countdownElement = document.getElementById("countdown");

  titleScreen.classList.add("hidden");
  waitingScreen.classList.add("hidden");
  discussionScreen.classList.add("hidden");
  voteScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
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

// お題確認画面のカウントダウン処理
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

// 話し合い画面を表示する処理
function showDiscussionScreen() {
  const titleScreen = document.getElementById("title-screen");
  const waitingScreen = document.getElementById("waiting-screen");
  const topicScreen = document.getElementById("topic-screen");
  const discussionScreen = document.getElementById("discussion-screen");
  const voteScreen = document.getElementById("vote-screen");
  const resultScreen = document.getElementById("result-screen");
  const timerElement = document.getElementById("discussion-timer");

  titleScreen.classList.add("hidden");
  waitingScreen.classList.add("hidden");
  topicScreen.classList.add("hidden");
  voteScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
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
      const ring = document.querySelector(".timer-ring");
      const totalTime = discussionTime || 120;

      if (ring) {
        ring.style.setProperty("--progress", 100);
      }

      discussionTimer = game.startDiscussionTimer(
        totalTime,
        (time) => {
          const minutes = String(Math.floor(time / 60)).padStart(2, "0");
          const seconds = String(time % 60).padStart(2, "0");

          if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds}`;
          }

          const progress = (time / totalTime) * 100;

          if (ring) {
            ring.style.setProperty("--progress", progress);
          }
        },
        () => {
          console.log("議論終了");

          if (currentIsHost) {
            changeStatusToVoting();
          }
        }
      );
    });
}

// Firebaseから話し合い時間を取得する処理
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
    .catch((error) => {
      console.error("話し合い時間取得エラー", error);
      return 120;
    });
}

// 投票画面へ進める処理
function changeStatusToVoting() {
  if (!currentRoomName) {
    return;
  }

  const roomRef = ref(
    database,
    "rooms/" + currentRoomName
  );

  update(roomRef, {
    status: "voting",
    votes: null,
    voteResult: null
  })
    .then(() => {
      console.log("投票開始OK");
    })
    .catch((error) => {
      console.error("投票開始エラー", error);
    });
}

// 投票画面を表示する処理
function showVoteScreen() {
  const titleScreen = document.getElementById("title-screen");
  const waitingScreen = document.getElementById("waiting-screen");
  const topicScreen = document.getElementById("topic-screen");
  const discussionScreen = document.getElementById("discussion-screen");
  const voteScreen = document.getElementById("vote-screen");
  const resultScreen = document.getElementById("result-screen");

  titleScreen.classList.add("hidden");
  waitingScreen.classList.add("hidden");
  topicScreen.classList.add("hidden");
  discussionScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  voteScreen.classList.remove("hidden");

  if (discussionTimer) {
    clearInterval(discussionTimer);
    discussionTimer = null;
  }

  selectedVoteTargetId = "";
  hasVoted = false;
  isVoteCounted = false;
  isVoteResultShown = false;
  isResultShown = false;

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

// 投票候補を表示する処理
function renderVoteList() {
  if (!voteList) {
    return;
  }

  voteList.innerHTML = "";

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
      const revoteCandidates = roomData.revoteCandidates || null;

      Object.keys(players).forEach((playerId) => {
        if (playerId === currentPlayerId) {
          return;
        }


        const player = players[playerId];

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("vote-player-button");
        button.dataset.playerId = playerId;
        button.innerHTML = `
          <div class="player-left">
            <div class="player-icon">
              👤
            </div>
            <div class="player-name">
              ${player.name}
            </div>
          </div>
          <div class="check">
            ✓
          </div>
        `;

        button.addEventListener("click", () => {
          selectVoteTarget(playerId);
        });

        voteList.appendChild(button);
      });

      if (voteButton) {
        voteButton.style.display = "none";
      }
    })
    .catch((error) => {
      console.error("投票候補取得エラー", error);
    });
}

// 再投票候補かどうかを判定する処理
function isVoteCandidate(playerId, revoteCandidates) {
  if (!revoteCandidates) {
    return true;
  }

  if (Array.isArray(revoteCandidates)) {
    return revoteCandidates.includes(playerId);
  }

  return revoteCandidates[playerId] === true;
}

// 投票先を選択する処理
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

// 投票内容をFirebaseに保存する処理
function submitVote() {
  if (hasVoted) {
    return;
  }

  if (!selectedVoteTargetId) {
    alert("投票する相手を選んでください");
    return;
  }

  if (!currentRoomName || !currentPlayerId) {
    alert("投票情報が見つかりません");
    return;
  }

  const voteRef = ref(
    database,
    "rooms/" + currentRoomName + "/votes/" + currentPlayerId
  );

  set(voteRef, selectedVoteTargetId)
    .then(() => {
      console.log("投票保存OK");
      hasVoted = true;
      showVoteWaiting();
    })
    .catch((error) => {
      console.error("投票保存エラー", error);
      alert("投票に失敗しました");
    });
}

// 投票後の待機表示
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

// 投票状況を監視する処理
function listenVotes() {
  if (!currentRoomName) {
    return;
  }

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
      console.log("まだ投票はありません");
      return;
    }

    checkAllVotesSubmitted(votes);
  });
}

// 全員が投票したか確認する処理
function checkAllVotesSubmitted(votes) {
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
      const revoteCandidates = roomData.revoteCandidates || null;
      const voteRound = roomData.voteRound || 1;

      const voterCount = getVoterCount(players, revoteCandidates);
      const voteCount = Object.keys(votes).length;

      console.log("投票数:", voteCount + "/" + voterCount);

      if (voteCount === voterCount) {
        isVoteCounted = true;
        handleVoteFinished(players, votes, voteRound);
      }
    })
    .catch((error) => {
      console.error("投票完了確認エラー", error);
    });
}

// 投票者数を取得する処理
function getVoterCount(players, revoteCandidates) {
  if (!revoteCandidates) {
    return Object.keys(players).length;
  }

  // 再投票時も全員が投票する想定。
  // もし同票候補だけが投票する仕様にする場合は、ここを候補数に変更する。
  return Object.keys(players).length;
}

// 投票終了時の処理
function handleVoteFinished(players, votes, voteRound) {
  const roomRef = ref(
    database,
    "rooms/" + currentRoomName
  );

  const fallbackVoteResult = createFallbackVoteResult(votes);
  let voteResult = fallbackVoteResult;

  if (voteRound >= 2 && typeof game.judgeRevoteResult === "function") {
    voteResult = normalizeVoteResult(
      game.judgeRevoteResult(votes),
      fallbackVoteResult
    );
  } else if (typeof game.judgeVoteResult === "function") {
    voteResult = normalizeVoteResult(
      game.judgeVoteResult(votes),
      fallbackVoteResult
    );
  }

  console.log("投票結果:", voteResult);

  if (voteResult.isTie) {
    if (voteRound >= 3) {
      const resultData = {
        winner: "wolf",
        message: "再投票でも同票のためワードウルフ勝利",
        reason: "tieLimit",
        voteResult: voteResult
      };

      update(roomRef, {
        status: "result",
        result: resultData,
        voteResult: voteResult
      })
        .then(() => {
          console.log("同票上限による結果保存OK");
        })
        .catch((error) => {
          console.error("結果保存エラー", error);
        });

      return;
    }

    let tieResult;

    if (typeof game.handleTie === "function") {
      tieResult = game.handleTie(voteResult);
    } else {
      tieResult = {
        gameState: "discussion",
        discussionTime: 60,
        revoteCandidates: voteResult.topVotedPlayerIds
      };
    }

    const revoteCandidates = convertCandidatesToObject(
      tieResult.revoteCandidates || voteResult.topVotedPlayerIds
    );

    update(roomRef, {
      status: tieResult.gameState || "discussion",
      voteResult: voteResult,
      voteRound: voteRound + 1,
      revoteCandidates: revoteCandidates,
      discussionTime: tieResult.discussionTime || 60,
      votes: null
    })
      .then(() => {
        console.log("同票処理保存OK");
      })
      .catch((error) => {
        console.error("同票処理保存エラー", error);
      });

    return;
  }

  const eliminatedPlayerId =
    voteResult.eliminatedPlayerId ||
    voteResult.eliminatedPlayer ||
    voteResult.topVotedPlayerIds?.[0];

  let resultData;

const playersArray = Object.keys(players).map((playerId) => {
  return {
    uid: playerId,
    ...players[playerId]
  };
});

if (
  typeof game.getEliminatedPlayer === "function" &&
  typeof game.createResultData === "function"
) {
  const eliminatedPlayer = game.getEliminatedPlayer(
    playersArray,
    eliminatedPlayerId
  );

  resultData = game.createResultData(
    playersArray,
    eliminatedPlayer
  );
} else {
  resultData = createFallbackResultData(
    players,
    eliminatedPlayerId
  );
}

  update(roomRef, {
    status: "result",
    result: resultData,
    voteResult: voteResult
  })
    .then(() => {
      console.log("結果保存OK");
    })
    .catch((error) => {
      console.error("結果保存エラー", error);
    });
}

// 候補配列をFirebase保存しやすいオブジェクトに変換する処理
function convertCandidatesToObject(candidates) {
  const candidateObject = {};

  candidates.forEach((playerId) => {
    candidateObject[playerId] = true;
  });

  return candidateObject;
}

// game.js側の投票結果をroom.jsで扱いやすい形に整える処理
function normalizeVoteResult(gameVoteResult, fallbackVoteResult) {
  if (!gameVoteResult) {
    return fallbackVoteResult;
  }

  return {
    voteCounts:
      gameVoteResult.voteCounts ||
      fallbackVoteResult.voteCounts,
    maxVoteCount:
      gameVoteResult.maxVoteCount ||
      fallbackVoteResult.maxVoteCount,
    topVotedPlayerIds:
      gameVoteResult.topVotedPlayerIds ||
      gameVoteResult.revoteCandidates ||
      fallbackVoteResult.topVotedPlayerIds,
    isTie:
      typeof gameVoteResult.isTie === "boolean"
        ? gameVoteResult.isTie
        : fallbackVoteResult.isTie,
    eliminatedPlayerId:
      gameVoteResult.eliminatedPlayerId ||
      gameVoteResult.eliminatedPlayer ||
      fallbackVoteResult.eliminatedPlayerId,
    raw: gameVoteResult
  };
}

// room.jsだけでも動くようにするための投票結果処理
function createFallbackVoteResult(votes) {
  const voteCounts = {};

  Object.keys(votes).forEach((voterId) => {
    const targetId = votes[voterId];

    if (!voteCounts[targetId]) {
      voteCounts[targetId] = 0;
    }

    voteCounts[targetId]++;
  });

  let maxVoteCount = 0;

  Object.keys(voteCounts).forEach((playerId) => {
    if (voteCounts[playerId] > maxVoteCount) {
      maxVoteCount = voteCounts[playerId];
    }
  });

  const topVotedPlayerIds = Object.keys(voteCounts).filter((playerId) => {
    return voteCounts[playerId] === maxVoteCount;
  });

  const isTie = topVotedPlayerIds.length >= 2;

  return {
    voteCounts: voteCounts,
    maxVoteCount: maxVoteCount,
    topVotedPlayerIds: topVotedPlayerIds,
    isTie: isTie,
    eliminatedPlayerId: isTie ? "" : topVotedPlayerIds[0]
  };
}

// room.jsだけでも動くようにするための結果作成処理
function createFallbackResultData(players, eliminatedPlayerId) {
  const eliminatedPlayer = players[eliminatedPlayerId];
  const eliminatedRole = eliminatedPlayer?.role || "";

  const winner = eliminatedRole === "wolf" ? "citizen" : "wolf";

  return {
    winner: winner,
    eliminatedPlayerId: eliminatedPlayerId,
    eliminatedPlayerName: eliminatedPlayer?.name || "不明なプレイヤー",
    eliminatedRole: eliminatedRole,
    message:
      winner === "citizen"
        ? "市民チームの勝利"
        : "ワードウルフの勝利"
  };
}

// 投票結果を画面に表示する処理
function showVoteResult() {
  const titleScreen = document.getElementById("title-screen");
  const waitingScreen = document.getElementById("waiting-screen");
  const topicScreen = document.getElementById("topic-screen");
  const discussionScreen = document.getElementById("discussion-screen");
  const voteScreen = document.getElementById("vote-screen");
  const resultScreen = document.getElementById("result-screen");

  titleScreen.classList.add("hidden");
  waitingScreen.classList.add("hidden");
  topicScreen.classList.add("hidden");
  discussionScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  voteScreen.classList.remove("hidden");

  const voteResultRef = ref(
    database,
    "rooms/" + currentRoomName + "/voteResult"
  );

  const playersRef = ref(
    database,
    "rooms/" + currentRoomName + "/players"
  );

  Promise.all([
    get(voteResultRef),
    get(playersRef)
  ])
    .then(([voteResultSnapshot, playersSnapshot]) => {
      if (!voteResultSnapshot.exists() || !playersSnapshot.exists()) {
        return;
      }

      const voteResult = voteResultSnapshot.val();
      const players = playersSnapshot.val();
      const voteCounts = voteResult.voteCounts;
      const topVotedPlayerIds = voteResult.topVotedPlayerIds || [];
      const isTie = voteResult.isTie;

      if (!voteList) {
        return;
      }

      voteList.innerHTML = "";

      const title = document.createElement("h3");
      title.textContent = "投票結果";
      voteList.appendChild(title);

      Object.keys(voteCounts).forEach((playerId) => {
        const playerName = players[playerId]?.name || "不明なプレイヤー";
        const count = voteCounts[playerId];

        const p = document.createElement("p");
        p.textContent = playerName + "：" + count + "票";
        voteList.appendChild(p);
      });

      const resultMessage = document.createElement("h3");

      if (isTie) {
        resultMessage.textContent = "同票です。再投票が必要です";
        voteList.appendChild(resultMessage);

        const tieListTitle = document.createElement("p");
        tieListTitle.textContent = "同票候補";
        voteList.appendChild(tieListTitle);

        topVotedPlayerIds.forEach((playerId) => {
          const playerName = players[playerId]?.name || "不明なプレイヤー";

          const p = document.createElement("p");
          p.textContent = playerName;
          voteList.appendChild(p);
        });
      } else {
        const eliminatedPlayerId = topVotedPlayerIds[0];
        const eliminatedPlayerName =
          players[eliminatedPlayerId]?.name || "不明なプレイヤー";

        resultMessage.textContent = "最多票：" + eliminatedPlayerName;
        voteList.appendChild(resultMessage);

        const p = document.createElement("p");
        p.textContent = "脱落候補：" + eliminatedPlayerName;
        voteList.appendChild(p);
      }

      if (voteButton) {
        voteButton.disabled = true;
        voteButton.style.display = "none";
      }
    })
    .catch((error) => {
      console.error("投票結果表示エラー", error);
    });
}

// 結果画面を表示する処理
function showResultScreen() {
  const titleScreen = document.getElementById("title-screen");
  const waitingScreen = document.getElementById("waiting-screen");
  const topicScreen = document.getElementById("topic-screen");
  const discussionScreen = document.getElementById("discussion-screen");
  const voteScreen = document.getElementById("vote-screen");
  const resultScreen = document.getElementById("result-screen");
  const resultContent = document.getElementById("result-content");

  titleScreen.classList.add("hidden");
  waitingScreen.classList.add("hidden");
  topicScreen.classList.add("hidden");
  discussionScreen.classList.add("hidden");
  voteScreen.classList.add("hidden");
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

      const title = document.createElement("h2");
      title.textContent = resultData.message || "結果";
      resultContent.appendChild(title);

      const eliminatedName =
      resultData.eliminatedPlayerName ||
      resultData.eliminatedName;

      if (eliminatedName) {
         const eliminated = document.createElement("p");
         eliminated.textContent =
         "追放者：" + eliminatedName;
         resultContent.appendChild(eliminated);
      }

      if (resultData.winner) {
        const winner = document.createElement("p");
        winner.textContent =
          resultData.winner === "citizen"
            ? "市民チーム勝利"
            : "ワードウルフ勝利";
        resultContent.appendChild(winner);
      }
    })
    .catch((error) => {
      console.error("結果表示エラー", error);
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
