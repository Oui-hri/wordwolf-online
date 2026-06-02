// =========================
// game.js
// ワードウルフ ゲーム処理
// =========================

import { TOPICS } from "./topics.js";

// ゲーム状態
export const GAME_STATE = {
  WAITING: "waiting",
  DISCUSSION: "discussion",
  VOTING: "voting",
  REVOTE: "revote",
  RESULT: "result"
};

// カテゴリー一覧取得
export function getCategories() {

  return [
    ...Object.keys(TOPICS),
    "random"
  ];

}

// お題取得
export function getRandomTopic(category) {

  let selectedCategory = category;

  if (category === "random") {

    const categories =
      Object.keys(TOPICS);

    selectedCategory =
      categories[
      Math.floor(
        Math.random() *
        categories.length
      )
      ];

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

    citizenTopic =
      topic.word1;

    wolfTopic =
      topic.word2;

  } else {

    citizenTopic =
      topic.word2;

    wolfTopic =
      topic.word1;

  }

  return {
    category: selectedCategory,
    citizenTopic,
    wolfTopic
  };

}

// ワードウルフ選出
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

// 役職配布
export function assignRoles(
  players,
  category
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

  const result =
    getRandomTopic(category);

  const wolfIndex =
    chooseWolf(players);

  const assignedPlayers =
    players.map(
      (player, index) => {

        if (index === wolfIndex) {

          return {
            ...player,
            role: "wolf",
            topic:
              result.wolfTopic
          };

        }

        return {
          ...player,
          role: "citizen",
          topic:
            result.citizenTopic
        };

      }
    );

  return {
    category: result.category,
    wolfIndex,
    players: assignedPlayers
  };

}

// ゲーム開始
export function startGame(
  players,
  category
) {

  return assignRoles(
    players,
    category
  );

}

// タイマー
export function startDiscussionTimer(
  seconds,
  onTick,
  onFinish
) {

  let time = seconds;

  const timer =
    setInterval(() => {

      if (onTick) {

        onTick(time);

      }

      console.log(
        `残り時間: ${time}秒`
      );

      time--;

      if (time <= 0) {

        clearInterval(timer);

        console.log(
          "議論終了"
        );

        if (onFinish) {

          onFinish();

        }

      }

    }, 1000);

  return timer;

}

// ゲーム状態変更
export function changeGameState(
  roomData,
  newState
) {

  roomData.gameState =
    newState;

  console.log(
    `ゲーム状態変更: ${newState}`
  );

  return roomData;

}

// ウルフ取得
export function getWolfPlayer(
  players
) {

  return players.find(
    player =>
      player.role === "wolf"
  );

}

// 勝敗判定
export function judgeWinner(
  eliminatedPlayer
) {

  if (
    eliminatedPlayer.role ===
    "wolf"
  ) {

    return {
      winner: "citizen",
      message:
        "市民チームの勝利"
    };

  }

  return {
    winner: "wolf",
    message:
      "ワードウルフの勝利"
  };

}

// 再投票でも同票ならウルフ勝利
export function judgeTieAfterRevote() {

  return {
    winner: "wolf",
    message:
      "再投票でも同票のためワードウルフ勝利"
  };

}

// =========================
// テスト用
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
    startGame(
      players,
      "random"
    );

  console.log(
    "カテゴリー"
  );

  console.log(
    result.category
  );

  console.log(
    "役職配布"
  );

  console.table(
    result.players
  );

}
