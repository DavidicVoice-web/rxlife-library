let currentUser = null;
let currentTab = 'home';

async function checkAuth() {
    const token = localStorage.getItem('rxlife_token');
    if (!token) return null;
    const res = await fetch('/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
        const data = await res.json();
        currentUser = data;
        updateUIForUser();
        return data;
    } else {
        localStorage.removeItem('rxlife_token');
        currentUser = null;
        updateUIForUser();
        return null;
    }
}

function updateUIForUser() {
    const userArea = document.getElementById('userArea');
    if (currentUser) {
        userArea.innerHTML = `
            <span class="user-name">${escapeHtml(currentUser.profile?.username || currentUser.user.email)}</span>
            <button id="logoutBtn" class="user-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
        `;
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('uploadTabBtn').style.display = 'flex';
        document.getElementById('profileTabBtn').style.display = 'flex';
    } else {
        userArea.innerHTML = `
            <button id="loginBtn" class="user-btn"><i class="fas fa-user"></i> Login</button>
            <button id="signupBtn" class="user-btn"><i class="fas fa-user-plus"></i> Sign Up</button>
        `;
        document.getElementById('loginBtn').addEventListener('click', showLoginModal);
        document.getElementById('signupBtn').addEventListener('click', showSignupModal);
        document.getElementById('uploadTabBtn').style.display = 'none';
        document.getElementById('profileTabBtn').style.display = 'none';
    }
}

async function login(email, password) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('rxlife_token', data.session.access_token);
        currentUser = data;
        updateUIForUser();
        closeModals();
        loadTab(currentTab);
    } else {
        const err = await res.json();
        alert(err.error);
    }
}

async function signup(email, password, username, academic_level) {
    const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, academic_level })
    });
    if (res.ok) {
        alert('Signup successful! Please check your email to confirm.');
        showLoginModal();
    } else {
        const err = await res.json();
        alert(err.error);
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('rxlife_token');
    currentUser = null;
    updateUIForUser();
    loadTab('home');
}

async function loadTab(tab) {
    currentTab = tab;
    if (tab === 'home') renderHome();
    else if (tab === 'upload') {
        if (!currentUser) { alert('Please login to upload'); showLoginModal(); return; }
        renderUploadForm();
    } else if (tab === 'profile') renderProfile();
    else {
        const res = await fetch(`/api/${tab}`);
        const data = await res.json();
        renderList(tab, data);
    }
}

function renderHome() {
    document.getElementById('mainContent').innerHTML = `
        <div class="welcome glass" style="padding:30px; text-align:center; margin-bottom:30px;">
            <h2>Welcome to RxLife Network Library</h2>
            <p>Your pharmacy knowledge hub. Browse resources, upload your own, and track your learning.</p>
        </div>
        <div class="featured">
            <h3>Featured Resources</h3>
            <div class="grid-cards" id="featuredGrid"></div>
        </div>
    `;
    Promise.all([
        fetch('/api/books').then(r => r.json()),
        fetch('/api/videos').then(r => r.json()),
        fetch('/api/courses').then(r => r.json())
    ]).then(([books, videos, courses]) => {
        const featured = [...books.slice(0,3), ...videos.slice(0,2), ...courses.slice(0,2)];
        const grid = document.getElementById('featuredGrid');
        grid.innerHTML = featured.map(item => `
            <div class="card">
                <div class="card-img"><i class="fas ${item.file_url ? 'fa-file' : 'fa-book'} fa-3x"></i></div>
                <div class="card-content">
                    <div class="card-title">${escapeHtml(item.title)}</div>
                    <div class="card-desc">${escapeHtml(item.description || '')}</div>
                    <button class="btn-sm" onclick="loadTab('${item.file_url ? 'videos' : 'books'}')">View</button>
                </div>
            </div>
        `).join('');
    });
}

