let adminToken = null;

document.getElementById('loginBtn').addEventListener('click', async () => {
    const password = document.getElementById('adminPassword').value;
    const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    if (res.ok) {
        const data = await res.json();
        adminToken = data.token;
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        loadAdminSection('pending');
    } else {
        document.getElementById('loginError').innerText = 'Invalid password';
    }
});

function loadAdminSection(section) {
    if (section === 'pending') loadPending();
    else if (section === 'requests') loadRequests();
    else if (section === 'resources') loadResources();
    else if (section === 'add') showAddForm();
}

async function loadPending() {
    const res = await fetch('/api/admin/pending', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const pending = await res.json();
    const html = `
        <h2>Pending Uploads</h2>
        <div class="grid-cards">
            ${pending.map(p => `
                <div class="card">
                    <div class="card-content">
                        <div class="card-title">${escapeHtml(p.data.title)}</div>
                        <div class="card-desc">Type: ${p.type}</div>
                        <div class="card-desc">Submitted by: ${escapeHtml(p.submitted_by)}</div>
                        <button class="btn-sm approve" data-id="${p.id}">Approve</button>
                        <button class="btn-sm reject" data-id="${p.id}">Reject</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('admin-content').innerHTML = html;
    document.querySelectorAll('.approve').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await fetch(`/api/admin/pending?id=${id}&action=approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            loadPending();
        });
    });
    document.querySelectorAll('.reject').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await fetch(`/api/admin/pending?id=${id}&action=reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            loadPending();
        });
    });
}

async function loadRequests() {
    const res = await fetch('/api/admin/requests', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const requests = await res.json();
    const html = `
        <h2>User Requests</h2>
        <div class="grid-cards">
            ${requests.map(r => `
                <div class="card">
                    <div class="card-content">
                        <div class="card-title">${escapeHtml(r.user_name || 'Anonymous')}</div>
                        <div class="card-desc">${escapeHtml(r.request_text)}</div>
                        <div class="card-desc">Status: ${r.resolved ? 'Resolved' : 'Pending'}</div>
                        ${!r.resolved ? `<button class="btn-sm resolve" data-id="${r.id}">Mark Resolved</button>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('admin-content').innerHTML = html;
    document.querySelectorAll('.resolve').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await fetch(`/api/admin/requests?id=${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            loadRequests();
        });
    });
}

async function loadResources() {
    const types = ['books', 'videos', 'images', 'dictionary', 'courses'];
    let html = `<h2>Manage Resources</h2>`;
    for (const type of types) {
        const res = await fetch(`/api/${type}`);
        const data = await res.json();
        html += `<h3>${type}</h3><div class="grid-cards">`;
        data.forEach(item => {
            html += `
                <div class="card">
                    <div class="card-content">
                        <div class="card-title">${escapeHtml(item.title || item.term)}</div>
                        <button class="btn-sm delete" data-type="${type}" data-id="${item.id}">Delete</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    document.getElementById('admin-content').innerHTML = html;
    document.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.getAttribute('data-type');
            const id = btn.getAttribute('data-id');
            if (confirm('Delete this resource?')) {
                await fetch(`/api/admin/resources?type=${type}&id=${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                loadResources();
            }
        });
    });
}

function showAddForm() {
    document.getElementById('admin-content').innerHTML = `
        <h2>Add New Resource (Direct, no approval)</h2>
        <form id="addResourceForm">
            <div class="form-group"><input type="text" name="title" placeholder="Title" required></div>
            <div class="form-group"><textarea name="description" placeholder="Description"></textarea></div>
            <div class="form-group">
                <select name="type" required>
                    <option value="books">Book</option>
                    <option value="videos">Video</option>
                    <option value="images">Image</option>
                    <option value="dictionary">Dictionary Term</option>
                    <option value="courses">Course</option>
                </select>
            </div>
            <div class="form-group"><input type="url" name="file_url" placeholder="File URL (optional)"></div>
            <button type="submit" class="primary-btn">Add</button>
        </form>
        <div id="addResult"></div>
    `;
    document.getElementById('addResourceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const obj = Object.fromEntries(formData.entries());
        const type = obj.type;
        delete obj.type;
        const res = await fetch(`/api/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify(obj)
        });
        const result = await res.json();
        document.getElementById('addResult').innerHTML = `<p>Added: ${result.title || result.term}</p>`;
        e.target.reset();
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadAdminSection(btn.getAttribute('data-section'));
    });
});