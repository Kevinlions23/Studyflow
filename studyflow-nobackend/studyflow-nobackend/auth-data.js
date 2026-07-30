// All Supabase Auth + profile operations, straight from the browser.
// RLS on the database keeps every user scoped to their own rows.
import { supabase } from './supabase-client.js';

// ---------- session ----------
export async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export async function getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

export async function requireLogin() {
    const session = await getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session;
}

// ---------- auth actions ----------
export async function signUp({ fullName, email, password }) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/login.html`,
        },
    });
    if (error) throw new Error(error.message);
    return { needsVerification: !data.session, session: data.session };
}

export async function logIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
}

export async function logOut() {
    await supabase.auth.signOut();
}

export async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`,
    });
    // Don't reveal whether the email exists.
    if (error) console.warn('reset error:', error.message);
}

export async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
}

// ---------- profile ----------
// Wraps any promise so it rejects after `ms` instead of hanging forever.
// A stuck network or auth call should surface as an error, not a frozen UI.
function withTimeout(promise, ms = 8000, label = 'request') {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out: ${label}`)), ms)
        ),
    ]);
}

export async function getProfile() {
    const user = await withTimeout(getUser(), 8000, 'get user');
    if (!user) return null;

    // maybeSingle() returns null instead of throwing when no row exists.
    const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        8000,
        'load profile'
    );
    if (error) throw new Error(error.message);

    // Self-heal: if this user has no profile row yet (e.g. signed up before
    // the trigger existed), create one now.
    if (!data) {
        const { data: created, error: insertErr } = await withTimeout(
            supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                })
                .select()
                .single(),
            8000,
            'create profile'
        );
        if (insertErr) throw new Error(insertErr.message);
        return created;
    }
    return data;
}

export async function updateProfile(updates) {
    const user = await getUser();
    if (!user) throw new Error('Not signed in.');
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function completeOnboarding(answers) {
    return updateProfile({ ...answers, onboarding_complete: true });
}

// Changing email sends a confirmation link to the NEW address; the change
// only applies after the user clicks it. Supabase handles the verification.
export async function updateEmail(newEmail) {
    const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/login.html` }
    );
    if (error) throw new Error(error.message);
}
