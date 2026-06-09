const { getRandomTopic } = require("./db/topicService");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "wordwolf",
  password: "shubon1208",
  port: 5432,
});

app.get("/api/random-topic", async (req, res) => {
  try {
    const data = await getRandomTopic(pool);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "ランダムお題の取得に失敗しました",
    });
  }
});

app.listen(3000, () => {
  console.log("server running on http://localhost:3000");
});
