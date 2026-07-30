// Settings: edit display name, change email (with verification), log out.
// Controls wired first so logout always works.
import { qs, toast, setButtonLoading } from './ui.js';
import { initShell } from './shell.js';
import { getProfile, updateProfile, getUser, updateEmail, logOut } from './auth-data.js';

await initShell();

// Second logout button inside the page body.
const logout2 = qs('#logout-btn-2');
if (logout2) {
    logout2.addEventListener('click', async () => {
        try { await logOut(); } catch (e) { console.warn(e); }
        window.location.href = 'login.html';
    });
}

// Load current values.
let currentEmail = '';
(async () => {
    try {
        const profile = await getProfile();
        if (profile) qs('#full-name').value = profile.full_name || '';
        const user = await getUser();
        if (user) {
            currentEmail = user.email || '';
            qs('#email').value = currentEmail;
        }
    } catch (err) {
        console.error(err);
    }
})();

// Save display name.
const saveName = qs('#save-name');
saveName.addEventListener('click', async () => {
    const name = qs('#full-name').value.trim();
    if (name.length < 1) return toast('Enter a name.', 'error');
    setButtonLoading(saveName, true, 'Saving…');
    try {
        await updateProfile({ full_name: name });
        toast('Name saved.', 'success');
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        setButtonLoading(saveName, false);
    }
});

// Change email (requires verification on the new address).
const saveEmail = qs('#save-email');
saveEmail.addEventListener('click', async () => {
    const email = qs('#email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return toast('Enter a valid email.', 'error');
    }
    if (email === currentEmail) {
        return toast('That is already your email.', 'info');
    }
    setButtonLoading(saveEmail, true, 'Sending…');
    try {
        await updateEmail(email);
        toast('Confirmation link sent to the new email. Click it to finish the change.', 'success', 7000);
        // Reset the field to the old email until confirmed.
        qs('#email').value = currentEmail;
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        setButtonLoading(saveEmail, false);
    }
});
