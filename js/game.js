// =========================
// game.js
// ワードウルフ ゲーム処理
// =========================

import { TOPICS } from "./topics.js";

// =========================
// ゲーム状態
// =========================

export const GAME_STATE = {
  WAITING: "waiting",
  TOPIC: "topic",
  DISCUSSION: "discussion",
  VOTING: "voting",
  REVOTE: "revote",
  RESULT: "result"
};

// =========================
// カテゴリー一覧
// =========================

export function getCategories() {
  return [
    ...Object.keys(TOPICS),
    "random"
  ];
}

// =========================
// ランダムカテゴリー
// =========================

export function getRandomCategory() {
  const categories =
    Object.keys(TOPICS);

  return categories[
    Math.floor(
      Math.random() *
      categories.length
    )
  ];
}

// =========================
// お題取得
// =========================

export function getRandomTopic(
  category = "random"
) {
  let selectedCategory =
    category;

  if (category === "random") {
    selectedCategory =
      getRandomCategory();
  }

  if (!TOPICS[selectedCategory]) {
    throw new Error(
      `存在しないカテゴリー: ${selectedCategory}`
    );
  }

  const topics =
    TOPICS[selectedCategory];

  const topic =
    topics[
    Math.floor(
      Math.random() *
      topics.length
    )
    ];

  let citizenTopic;
  let wolfTopic;

  if (Math.random() < 0.5) {
    citizenTopic = topic.word1;
    wolfTopic = topic.word2;
  } else {
    citizenTopic = topic.word2;
    wolfTopic = topic.word1;
  }

  return {
    category: selectedCategory,
    citizenTopic,
    wolfTopic
  };
}

// =========================
// ウルフ抽選
// =========================

export function chooseWolf(players) {
  if (!Array.isArray(players)) {
    throw new Error(
      "playersが配列ではありません"
    );
  }

  if (players.length === 0) {
    throw new Error(
      "プレイヤーが存在しません"
    );
  }

  return Math.floor(
    Math.random() *
    players.length
  );
}

// =========================
// 役職配布
// =========================

export function assignRoles(
  players,
  category = "random"
) {
  if (!Array.isArray(players)) {
    throw new Error(
      "playersが配列ではありません"
    );
  }

  if (players.length < 3) {
    throw new Error(
      "プレイヤーは3人以上必要です"
    );
  }

  const topicData =
    getRandomTopic(category);

  const wolfIndex =
    chooseWolf(players);

  const assignedPlayers =
    players.map((player, index) => {
      return {
        ...player,

        role:
          index === wolfIndex
            ? "wolf"
            : "citizen",

        topic:
          index === wolfIndex
            ? topicData.wolfTopic
            : topicData.citizenTopic
      };
    });

  return {
    category: topicData.category,
    citizenTopic: topicData.citizenTopic,
    wolfTopic: topicData.wolfTopic,
    wolfIndex,
    players: assignedPlayers
  };
}

// =========================
// ゲーム開始
// =========================

export function startGame(
  players,
  category = "random"
) {
  return assignRoles(
    players,
    category
  );
}

// =========================
// タイマー
// =========================

let currentTimer = null;

export function startDiscussionTimer(
  seconds,
  onTick,
  onFinish
) {
  if (currentTimer) {
    clearInterval(currentTimer);
  }

  let time = seconds;

  currentTimer = setInterval(() => {
    if (onTick) {
      onTick(time);
    }

    time--;

    if (time < 0) {
      clearInterval(currentTimer);
      currentTimer = null;

      if (onFinish) {
        onFinish();
      }
    }
  }, 1000);

  return currentTimer;
}

// =========================
// タイマー停止
// =========================

export function stopTimer() {
  if (currentTimer) {
    clearInterval(currentTimer);
    currentTimer = null;
  }
}

// =========================
// ゲーム状態変更
// =========================

export function changeGameState(
  roomData,
  newState
) {
  roomData.gameState = newState;
  return roomData;
}

// =========================
// ウルフ取得
// =========================