function renderList(type, items) {
    let html = `<div class="grid-cards">`;
    items.forEach(item => {
        html += `
            <div class="card">
                <div class="card-img"><i class="fas ${type === 'books' ? 'fa-book' : type === 'videos' ? 'fa-video' : type === 'images' ? 'fa-image' : 'fa-graduation-cap'} fa-3x"></i></div>
                <div class="card-content">
                    <div class="card-title">${escapeHtml(item.title || item.term)}</div>
                    <div class="card-desc">${escapeHtml(item.description || item.definition || '')}</div>
                    ${item.file_url ? `<a href="${item.file_url}" target="_blank" class="btn-sm">Download</a>` : ''}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    document.getElementById('mainContent').innerHTML = html;
}

function renderUploadForm() {
    document.getElementById('mainContent').innerHTML = `
        <div class="glass" style="max-width:600px; margin:0 auto; padding:30px;">
            <h2>Upload Pharmacy Resource</h2>
            <form id="uploadForm" enctype="multipart/form-data">
                <div class="form-group"><input type="text" name="title" placeholder="Title" required></div>
                <div class="form-group"><textarea name="description" placeholder="Description"></textarea></div>
                <div class="form-group">
                    <select name="type" required>
                        <option value="book">Book</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                    </select>
                </div>
                <div class="form-group"><input type="file" name="file" required></div>
                <button type="submit" class="primary-btn">Submit for Approval</button>
            </form>
            <div id="uploadMessage"></div>
        </div>
    `;
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const token = localStorage.getItem('rxlife_token');
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const result = await res.json();
        document.getElementById('uploadMessage').innerHTML = `<p>${result.message}</p>`;
    });
}

function renderProfile() {
    if (!currentUser) { showLoginModal(); return; }
    document.getElementById('mainContent').innerHTML = `
        <div class="glass" style="max-width:500px; margin:0 auto; padding:30px;">
            <h2>My Profile</h2>
            <p><strong>Username:</strong> ${escapeHtml(currentUser.profile?.username)}</p>
            <p><strong>Email:</strong> ${escapeHtml(currentUser.user.email)}</p>
            <p><strong>Academic Level:</strong> ${escapeHtml(currentUser.profile?.academic_level || 'Not set')}</p>
            <button id="resetPasswordBtn" class="primary-btn">Reset Password</button>
        </div>
    `;
    document.getElementById('resetPasswordBtn').addEventListener('click', () => {
        const email = currentUser.user.email;
        fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        }).then(() => alert('Password reset email sent'));
    });
}

function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Login</h2>
            <input type="email" id="loginEmail" placeholder="Email" required>
            <input type="password" id="loginPassword" placeholder="Password" required>
            <button id="loginSubmit" class="primary-btn">Login</button>
            <button id="closeModal" class="btn-sm">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('loginSubmit').onclick = () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    };
    document.getElementById('closeModal').onclick = () => modal.remove();
}

function showSignupModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Sign Up</h2>
            <input type="email" id="signupEmail" placeholder="Email" required>
            <input type="text" id="signupUsername" placeholder="Username (starts with Rx...)" required>
            <select id="signupLevel">
                <option value="">Academic Level</option>
                <option value="Pharmacy Student">Pharmacy Student</option>
                <option value="Pharmacist">Pharmacist</option>
                <option value="Researcher">Researcher</option>
                <option value="Educator">Educator</option>
                <option value="Other">Other</option>
            </select>
            <input type="password" id="signupPassword" placeholder="Password" required>
            <button id="signupSubmit" class="primary-btn">Sign Up</button>
            <button id="closeModal" class="btn-sm">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('signupSubmit').onclick = () => {
        const email = document.getElementById('signupEmail').value;
        const username = document.getElementById('signupUsername').value;
        const level = document.getElementById('signupLevel').value;
        const password = document.getElementById('signupPassword').value;
        signup(email, password, username, level);
    };
    document.getElementById('closeModal').onclick = () => modal.remove();
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.remove());
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

let touchStartY = 0;
let menuVisible = false;
const menu = document.getElementById('bottomMenu');

if (menu) {
    document.body.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });
    document.body.addEventListener('touchend', (e) => {
        const endY = e.changedTouches[0].clientY;
        if (endY - touchStartY > 50) {
            menuVisible = true;
            menu.classList.add('visible');
        } else if (touchStartY - endY > 50 && menuVisible) {
            menuVisible = false;
            menu.classList.remove('visible');
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (e.clientY > window.innerHeight - 60) {
            menu.classList.add('visible');
            menuVisible = true;
        }
    });
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            loadTab(tab);
            menu.classList.remove('visible');
            menuVisible = false;
            document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('globalSearch').value;
    const filter = document.getElementById('searchFilter').value;
    if (!query.trim()) return loadTab(currentTab);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&filter=${filter}`);
    const results = await res.json();
    renderSearchResults(results);
});

function renderSearchResults(results) {
    let html = `<h3>Search Results (${results.length})</h3><div class="grid-cards">`;
    results.forEach(r => {
        html += `
            <div class="card">
                <div class="card-img"><i class="fas ${r.type === 'book' ? 'fa-book' : r.type === 'video' ? 'fa-video' : r.type === 'image' ? 'fa-image' : r.type === 'dictionary' ? 'fa-graduation-cap' : 'fa-chalkboard-user'} fa-3x"></i></div>
                <div class="card-content">
                    <div class="card-title">${escapeHtml(r.item.title || r.item.term)}</div>
                    <div class="card-desc">${escapeHtml(r.item.description || r.item.definition || '')}</div>
                    <button class="btn-sm" onclick="loadTab('${r.type}s')">View</button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    document.getElementById('mainContent').innerHTML = html;
}

checkAuth().then(() => loadTab('home'));