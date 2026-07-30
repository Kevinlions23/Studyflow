// Drives login, signup, forgot-password and reset-password forms.
import { initTheme, qs, toast, setButtonLoading } from './ui.js';
import {
    signUp,
    logIn,
    sendPasswordReset,
    updatePassword,
    getSession,
    getProfile,
} from './auth-data.js';

initTheme();

// If already signed in, skip auth pages (reset page is allowed through).
const page = document.body.dataset.page || '';
if (page !== 'reset') {
    getSession().then((session) => {
        if (session) window.location.href = 'dashboard.html';
    });
}

// ---------- SIGNUP ----------
const signupForm = qs('#signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = qs('button[type="submit"]', signupForm);
        const fullName = qs('#fullName').value.trim();
        const email = qs('#email').value.trim();
        const password = qs('#password').value;
        const confirmPassword = qs('#confirmPassword').value;

        if (fullName.length < 2) return toast('Enter your full name.', 'error');
        if (password.length < 8) return toast('Password must be at least 8 characters.', 'error');
        if (password !== confirmPassword) return toast('Passwords do not match.', 'error');

        setButtonLoading(btn, true, 'Creating account…');
        try {
            const { needsVerification } = await signUp({ fullName, email, password });
            if (needsVerification) {
                toast('Account created. Check your email to verify, then log in.', 'success', 6000);
                setTimeout(() => (window.location.href = 'login.html'), 2500);
            } else {
                window.location.href = 'onboarding.html';
            }
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    });
}

// ---------- LOGIN ----------
const loginForm = qs('#login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = qs('button[type="submit"]', loginForm);
        const email = qs('#email').value.trim();
        const password = qs('#password').value;

        setButtonLoading(btn, true, 'Signing in…');
        try {
            await logIn({ email, password });
            // Login succeeded — go straight to the dashboard. The dashboard
            // checks onboarding itself, so we don't block on anything here.
            window.location.replace('dashboard.html');
        } catch (err) {
            toast(err.message, 'error');
            setButtonLoading(btn, false);
        }
    });
}

// ---------- FORGOT PASSWORD ----------
const forgotForm = qs('#forgot-form');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = qs('button[type="submit"]', forgotForm);
        const email = qs('#email').value.trim();
        setButtonLoading(btn, true, 'Sending…');
        try {
            await sendPasswordReset(email);
            toast('If that email is registered, a reset link has been sent.', 'success', 6000);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    });
}

// ---------- RESET PASSWORD ----------
const resetForm = qs('#reset-form');
if (resetForm) {
    // Supabase detectSessionInUrl consumes the recovery link and creates a
    // temporary session; updateUser then sets the new password.
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = qs('button[type="submit"]', resetForm);
        const password = qs('#password').value;
        const confirmPassword = qs('#confirmPassword').value;
        if (password.length < 8) return toast('Password must be at least 8 characters.', 'error');
        if (password !== confirmPassword) return toast('Passwords do not match.', 'error');

        setButtonLoading(btn, true, 'Updating…');
        try {
            await updatePassword(password);
            toast('Password updated. You can now log in.', 'success', 5000);
            setTimeout(() => (window.location.href = 'login.html'), 2000);
        } catch (err) {
            toast('Reset link is invalid or expired. Request a new one.', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    });
}
