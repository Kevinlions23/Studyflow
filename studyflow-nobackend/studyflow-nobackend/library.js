// Library page: lists every book with open + delete.
import { qs, toast } from './ui.js';
import { initShell } from './shell.js';
import { listBooks, deleteBook } from './books-data.js';

await initShell();

const grid = qs('#library-grid');
await render();

async function render() {
    try {
        const books = await listBooks();
        if (!books.length) {
            grid.innerHTML =
                '<a class="card book-card book-card-add" href="upload-book.html">+ Upload a Book</a>';
            return;
        }
        grid.innerHTML =
            books.map(card).join('') +
            '<a class="card book-card book-card-add" href="upload-book.html">+ Upload a Book</a>';

        grid.querySelectorAll('[data-delete]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = btn.dataset.delete;
                if (!confirm(`Delete "${btn.dataset.title}"? This cannot be undone.`)) return;
                try {
                    await deleteBook(id);
                    toast('Book deleted.', 'success');
                    await render();
                } catch (err) {
                    toast(err.message, 'error');
                }
            });
        });
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div class="card muted">Could not load your library.</div>';
    }
}

function card(book) {
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
function initials(t = '') { return t.trim().slice(0, 2).toUpperCase() || 'B'; }
function escapeHtml(s = '') {
    return s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
