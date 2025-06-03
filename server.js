const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://admin:admin123@cluster0.elhk31e.mongodb.net/shukusai?retryWrites=true&w=majority&appName=Cluster0';
// ↑ admin:admin123 でMongoDB Atlasに接続（パスワードは admin123）

const app = express();
const PORT = 3001;

// --- MongoDBスキーマ定義 ---
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  password: String,
  type: String, // 'admin' or 'parent'
  childId: { type: String, default: null }
});
const childSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String
});
const recordSchema = new mongoose.Schema({
  childId: String,
  date: String,
  morningTemp: String,
  eveningTemp: String,
  bowelCount: String,
  urinationCount: String,
  breakfast: String,
  lunch: String,
  dinner: String,
  medication: String,
  toothBrush: Boolean,
  bath: Boolean,
  clothesChange: Boolean,
  notes: String,
  timestamp: String,
  reply: { type: Object, default: {} }
});

const User = mongoose.model('User', userSchema);
const Child = mongoose.model('Child', childSchema);
const Record = mongoose.model('Record', recordSchema);

// --- ミドルウェア ---
app.use(cors());
app.use(bodyParser.json());

// --- APIエンドポイント ---

// ログイン
app.post('/api/login', async (req, res) => {
  const { userId, password } = req.body;
  const user = await User.findOne({ userId, password });
  if (user) {
    res.json({ user });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// ユーザー一覧
app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(Object.fromEntries(users.map(u => [u.userId, u])));
});

// ユーザー追加
app.post('/api/users', async (req, res) => {
  const { userId, password, type, childId } = req.body;
  try {
    await User.create({ userId, password, type, childId });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 児童一覧
app.get('/api/children', async (req, res) => {
  const children = await Child.find();
  res.json(Object.fromEntries(children.map(c => [c.id, c])));
});

// 児童追加
app.post('/api/children', async (req, res) => {
  const { name, id } = req.body;
  try {
    await Child.create({ name, id });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 児童削除
app.delete('/api/children/:id', async (req, res) => {
  await Child.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// 指定児童の記録一覧
app.get('/api/records/:childId', async (req, res) => {
  const recs = await Record.find({ childId: req.params.childId });
  // {date: record, ...} の形式に変換
  const byDate = {};
  for (const r of recs) byDate[r.date] = r.toObject();
  res.json(byDate);
});

// 指定児童の記録追加/上書き
app.post('/api/records/:childId', async (req, res) => {
  const { date, ...rec } = req.body;
  await Record.findOneAndUpdate(
    { childId: req.params.childId, date },
    { $set: { ...rec, childId: req.params.childId, date } },
    { upsert: true }
  );
  res.json({ ok: true });
});

// 返信保存
app.post('/api/records/:childId/reply', async (req, res) => {
  const { date, userId, reply } = req.body;
  const record = await Record.findOne({ childId: req.params.childId, date });
  if (!record) return res.status(404).json({ error: 'record not found' });
  record.reply = record.reply || {};
  record.reply[userId] = reply;
  await record.save();
  res.json({ ok: true });
});

// 全記録
app.get('/api/records/all', async (req, res) => {
  const recs = await Record.find();
  // childIdごと、dateごとのネスト形式
  const result = {};
  for (const r of recs) {
    if (!result[r.childId]) result[r.childId] = {};
    result[r.childId][r.date] = r.toObject();
  }
  res.json(result);
});

// --- MongoDB接続 & サーバ起動 ---
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected!');
    // 管理者ユーザーがなければ自動生成
    const admin = await User.findOne({ userId: 'admin' });
    if (!admin) {
      await User.create({ userId: 'admin', password: 'admin123', type: 'admin', childId: null });
      console.log('Default admin user created.');
    }
    app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
