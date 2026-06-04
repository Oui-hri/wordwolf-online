// =========================
// vote.js
// ワードウルフ 投票処理
// =========================

// 投票回数
let voteRound = 1;

// =========================
// 投票回数管理
// =========================

export function getVoteRound() {
  return voteRound;
}

export function nextVoteRound() {
  voteRound++;
  return voteRound;
}

export function resetVoteRound() {
  voteRound = 1;
}

// =========================
// 投票
// =========================

export function votePlayer(
  votes,
  voterId,
  targetId
) {
  if (!votes) {
    throw new Error(
      "votesが存在しません"
    );
  }

  if (!voterId || !targetId) {
    throw new Error(
      "投票者または投票先が不正です"
    );
  }

  if (voterId === targetId) {
    throw new Error(
      "自分には投票できません"
    );
  }

  if (votes[voterId]) {
    throw new Error(
      "すでに投票済みです"
    );
  }

  votes[voterId] = targetId;

  return votes;
}

// =========================
// 投票集計
// =========================

export function countVotes(votes) {
  const result = {};

  if (!votes) {
    return result;
  }

  Object.values(votes).forEach(
    targetId => {
      if (!result[targetId]) {
        result[targetId] = 0;
      }

      result[targetId]++;
    }
  );

  return result;
}

// =========================
// 最多票取得
// =========================

export function getMostVotedPlayers(
  voteCount
) {
  let maxVote = 0;

  Object.values(voteCount).forEach(
    count => {
      if (count > maxVote) {
        maxVote = count;
      }
    }
  );

  const players = [];

  Object.entries(voteCount).forEach(
    ([uid, count]) => {
      if (count === maxVote) {
        players.push(uid);
      }
    }
  );

  return players;
}

// =========================
// 同票判定
// =========================

export function checkTie(voteCount) {
  const topPlayers =
    getMostVotedPlayers(voteCount);

  return topPlayers.length > 1;
}

// =========================
// 全員投票完了判定
// =========================

export function isVotingFinished(
  votes,
  playerCount
) {
  return (
    Object.keys(votes).length ===
    playerCount
  );
}

// =========================
// 投票結果判定
// =========================

export function judgeVoteResult(votes) {
  const voteCount =
    countVotes(votes);

  const topPlayers =
    getMostVotedPlayers(voteCount);

  if (topPlayers.length === 0) {
    return {
      tie: false,
      eliminatedPlayerId: null
    };
  }

  if (topPlayers.length > 1) {
    return {
      tie: true,
      players: topPlayers,
      revoteCandidates: topPlayers
    };
  }

  return {
    tie: false,
    eliminatedPlayerId: topPlayers[0]
  };
}

// =========================
// 再投票候補取得
// =========================

export function getRevoteCandidates(
  voteResult
) {
  if (!voteResult.tie) {
    return [];
  }

  return voteResult.players;
}

// =========================
// 同票時の処理
// =========================

export function handleTie(voteResult) {
  if (!voteResult.tie) {
    return null;
  }

  if (voteRound >= 3) {
    return {
      winner: "wolf",
      message:
        "再投票を2回しても同票のためワードウルフ勝利"
    };
  }

  nextVoteRound();

  return {
    tie: true,
    gameState: "discussion",
    voteRound,
    discussionTime: 60,
    revoteCandidates:
      voteResult.players,
    votes: resetVotes()
  };
}

// =========================
// 再投票結果判定
// =========================

export function judgeRevoteResult(votes) {
  const voteResult =
    judgeVoteResult(votes);

  if (voteResult.tie) {
    return handleTie(voteResult);
  }

  return {
    tie: false,
    eliminatedPlayerId:
      voteResult.eliminatedPlayerId
  };
}

// =========================
// 投票リセット
// =========================

export function resetVotes() {
  return {};
}

// =========================
// ランキング取得
// =========================

export function getRanking(votes) {
  const voteCount =
    countVotes(votes);

  return Object.entries(voteCount)
    .sort((a, b) => b[1] - a[1]);
}

// =========================
// プレイヤー名取得
// =========================

export function getPlayerName(
  players,
  playerId
) {
  const player =
    players.find(
      p => p.uid === playerId
    );

  return player
    ? player.name
    : "不明";
}

// =========================
// テスト
// =========================

export function testVote() {
  resetVoteRound();

  const votes = {};

  votePlayer(votes, "1", "2");
  votePlayer(votes, "2", "3");
  votePlayer(votes, "3", "2");

  console.log("投票内容");
  console.log(votes);

  console.log("投票結果");
  console.log(judgeVoteResult(votes));

  console.log("ランキング");
  console.log(getRanking(votes));
}
