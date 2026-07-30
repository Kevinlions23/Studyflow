// Dashboard: greets the user, shows stats, continue-studying, book grid,
// and recent activity. Logout + theme wired first so they always work.
import { initTheme, qs, toggleTheme, toast } from './ui.js';
import { getSession, getProfile, logOut } from './auth-data.js';
import {
    listBooks,
    getDashboardStats,
    getRecentActivity,
    deleteBook,
} from './books-data.js';

initTheme();

const themeBtn = qs('#theme-toggle');
if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

const logoutBtn = qs('#logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try { await logOut(); } catch (e) { console.warn(e); }
        window.location.href = 'login.html';
    });
}

(async () => {
    const session = await getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    let profile;
    try {
        profile = await getProfile();
    } catch (err) {
        console.error(err);
    }
    if (profile && !profile.onboarding_complete) {
        window.location.href = 'onboarding.html';
        return;
    }
    if (profile) {
        const nameEl = qs('#welcome-name');
        if (nameEl) nameEl.textContent = profile.full_name || 'there';
    }

    await Promise.all([loadStats(), loadBooks(), loadActivity()]);
})();

async function loadStats() {
    try {
        const s = await getDashboardStats();
        if (!s) return;
        qs('#stat-studying').textContent = s.booksStudying;
        qs('#stat-completed').textContent = s.booksCompleted;
        qs('#stat-chapters').textContent = s.chaptersCompleted;
        qs('#stat-quizavg').textContent = `${s.avgQuiz}%`;
        qs('#stat-streak').textContent = s.streak;
    } catch (err) {
        console.error('stats:', err);
    }
}

async function loadBooks() {
    const grid = qs('#books-grid');
    const continueArea = qs('#continue-area');
    try {
        const books = await listBooks();

        if (!books.length) {
            continueArea.innerHTML =
                '<div class="card empty-state">No books yet. Upload your first PDF to get started.</div>';
            grid.innerHTML =
                '<a class="card book-card book-card-add" href="upload-book.html">+ Upload a Book</a>';
            return;
        }

        const current = books.find((b) => b.status !== 'completed') || books[0];
        continueArea.innerHTML = continueCard(current);

        grid.innerHTML =
            books.map(bookCard).join('') +
            '<a class="card book-card book-card-add" href="upload-book.html">+ Upload a Book</a>';

        grid.querySelectorAll('[data-delete]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.dataset.delete;
                const title = btn.dataset.title;
                if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
                try {
                    await deleteBook(id);
                    toast('Book deleted.', 'success');
                    await Promise.all([loadStats(), loadBooks(), loadActivity()]);
                } catch (err) {
                    toast(err.message, 'error');
                }
            });
        });
    } catch (err) {
        console.error('books:', err);
        grid.innerHTML = '<div class="card muted">Could not load books.</div>';
    }
}

async function loadActivity() {
    const list = qs('#activity-list');
    try {
        const items = await getRecentActivity();
        if (!items.length) {
            list.innerHTML = '<li class="muted">No activity yet.</li>';
            return;
        }
        list.innerHTML = items
            .map(
                (i) =>
                    `<li class="activity-item"><span>${escapeHtml(i.text)}</span><span class="muted activity-when">${timeAgo(i.when)}</span></li>`
            )
            .join('');
    } catch (err) {
        console.error('activity:', err);
        list.innerHTML = '<li class="muted">Could not load activity.</li>';
    }
}

function continueCard(book) {
    return `
    <div class="card continue-card">
        <div class="book-thumb">${initials(book.title)}</div>
        <div class="continue-info">
            <h3>${escapeHtml(book.title)}</h3>
            <p class="muted">${escapeHtml(book.author || 'Unknown author')}</p>
            <div class="progress-track mt-8"><div class="progress-fill continue-progress"></div></div>
        </div>
        <a class="btn btn-primary" href="book-details.html?id=${book.id}">Continue</a>
    </div>`;
}

function bookCard(book) {
    const badge =
        book.status === 'completed'
            ? '<span class="badge badge-done">Completed</span>'
            : book.status === 'processing'
            ? '<span class="badge">Processing</span>'
            : '<span class="badge badge-ready">Ready</span>';
    return `
    <a class="card book-card" href="book-details.html?id=${book.id}">
        <div class="book-thumb">${initials(book.title)}</div>
        <div class="book-card-body">
            <h3 class="book-title">${escapeHtml(book.title)}</h3>
            <p class="muted book-author">${escapeHtml(book.author || 'Unknown author')}</p>
            ${badge}
        </div>
        <button class="book-delete" title="Delete" data-delete="${book.id}" data-title="${escapeHtml(book.title)}">&#10005;</button>
    </a>`;
}

function initials(title = '') {
    return title.trim().slice(0, 2).toUpperCase() || 'B';
}
function escapeHtml(s = '') {
    return s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
}
function timeAgo(iso) {
    const then = new Date(iso).getTime();
    const secs = Math.floor((Date.now() - then) / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}
