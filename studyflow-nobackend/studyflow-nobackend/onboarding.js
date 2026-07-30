// Name-only onboarding: capture a display name, then go to the dashboard.
import { initTheme, qs, toast, setButtonLoading } from './ui.js';
import { getSession, getProfile, updateProfile } from './auth-data.js';

initTheme();

(async () => {
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    // Pre-fill with any name we already have.
    try {
        const profile = await getProfile();
        if (profile?.full_name) qs('#display-name').value = profile.full_name;
    } catch (err) {
        console.warn(err);
    }
})();

const btn = qs('#continue-btn');
const input = qs('#display-name');

async function submit() {
    const name = input.value.trim();
    if (name.length < 1) {
        toast('Please enter a name.', 'error');
        return;
    }
    setButtonLoading(btn, true, 'Saving…');
    try {
        await updateProfile({ full_name: name, onboarding_complete: true });
        window.location.href = 'dashboard.html';
    } catch (err) {
        toast(err.message, 'error');
        setButtonLoading(btn, false);
    }
}

btn.addEventListener('click', submit);
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
});
