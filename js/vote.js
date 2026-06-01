// =========================
// vote.js
// ワードウルフ 投票処理
// =========================

// 投票情報保存
// votes = {
//   uid1: "uid2",
//   uid2: "uid3",
//   uid3: "uid2"
// }

export function votePlayer(votes, voterId, targetId) {

  votes[voterId] = targetId;

  return votes;
}

// 投票集計
export function countVotes(votes) {

  const result = {};

  Object.values(votes).forEach(targetId => {

    if (!result[targetId]) {
      result[targetId] = 0;
    }

    result[targetId]++;
  });

  return result;
}

// 最多票取得
export function getMostVotedPlayers(voteCount) {

  let maxVote = 0;

  Object.values(voteCount).forEach(count => {
    if (count > maxVote) {
      maxVote = count;
    }
  });

  const players = [];

  Object.entries(voteCount).forEach(([uid, count]) => {

    if (count === maxVote) {
      players.push(uid);
    }
  });

  return players;
}

// 同票判定
export function checkTie(voteCount) {

  const topPlayers = getMostVotedPlayers(voteCount);

  return topPlayers.length > 1;
}

// 再投票開始
export function startRevote() {

  console.log("同票のため再投票を開始します");

  return {
    gameState: "revote"
  };
}

// 投票結果判定
export function judgeVoteResult(votes) {

  const voteCount = countVotes(votes);

  const topPlayers = getMostVotedPlayers(voteCount);

  if (topPlayers.length > 1) {

    return {
      tie: true,
      players: topPlayers
    };
  }

  return {
    tie: false,
    eliminatedPlayerId: topPlayers[0]
  };
}

// =========================
// 再投票結果判定
// =========================

export function judgeRevoteResult(votes) {

  const voteCount = countVotes(votes);

  const topPlayers = getMostVotedPlayers(voteCount);

  if (topPlayers.length > 1) {

    return {
      winner: "wolf",
      message: "再投票でも同票のためワードウルフ勝利"
    };
  }

  return {
    winner: null,
    eliminatedPlayerId: topPlayers[0]
  };
}

// =========================
// テスト用
// =========================

export function testVote() {

  const votes = {};

  votePlayer(votes, "uid1", "uid2");
  votePlayer(votes, "uid2", "uid3");
  votePlayer(votes, "uid3", "uid2");

  console.log("投票内容");
  console.log(votes);

  const result = judgeVoteResult(votes);

  console.log("投票結果");
  console.log(result);
}
