const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = 'shukusai';
let db;

// MongoDB接続
MongoClient.connect(mongoUrl, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// ルート（動作確認用）
app.get('/', (req, res) => {
  res.send('API server is running!');
});

// 例：データ取得API
app.get('/api/items', async (req, res) => {
  try {
    const items = await db.collection('items').find({}).toArray();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// 例：データ追加API
app.post('/api/items', async (req, res) => {
  try {
    const newItem = req.body;
    const result = await db.collection('items').insertOne(newItem);
    res.json(result.ops[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// ポート設定（Renderではprocess.env.PORTが必須）
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
