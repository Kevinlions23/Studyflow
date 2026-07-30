// Shared app-shell wiring: theme toggle + logout. Import and call on any
// page that has the sidebar, so those buttons always work.
import { qs, toggleTheme, initTheme } from './ui.js';
import { logOut, getSession } from './auth-data.js';

export async function initShell() {
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

    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session;
}