export function getWolfPlayer(players) {
  return players.find(
    player =>
      player.role === "wolf"
  );
}

// =========================
// 市民取得
// =========================

export function getCitizenPlayers(players) {
  return players.filter(
    player =>
      player.role === "citizen"
  );
}

// =========================
// 追放者取得
// =========================

export function getEliminatedPlayer(
  players,
  eliminatedPlayerId
) {
  return players.find(
    player =>
      player.uid === eliminatedPlayerId ||
      player.id === eliminatedPlayerId
  );
}

// =========================
// 勝敗判定
// =========================

export function judgeWinner(
  eliminatedPlayer
) {
  if (!eliminatedPlayer) {
    throw new Error(
      "追放されたプレイヤーが存在しません"
    );
  }

  if (eliminatedPlayer.role === "wolf") {
    return {
      winner: "citizen",
      message: "市民チームの勝利"
    };
  }

  return {
    winner: "wolf",
    message: "ワードウルフの勝利"
  };
}

// =========================
// 結果データ作成
// =========================

export function createResultData(
  players,
  eliminatedPlayer
) {
  const winnerResult =
    judgeWinner(eliminatedPlayer);

  const wolf =
    getWolfPlayer(players);

  return {
    winner: winnerResult.winner,
    message: winnerResult.message,

    wolfPlayerId: wolf?.uid || wolf?.id || "",
    wolfName: wolf?.name || "不明",
    wolfTopic: wolf?.topic || "",

    eliminatedPlayerId:
      eliminatedPlayer.uid ||
      eliminatedPlayer.id ||
      "",

    eliminatedName:
      eliminatedPlayer.name || "不明",

    eliminatedRole:
      eliminatedPlayer.role || "",

    eliminatedTopic:
      eliminatedPlayer.topic || ""
  };
}

// =========================
// 再投票でも同票
// =========================

export function judgeTieAfterRevote() {
  return {
    winner: "wolf",
    message:
      "再投票でも同票のためワードウルフ勝利"
  };
}

// =========================
// 再討論開始
// =========================

export function startRevoteDiscussion() {
  return {
    gameState: GAME_STATE.DISCUSSION,
    discussionTime: 60
  };
}

// =========================
// 再投票候補
// =========================

export function getRevoteCandidates(
  voteResult
) {
  if (!voteResult || !voteResult.tie) {
    return [];
  }

  return (
    voteResult.players ||
    voteResult.revoteCandidates ||
    voteResult.topVotedPlayerIds ||
    []
  );
}

// =========================
// 投票開始データ
// =========================

export function createVoteStartData() {
  return {
    status: GAME_STATE.VOTING,
    votes: null,
    voteResult: null
  };
}

// =========================
// もう一度遊ぶ用データ
// =========================

export function createRestartData() {
  return {
    status: GAME_STATE.WAITING,
    voteRound: 1,
    votes: null,
    voteResult: null,
    result: null,
    revoteCandidates: null,
    discussionTime: 120
  };
}

// =========================
// ゲーム終了用データ
// =========================

export function createQuitData() {
  return {
    status: GAME_STATE.WAITING,
    voteRound: 1,
    votes: null,
    voteResult: null,
    result: null,
    revoteCandidates: null,
    discussionTime: 120
  };
}

// =========================
// 個人メモ
// =========================

let memoText = "";

export function saveMemo(text) {
  memoText = text;
}

export function getMemo() {
  return memoText;
}

export function clearMemo() {
  memoText = "";
}

// =========================
// テスト
// =========================

export function testGame() {
  const players = [
    {
      uid: "1",
      name: "大類"
    },
    {
      uid: "2",
      name: "早川"
    },
    {
      uid: "3",
      name: "中村"
    }
  ];

  const result =
    startGame(players, "random");

  console.log("カテゴリー");
  console.log(result.category);

  console.log("市民のお題");
  console.log(result.citizenTopic);

  console.log("ウルフのお題");
  console.log(result.wolfTopic);

  console.log("役職配布");
  console.table(result.players);
}
