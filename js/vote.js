// =========================
// vote.js
// ワードウルフ 投票処理
// =========================

// =========================
// 投票回数
// =========================

let voteRound = 1;

// =========================
// 投票回数取得
// =========================

export function getVoteRound() {
  return voteRound;
}

// =========================
// 投票回数を進める
// =========================

export function nextVoteRound() {
  voteRound++;
  return voteRound;
}

// =========================
// 投票回数リセット
// =========================

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
  if (!votes) {
    return false;
  }

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
      isTie: false,
      players: [],
      topVotedPlayerIds: [],
      eliminatedPlayerId: null,
      voteCounts: voteCount,
      maxVoteCount: 0
    };
  }

  const maxVoteCount =
    voteCount[topPlayers[0]];

  if (topPlayers.length > 1) {
    return {
      tie: true,
      isTie: true,
      players: topPlayers,
      revoteCandidates: topPlayers,
      topVotedPlayerIds: topPlayers,
      eliminatedPlayerId: null,
      voteCounts: voteCount,
      maxVoteCount
    };
  }

  return {
    tie: false,
    isTie: false,
    players: topPlayers,
    topVotedPlayerIds: topPlayers,
    eliminatedPlayerId: topPlayers[0],
    voteCounts: voteCount,
    maxVoteCount
  };
}

// =========================
// 再投票候補取得
// =========================

export function getRevoteCandidates(
  voteResult
) {
  if (!voteResult) {
    return [];
  }

  if (!voteResult.tie && !voteResult.isTie) {
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
// 同票時の処理
// =========================

export function handleTie(voteResult) {
  if (!voteResult) {
    return null;
  }

  const isTie =
    voteResult.tie || voteResult.isTie;

  if (!isTie) {
    return null;
  }

  if (voteRound >= 3) {
    return {
      status: "result",
      gameState: "result",
      winner: "wolf",
      message:
        "再投票を2回しても同票のためワードウルフ勝利",
      reason: "tieLimit"
    };
  }

  nextVoteRound();

  return {
    tie: true,
    isTie: true,
    status: "discussion",
    gameState: "discussion",
    voteRound,
    discussionTime: 60,
    revoteCandidates:
      getRevoteCandidates(voteResult),
    votes: resetVotes()
  };
}

// =========================
// 再投票結果判定
// =========================

export function judgeRevoteResult(votes) {
  const voteResult =
    judgeVoteResult(votes);

  if (voteResult.tie || voteResult.isTie) {
    return handleTie(voteResult);
  }

  return {
    tie: false,
    isTie: false,
    eliminatedPlayerId:
      voteResult.eliminatedPlayerId,
    topVotedPlayerIds:
      voteResult.topVotedPlayerIds,
    voteCounts:
      voteResult.voteCounts,
    maxVoteCount:
      voteResult.maxVoteCount
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
      p =>
        p.uid === playerId ||
        p.id === playerId
    );

  return player
    ? player.name
    : "不明";
}

// =========================
// 投票開始用データ
// =========================

export function createVoteStartData() {
  return {
    status: "voting",
    votes: null,
    voteResult: null
  };
}

// =========================
// 投票状態リセット用データ
// =========================

export function createVoteResetData() {
  resetVoteRound();

  return {
    voteRound: 1,
    votes: null,
    voteResult: null,
    revoteCandidates: null
  };
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
