// =========================
// vote.js
// ワードウルフ 投票処理
// =========================

// =========================
// 投票
// =========================

export function votePlayer(
  votes,
  voterId,
  targetId
) {
  if (!votes) {
    throw new Error("votesが存在しません");
  }

  if (!voterId || !targetId) {
    throw new Error("投票者または投票先が不正です");
  }

  if (voterId === targetId) {
    throw new Error("自分には投票できません");
  }

  if (votes[voterId]) {
    throw new Error("すでに投票済みです");
  }

  votes[voterId] = targetId;

  return votes;
}

// =========================
// 投票集計
// =========================

export function countVotes(votes) {
  const voteCounts = {};

  if (!votes) {
    return voteCounts;
  }

  Object.values(votes).forEach((targetId) => {
    if (!voteCounts[targetId]) {
      voteCounts[targetId] = 0;
    }

    voteCounts[targetId]++;
  });

  return voteCounts;
}

// =========================
// 最多票取得
// =========================

export function getMostVotedPlayers(voteCounts) {
  let maxVoteCount = 0;

  Object.values(voteCounts).forEach((count) => {
    if (count > maxVoteCount) {
      maxVoteCount = count;
    }
  });

  const topVotedPlayerIds =
    Object.keys(voteCounts).filter((playerId) => {
      return voteCounts[playerId] === maxVoteCount;
    });

  return {
    maxVoteCount,
    topVotedPlayerIds
  };
}

// =========================
// 同票判定
// =========================

export function checkTie(voteCounts) {
  const result =
    getMostVotedPlayers(voteCounts);

  return result.topVotedPlayerIds.length > 1;
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

  return Object.keys(votes).length === playerCount;
}

// =========================
// 投票結果判定
// =========================

export function judgeVoteResult(votes) {
  const voteCounts =
    countVotes(votes);

  const mostVotedResult =
    getMostVotedPlayers(voteCounts);

  const topVotedPlayerIds =
    mostVotedResult.topVotedPlayerIds;

  const maxVoteCount =
    mostVotedResult.maxVoteCount;

  if (topVotedPlayerIds.length === 0) {
    return {
      tie: false,
      isTie: false,
      players: [],
      revoteCandidates: [],
      topVotedPlayerIds: [],
      eliminatedPlayerId: null,
      voteCounts,
      maxVoteCount: 0
    };
  }

  const isTie =
    topVotedPlayerIds.length > 1;

  return {
    tie: isTie,
    isTie,
    players: topVotedPlayerIds,

    // 表示用として同票者は残す
    revoteCandidates: isTie
      ? topVotedPlayerIds
      : [],

    topVotedPlayerIds,

    eliminatedPlayerId: isTie
      ? null
      : topVotedPlayerIds[0],

    voteCounts,
    maxVoteCount
  };
}

// =========================
// 再投票結果判定
// =========================

export function judgeRevoteResult(votes) {
  return judgeVoteResult(votes);
}

// =========================
// 再投票候補取得
// ※表示用。投票制限には使わない
// =========================

export function getRevoteCandidates(voteResult) {
  if (!voteResult) {
    return [];
  }

  if (!voteResult.tie && !voteResult.isTie) {
    return [];
  }

  return (
    voteResult.revoteCandidates ||
    voteResult.players ||
    voteResult.topVotedPlayerIds ||
    []
  );
}

// =========================
// 再討論データ作成
// =========================

export function createRevoteDiscussionData(
  voteResult,
  voteRound
) {
  return {
    status: "discussion",

    voteResult,

    voteRound:
      voteRound + 1,

    // 再投票でも全員に投票できるようにする
    // null にすることで room.js 側で制限しない
    revoteCandidates: null,

    // 同票者の表示用データ
    tiePlayers:
      getRevoteCandidates(voteResult),

    discussionTime: 60,

    votes: null
  };
}

// =========================
// 再投票2回でも同票の場合
// =========================

export function createTieLimitResultData(
  voteResult
) {
  return {
    status: "result",

    result: {
      winner: "wolf",
      message:
        "再投票を2回しても同票のためワードウルフ勝利",
      reason: "tieLimit",
      voteResult
    },

    voteResult
  };
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
  return {
    voteRound: 1,
    votes: null,
    voteResult: null,
    revoteCandidates: null,
    tiePlayers: null
  };
}

// =========================
// 投票リセット
// =========================

export function resetVotes() {
  return {};
}

// =========================
// 候補配列をFirebase用に変換
// ※今は投票制限しないので基本未使用
// =========================

export function convertCandidatesToObject(candidates) {
  const candidateObject = {};

  candidates.forEach((playerId) => {
    candidateObject[playerId] = true;
  });

  return candidateObject;
}

// =========================
// ランキング取得
// =========================

export function getRanking(votes) {
  const voteCounts =
    countVotes(votes);

  return Object.entries(voteCounts)
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
    players.find((p) => {
      return (
        p.uid === playerId ||
        p.id === playerId
      );
    });

  return player
    ? player.name
    : "不明";
}

// =========================
// テスト
// =========================

export function testVote() {
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
