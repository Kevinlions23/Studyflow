# StudyFlow AI — browser-only version

No Node backend. No `npm start`. The app talks to Supabase directly from
the browser. Serve the folder with Live Server and open it.

## What works now

- Signup, login, logout, forgot/reset password
- Name-only welcome step (asks what to call you)
- **Dashboard**: welcome, study stats (books, chapters, quiz avg, streak),
  Continue Studying card, My Books grid, Recent Activity
- **My Library**: all books, open or delete
- **Upload a Book**: drag/drop or browse a PDF → stored in Supabase Storage
- **Book details**: opens the PDF via a secure signed URL

Chapter detection, per-chapter quizzes, and AI summaries are the next phase.

## One-time setup

### 1. Database
Supabase → SQL Editor → New query → paste all of **`setup.sql`** → Run.
(If you ever see "Cannot coerce the result to a single JSON object",
run **`fix-missing-profiles.sql`** once.)

### 2. Storage (needed for uploads)
Supabase → SQL Editor → New query → paste all of **`setup-storage.sql`** → Run.
This creates a private `books` bucket where each user can only touch their
own files.

### 3. Auth URLs
Supabase → Authentication → URL Configuration
- Site URL: `http://127.0.0.1:5500` (match Live Server)
- Redirect URLs: add `.../login.html` and `.../reset-password.html`
- For quick testing, turn OFF "Confirm email".

### 4. Run
Open the folder in VS Code → right-click `index.html` → **Open with Live Server**.
Must be served over `http://` (not double-clicked as a file).

## Security

`config.js` holds the Supabase URL + **anon key** only — safe for the browser
because Row Level Security limits every user to their own rows. Never put the
`service_role` / secret key in any file here.

## Note on AI (upcoming)

Real per-chapter quizzes and summaries need an AI model to read the PDF. In a
browser-only app the API key can't be safely embedded. When we add AI we'll
use a Supabase Edge Function (holds the key server-side) or a small backend.
