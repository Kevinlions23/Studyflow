// Upload page: drag/drop or browse a PDF, then upload to Supabase Storage.
import { qs, toast, setButtonLoading } from './ui.js';
import { initShell } from './shell.js';
import { uploadBook } from './books-data.js';

await initShell();

const dropzone = qs('#dropzone');
const fileInput = qs('#file-input');
const browseBtn = qs('#browse-btn');
const fileMeta = qs('#file-meta');
const chosenFile = qs('#chosen-file');
const titleInput = qs('#book-title');
const authorInput = qs('#book-author');
const uploadBtn = qs('#upload-btn');
const cancelBtn = qs('#cancel-btn');
const progressArea = qs('#progress-area');
const progressBar = qs('#upload-progress');
const progressText = qs('#progress-text');

let selectedFile = null;

function chooseFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
        toast('Please choose a PDF file.', 'error');
        return;
    }
    if (file.size > 1073741824) {
        toast('That PDF is larger than the 1 GB limit.', 'error');
        return;
    }
    selectedFile = file;
    chosenFile.textContent = `${file.name} · ${(file.size / 1048576).toFixed(1)} MB`;
    titleInput.value = file.name.replace(/\.pdf$/i, '');
    dropzone.classList.add('hidden');
    fileMeta.classList.remove('hidden');
}

browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => chooseFile(e.target.files[0]));

['dragenter', 'dragover'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('dropzone-active');
    })
);
['dragleave', 'drop'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dropzone-active');
    })
);
dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    chooseFile(file);
});

cancelBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    fileMeta.classList.add('hidden');
    dropzone.classList.remove('hidden');
});

uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    setButtonLoading(uploadBtn, true, 'Uploading…');
    progressArea.classList.remove('hidden');
    let pct = 10;
    progressBar.style.width = '10%';

    try {
        await uploadBook(
            selectedFile,
            { title: titleInput.value.trim(), author: authorInput.value.trim() },
            (stage) => {
                pct = Math.min(pct + 30, 90);
                progressBar.style.width = `${pct}%`;
                progressText.textContent = stage;
            }
        );
        progressBar.style.width = '100%';
        progressText.textContent = 'Your book is ready!';
        toast('Book uploaded.', 'success');
        setTimeout(() => (window.location.href = 'library.html'), 900);
    } catch (err) {
        toast(err.message, 'error');
        setButtonLoading(uploadBtn, false);
        progressArea.classList.add('hidden');
    }
});
