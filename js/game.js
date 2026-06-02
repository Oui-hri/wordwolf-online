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

// ランダムでお題を取得
export function getRandomTopic() {

  const index =
    Math.floor(Math.random() * TOPICS.length);

  return TOPICS[index];
}

// ランダムでウルフを決定
export function chooseWolf(players) {

  if (players.length === 0) {
    throw new Error("プレイヤーが存在しません");
  }

  return Math.floor(
    Math.random() * players.length
  );
}

// プレイヤーへ役職とお題を配布
export function assignRoles(players) {

  if (!players || players.length < 3) {
    throw new Error(
      "プレイヤーは3人以上必要です"
    );
  }

  const topic = getRandomTopic();
  const wolfIndex = chooseWolf(players);

  return players.map((player, index) => {

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

  });

}

// 議論タイマー
export function startDiscussionTimer(
  seconds,
  onFinish
) {

  let time = seconds;

  const timer = setInterval(() => {

    console.log(`残り時間: ${time}秒`);

    time--;

    if (time < 0) {

      clearInterval(timer);

      console.log("議論終了");

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

  roomData.gameState = newState;

  console.log(
    `ゲーム状態変更: ${newState}`
  );

  return roomData;
}

// 勝敗判定
export function judgeWinner(
  eliminatedPlayer
) {

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

// 再投票でも同票ならウルフ勝利
export function judgeTieAfterRevote() {

  return {
    winner: "wolf",
    message:
      "再投票でも同票のためワードウルフ勝利"
  };

}

// ウルフ取得
export function getWolfPlayer(players) {

  return players.find(
    player => player.role === "wolf"
  );

}

// =========================
// 動作確認用サンプル
// =========================

export function testGame() {

  const players = [
    { uid: "1", name: "大類" },
    { uid: "2", name: "早川" },
    { uid: "3", name: "中村" }
  ];

  const assignedPlayers =
    assignRoles(players);

  console.log("===== 役職配布 =====");

  console.table(assignedPlayers);

  startDiscussionTimer(
    10,
    () => {
      console.log(
        "投票フェーズへ移動"
      );
    }
  );

}
