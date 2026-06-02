// =========================
// vote.js
// ワードウルフ 投票処理
// =========================

// 投票
export function votePlayer(
  votes,
  voterId,
  targetId
) {

  // 自分投票禁止
  if (voterId === targetId) {

    throw new Error(
      "自分には投票できません"
    );

  }

  // 二重投票禁止
  if (votes[voterId]) {

    throw new Error(
      "すでに投票済みです"
    );

  }

  votes[voterId] = targetId;

  return votes;

}

// 投票集計
export function countVotes(
  votes
) {

  const result = {};

  Object.values(votes)
    .forEach(targetId => {

      if (!result[targetId]) {

        result[targetId] = 0;

      }

      result[targetId]++;

    });

  return result;

}

// 最多票取得
export function getMostVotedPlayers(
  voteCount
) {

  let maxVote = 0;

  Object.values(voteCount)
    .forEach(count => {

      if (count > maxVote) {

        maxVote = count;

      }

    });

  const players = [];

  Object.entries(voteCount)
    .forEach(
      ([uid, count]) => {

        if (count === maxVote) {

          players.push(uid);

        }

      }
    );

  return players;

}

// 同票判定
export function checkTie(
  voteCount
) {

  const topPlayers =
    getMostVotedPlayers(
      voteCount
    );

  return (
    topPlayers.length > 1
  );

}

// 全員投票完了判定
export function isVotingFinished(
  votes,
  playerCount
) {

  return (
    Object.keys(votes)
      .length === playerCount
  );

}

// 再投票開始
export function startRevote() {

  console.log(
    "同票のため再投票を開始します"
  );

  return {
    gameState: "revote"
  };

}

// 投票結果判定
export function judgeVoteResult(
  votes
) {

  const voteCount =
    countVotes(votes);

  const topPlayers =
    getMostVotedPlayers(
      voteCount
    );

  // 同票
  if (
    topPlayers.length > 1
  ) {

    return {
      tie: true,
      players: topPlayers
    };

  }

  return {
    tie: false,
    eliminatedPlayerId:
      topPlayers[0]
  };

}

// 再投票結果判定
export function judgeRevoteResult(
  votes
) {

  const voteCount =
    countVotes(votes);

  const topPlayers =
    getMostVotedPlayers(
      voteCount
    );

  // 再投票でも同票
  if (
    topPlayers.length > 1
  ) {

    return {
      winner: "wolf",
      message:
        "再投票でも同票のためワードウルフ勝利"
    };

  }

  return {
    winner: null,
    eliminatedPlayerId:
      topPlayers[0]
  };

}

// 投票リセット
export function resetVotes() {

  return {};

}

// ランキング取得
export function getRanking(
  votes
) {

  const voteCount =
    countVotes(votes);

  return Object.entries(
    voteCount
  ).sort(
    (a, b) =>
      b[1] - a[1]
  );

}

// =========================
// テスト用
// =========================

export function testVote() {

  const votes = {};

  votePlayer(
    votes,
    "uid1",
    "uid2"
  );

  votePlayer(
    votes,
    "uid2",
    "uid3"
  );

  votePlayer(
    votes,
    "uid3",
    "uid2"
  );

  console.log(
    "投票内容"
  );

  console.log(votes);

  console.log(
    "投票完了:"
  );

  console.log(
    isVotingFinished(
      votes,
      3
    )
  );

  console.log(
    "票数"
  );

  console.log(
    countVotes(votes)
  );

  console.log(
    "ランキング"
  );

  console.log(
    getRanking(votes)
  );

  console.log(
    "結果"
  );

  console.log(
    judgeVoteResult(votes)
  );

}
