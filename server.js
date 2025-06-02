const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = 3001;

const DATA_FILE = './data.json';

function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    return {
        users: {
            'admin': { password: 'admin123', type: 'admin', childId: null },
            'parent1': { password: 'pass123', type: 'parent', childId: 'child1' }
        },
        children: {
            'child1': { name: '田中太郎', id: 'child1' }
        },
        records: {}
    };
}
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

app.use(cors());
app.use(express.json());

app.post('/api/login', (req, res) => {
    const { userId, password } = req.body;
    const user = db.users[userId];
    if (user && user.password === password) {
        res.json({ ok: true, user: { userId, ...user } });
    } else {
        res.status(401).json({ ok: false, error: '認証失敗' });
    }
});
app.post('/api/users', (req, res) => {
    const { userId, password, type, childId } = req.body;
    if (!userId || !password || !type || (type === 'parent' && !childId)) {
        return res.status(400).json({ ok: false, error: 'パラメータ不足' });
    }
    if (db.users[userId]) {
        return res.status(409).json({ ok: false, error: 'ID重複' });
    }
    db.users[userId] = { password, type, childId: type === 'parent' ? childId : null };
    saveData(db);
    res.json({ ok: true });
});
app.post('/api/children', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: '児童名必須' });
    const id = 'child' + Date.now();
    db.children[id] = { name, id };
    saveData(db);
    res.json({ ok: true, child: db.children[id] });
});
app.get('/api/users', (req, res) => {
    res.json(db.users);
});
app.get('/api/children', (req, res) => {
    res.json(db.children);
});
app.post('/api/records', (req, res) => {
    const { childId, date, record } = req.body;
    if (!childId || !date || !record) return res.status(400).json({ ok: false, error: 'パラメータ不足' });
    if (!db.records[childId]) db.records[childId] = {};
    db.records[childId][date] = record;
    saveData(db);
    res.json({ ok: true });
});
app.get('/api/records/:childId', (req, res) => {
    const { childId } = req.params;
    res.json(db.records[childId] || {});
});
app.post('/api/reply', (req, res) => {
    const { childId, date, userId, reply } = req.body;
    if (!childId || !date || !userId || typeof reply !== 'string') {
        return res.status(400).json({ ok: false, error: 'パラメータ不足' });
    }
    if (!db.records[childId] || !db.records[childId][date]) {
        return res.status(404).json({ ok: false, error: '記録が存在しません' });
    }
    if (!db.records[childId][date].reply) db.records[childId][date].reply = {};
    db.records[childId][date].reply[userId] = reply;
    saveData(db);
    res.json({ ok: true });
});
app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
});
