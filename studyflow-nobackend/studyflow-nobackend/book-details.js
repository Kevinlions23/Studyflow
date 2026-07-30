// Book details: shows title/author and opens the PDF via a signed URL.
import { qs, toast } from './ui.js';
import { initShell } from './shell.js';
import { getBook, getBookUrl } from './books-data.js';

await initShell();

const params = new URLSearchParams(window.location.search);
const bookId = params.get('id');

if (!bookId) {
    window.location.href = 'library.html';
}

try {
    const book = await getBook(bookId);
    if (!book) {
        toast('Book not found.', 'error');
        setTimeout(() => (window.location.href = 'library.html'), 1200);
    } else {
        qs('#book-title').textContent = book.title;
        qs('#book-author').textContent = book.author || 'Unknown author';
        const openBtn = qs('#open-pdf');
        if (book.file_path) {
            try {
                openBtn.href = await getBookUrl(book.file_path);
            } catch (err) {
                openBtn.classList.add('hidden');
                toast('Could not load the PDF file.', 'error');
            }
        } else {
            openBtn.classList.add('hidden');
        }
    }
} catch (err) {
    console.error(err);
    toast(err.message, 'error');
}
