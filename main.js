const API = 'http://localhost:3001/api';

let currentUser = null;
let currentChildId = null;
let currentUserType = null;

function login() {
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    fetch(`${API}/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId, password })
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(data => {
        currentUser = userId;
        currentUserType = data.user.type;
        document.getElementById('loginScreen').classList.add('hidden');
        document.querySelector('.logout-btn').classList.remove('hidden');
        if (data.user.type === 'admin') showAdminScreen();
        else showParentScreen();
    })
    .catch(() => {
        document.getElementById('loginError').classList.remove('hidden');
    });
}

function logout() {
    currentUser = null; currentUserType = null; currentChildId = null;
    document.getElementById('loginScreen').classList.remove('hidden');
    document.querySelector('.logout-btn').classList.add('hidden');
    document.getElementById('adminScreen').classList.add('hidden');
    document.getElementById('parentScreen').classList.add('hidden');
}

function showAdminScreen() {
    document.getElementById('adminScreen').classList.remove('hidden');
    document.getElementById('parentScreen').classList.add('hidden');
    showChildManagement();
}
function showChildManagement() {
    document.getElementById('childManagement').classList.remove('hidden');
    document.getElementById('userManagement').classList.add('hidden');
    document.getElementById('allRecords').classList.add('hidden');
    fetch(`${API}/children`).then(res=>res.json()).then(children=>{
        const list = Object.values(children).map(child=>
            `<div class="child-item">${child.name}</div>`
        ).join('');
        document.getElementById('childList').innerHTML = list;
    });
}
function showUserManagement() {
    document.getElementById('childManagement').classList.add('hidden');
    document.getElementById('userManagement').classList.remove('hidden');
    document.getElementById('allRecords').classList.add('hidden');
    Promise.all([
        fetch(`${API}/users`).then(res=>res.json()),
        fetch(`${API}/children`).then(res=>res.json())
    ]).then(([users, children])=>{
        let html = '<ul>';
        for(const id in users) {
            html += `<li>${id} (${users[id].type}) ${users[id].childId ? '→ '+(children[users[id].childId]?.name||'') : ''}</li>`;
        }
        html += '</ul>';
        document.getElementById('userList').innerHTML = html;
        let sel = '<option value="">児童選択</option>';
        Object.values(children).forEach(child=>{
            sel += `<option value="${child.id}">${child.name}</option>`;
        });
        document.getElementById('assignChild').innerHTML = sel;
    });
}
function showAllRecords() {
    document.getElementById('childManagement').classList.add('hidden');
    document.getElementById('userManagement').classList.add('hidden');
    document.getElementById('allRecords').classList.remove('hidden');
    fetch(`${API}/children`).then(res=>res.json()).then(children=>{
        let html = '';
        Object.values(children).forEach(child => {
            html += `<h3>${child.name}</h3><div id="rec-${child.id}"></div>`;
            fetch(`${API}/records/${child.id}`).then(res=>res.json()).then(records=>{
                let recHtml = '';
                Object.keys(records).sort().reverse().forEach(date=>{
                    const rec = records[date];
                    recHtml += renderRecord(date, rec, child.id);
                });
                document.getElementById(`rec-${child.id}`).innerHTML = recHtml;
            });
        });
        document.getElementById('allRecordsList').innerHTML = html;
    });
}
function addChild() {
    const name = document.getElementById('newChildName').value;
    if (!name) return;
    fetch(`${API}/children`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name })
    }).then(res=>res.json()).then(()=>{
        document.getElementById('newChildName').value = '';
        showChildManagement();
    });
}
function addUser() {
    const userId = document.getElementById('newUserId').value.trim();
    const password = document.getElementById('newUserPassword').value.trim();
    const childId = document.getElementById('assignChild').value;
    if (!userId || !password || !childId) return alert('全て入力してください');
    fetch(`${API}/users`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId, password, type:'parent', childId })
    }).then(res=>res.json()).then(()=>{
        document.getElementById('newUserId').value = '';
        document.getElementById('newUserPassword').value = '';
        document.getElementById('assignChild').value = '';
        showUserManagement();
    });
}
function showParentScreen() {
    document.getElementById('adminScreen').classList.add('hidden');
    document.getElementById('parentScreen').classList.remove('hidden');
    fetch(`${API}/users`).then(res=>res.json()).then(users=>{
        const me = users[currentUser];
        currentChildId = me.childId;
        fetch(`${API}/children`).then(res=>res.json()).then(children=>{
            document.getElementById('parentChildName').textContent = children[currentChildId]?.name + 'さんの記録';
        });
        document.getElementById('parentInputForm').style.display = me.type === 'parent' ? '' : 'none';
        loadRecords();
    });
}
function loadRecords() {
    fetch(`${API}/records/${currentChildId}`).then(res=>res.json()).then(records=>{
        let html = '';
        Object.keys(records).sort().reverse().forEach(date=>{
            html += renderRecord(date, records[date], currentChildId);
        });
        document.getElementById('recordsList').innerHTML = html;
    });
}
function saveRecord() {
    if (!currentUser || currentUserType !== 'parent') {
        alert('記録登録は保護者のみです');
        return;
    }
    const date = document.getElementById('recordDate').value;
    const record = {
        date,
        morningTemp: document.getElementById('morningTemp').value,
        eveningTemp: document.getElementById('eveningTemp').value,
        bowelCount: document.getElementById('bowelCount').value,
        urinationCount: document.getElementById('urinationCount').value,
        breakfast: document.getElementById('breakfast').value,
        lunch: document.getElementById('lunch').value,
        dinner: document.getElementById('dinner').value,
        medication: document.getElementById('medication').value,
        toothBrush: document.getElementById('toothBrush').checked,
        bath: document.getElementById('bath').checked,
        clothesChange: document.getElementById('clothesChange').checked,
        notes: document.getElementById('notes').value,
        timestamp: new Date().toISOString()
    };
    fetch(`${API}/records`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ childId: currentChildId, date, record })
    }).then(res=>res.json()).then(()=>{
        alert('記録を保存しました');
        ['morningTemp','eveningTemp','bowelCount','urinationCount','breakfast','lunch','dinner','medication','notes'].forEach(id=>{document.getElementById(id).value = '';});
        ['toothBrush','bath','clothesChange'].forEach(id=>{document.getElementById(id).checked = false;});
        loadRecords();
    });
}
function saveReply(childId, date) {
    const reply = document.getElementById(`replyInput-${date}`).value.trim();
    if (!reply) return;
    fetch(`${API}/reply`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ childId, date, userId: currentUser, reply })
    }).then(res=>res.json()).then(()=>{
        loadRecords();
    });
}
function renderRecord(date, rec, childId) {
    let html = `<div class="record-item">
        <div><b>${date}</b></div>
        <div>朝体温: ${rec.morningTemp || ''} / 夜体温: ${rec.eveningTemp || ''}</div>
        <div>排便: ${rec.bowelCount || ''} / 排尿: ${rec.urinationCount || ''}</div>
        <div>朝: ${rec.breakfast || ''} 昼: ${rec.lunch || ''} 夜: ${rec.dinner || ''}</div>
        <div>服薬: ${rec.medication || ''}</div>
        <div>ケア: 歯磨き${rec.toothBrush?'済':'未'} 入浴${rec.bath?'済':'未'} 着替え${rec.clothesChange?'済':'未'}</div>
        <div>連絡事項: ${rec.notes || ''}</div>`;
    if (currentUserType === 'parent' || currentUserType === 'admin') {
        const myReply = rec.reply && rec.reply[currentUser] ? rec.reply[currentUser] : '';
        html += `<div class="reply-section">
            <div class="reply-title">返信</div>
            <textarea id="replyInput-${date}" rows="2" placeholder="コメント・返信">${myReply}</textarea>
            <button class="btn btn-small" onclick="saveReply('${childId}','${date}')">送信</button>
        </div>`;
        if (rec.reply) {
            Object.entries(rec.reply).forEach(([uid, val])=>{
                if(uid!==currentUser){
                    html += `<div class="reply-section"><div class="reply-title">他保護者/管理者の返信(${uid})</div>
                        <div>${val}</div></div>`;
                }
            });
        }
    }
    html += '</div>';
    return html;
}
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('hidden')) {
        login();
    }
});
