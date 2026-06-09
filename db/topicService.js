async function getRandomTopic(pool) {
  const subtopicResult = await pool.query(`
    SELECT *
    FROM subtopics
    ORDER BY RANDOM()
    LIMIT 1;
  `);

  const subtopic = subtopicResult.rows[0];

  const wordsResult = await pool.query(
    `
    SELECT *
    FROM topic_words
    WHERE subtopic_id = $1
    ORDER BY RANDOM()
    LIMIT 2;
    `,
    [subtopic.id]
  );

  return {
    subtopic,
    words: wordsResult.rows,
  };
}

module.exports = {
  getRandomTopic,
};
