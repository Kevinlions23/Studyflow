// Book library data layer: upload PDFs to Supabase Storage, create book
// rows, list books, delete, and compute dashboard stats. Browser-only.
import { supabase } from './supabase-client.js';
import { getUser } from './auth-data.js';

const BUCKET = 'books';

// ---------- list / read ----------
export async function listBooks() {
    const user = await getUser();
    if (!user) return [];
    const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getBook(bookId) {
    const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

// ---------- upload ----------
// Uploads the PDF to Storage under {user_id}/{book_id}.pdf and inserts a
// books row. onProgress(stageText) is called as it moves through stages.
export async function uploadBook(file, { title, author }, onProgress = () => {}) {
    const user = await getUser();
    if (!user) throw new Error('Not signed in.');

    if (file.type !== 'application/pdf') {
        throw new Error('Please choose a PDF file.');
    }
    const maxBytes = 1073741824; // 1 GB
    if (file.size > maxBytes) {
        throw new Error('That PDF is larger than the 1 GB limit.');
    }

    onProgress('Creating your book…');
    // Create the book row first so we have an id for the file path.
    const { data: book, error: insErr } = await supabase
        .from('books')
        .insert({
            user_id: user.id,
            title: title || file.name.replace(/\.pdf$/i, ''),
            author: author || null,
            status: 'processing',
        })
        .select()
        .single();
    if (insErr) throw new Error(insErr.message);

    const path = `${user.id}/${book.id}.pdf`;

    try {
        onProgress('Uploading PDF…');
        const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
                contentType: 'application/pdf',
                upsert: true,
            });
        if (upErr) throw new Error(upErr.message);

        onProgress('Finishing up…');
        const { data: updated, error: updErr } = await supabase
            .from('books')
            .update({ file_path: path, status: 'ready' })
            .eq('id', book.id)
            .select()
            .single();
        if (updErr) throw new Error(updErr.message);

        return updated;
    } catch (err) {
        // Roll back the book row if the upload failed, so we don't leave orphans.
        await supabase.from('books').delete().eq('id', book.id);
        throw err;
    }
}

// ---------- delete ----------
export async function deleteBook(bookId) {
    const user = await getUser();
    if (!user) throw new Error('Not signed in.');
    // Remove the file (ignore missing), then the row (cascades chapters etc).
    const path = `${user.id}/${bookId}.pdf`;
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) throw new Error(error.message);
}

// ---------- signed URL for reading a PDF ----------
export async function getBookUrl(filePath) {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 3600); // 1 hour
    if (error) throw new Error(error.message);
    return data.signedUrl;
}

// ---------- dashboard stats ----------
export async function getDashboardStats() {
    const user = await getUser();
    if (!user) return null;

    const [{ data: books }, { data: progress }, { data: attempts }] = await Promise.all([
        supabase.from('books').select('id, status').eq('user_id', user.id),
        supabase
            .from('user_chapter_progress')
            .select('status, completed_at')
            .eq('user_id', user.id),
        supabase.from('quiz_attempts').select('percentage').eq('user_id', user.id),
    ]);

    const booksStudying = (books || []).filter((b) => b.status !== 'completed').length;
    const booksCompleted = (books || []).filter((b) => b.status === 'completed').length;
    const chaptersCompleted = (progress || []).filter((p) => p.status === 'completed').length;

    const pct = (attempts || []).map((a) => Number(a.percentage) || 0);
    const avgQuiz = pct.length
        ? Math.round(pct.reduce((s, n) => s + n, 0) / pct.length)
        : 0;

    const streak = computeStreak(
        (progress || []).map((p) => p.completed_at).filter(Boolean)
    );

    return {
        booksStudying,
        booksCompleted,
        chaptersCompleted,
        avgQuiz,
        streak,
        totalBooks: (books || []).length,
    };
}

// Consecutive-day streak based on chapter completion dates.
function computeStreak(dates) {
    if (!dates.length) return 0;
    const days = new Set(
        dates.map((d) => new Date(d).toISOString().slice(0, 10))
    );
    let streak = 0;
    const cursor = new Date();
    // Allow the streak to count today or yesterday as the anchor.
    const todayStr = cursor.toISOString().slice(0, 10);
    const yest = new Date(cursor);
    yest.setDate(yest.getDate() - 1);
    if (!days.has(todayStr) && !days.has(yest.toISOString().slice(0, 10))) {
        return 0;
    }
    for (;;) {
        const key = cursor.toISOString().slice(0, 10);
        if (days.has(key)) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        } else if (streak === 0 && key === todayStr) {
            // today not done yet, but yesterday might be — step back once.
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

// ---------- recent activity ----------
export async function getRecentActivity(limit = 8) {
    const user = await getUser();
    if (!user) return [];

    const [{ data: books }, { data: attempts }, { data: progress }] = await Promise.all([
        supabase
            .from('books')
            .select('title, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit),
        supabase
            .from('quiz_attempts')
            .select('percentage, passed, completed_at')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(limit),
        supabase
            .from('user_chapter_progress')
            .select('status, completed_at')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(limit),
    ]);

    const items = [];
    (books || []).forEach((b) =>
        items.push({ when: b.created_at, text: `Added "${b.title}"` })
    );
    (attempts || []).forEach((a) =>
        items.push({
            when: a.completed_at,
            text: `Scored ${Math.round(a.percentage)}% on a quiz${a.passed ? ' (passed)' : ''}`,
        })
    );
    (progress || []).forEach((p) =>
        items.push({ when: p.completed_at, text: 'Completed a chapter' })
    );

    return items
        .filter((i) => i.when)
        .sort((a, b) => new Date(b.when) - new Date(a.when))
        .slice(0, limit);
}
