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

  // 全部ランダム
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

  const topics =
    TOPICS[selectedCategory];

  const topic =
    topics[
    Math.floor(
      Math.random() *
      topics.length
    )
    ];

  return {
    category: selectedCategory,
    topic: topic
  };

}

// ワードウルフ選出
export function chooseWolf(players) {

  if (players.length === 0) {
    throw new Error("プレイヤーが存在しません");
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

  if (!players || players.length < 3) {

    throw new Error(
      "プレイヤーは3人以上必要です"
    );

  }

  const result =
    getRandomTopic(category);

  const topic =
    result.topic;

  const wolfIndex =
    chooseWolf(players);

  const assignedPlayers =
    players.map(
      (player, index) => {

        if (index === wolfIndex) {

          return {
            ...player,
            role: "wolf",
            topic: topic.wolf
          };

        }

        return {
          ...player,
          role: "citizen",
          topic: topic.citizen
        };

      }
    );

  return {
    category: result.category,
    players: assignedPlayers
  };

}

// タイマー
export function startDiscussionTimer(
  seconds,
  onFinish
) {

  let time = seconds;

  const timer = setInterval(() => {

    console.log(
      `残り時間: ${time}秒`
    );

    time--;

    if (time < 0) {

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

// 勝敗判定
export function judgeWinner(
  eliminatedPlayer
) {

  if (
    eliminatedPlayer.role === "wolf"
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

// 再投票同票
export function judgeTieAfterRevote() {

  return {
    winner: "wolf",
    message:
      "再投票でも同票のためワードウルフ勝利"
  }
}

