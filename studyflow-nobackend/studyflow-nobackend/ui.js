// Shared UI helpers: toasts, theme, DOM shortcuts, button loading state.

export function qs(sel, root = document) {
    return root.querySelector(sel);
}
export function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
}

export function toast(message, type = 'info', timeout = 4000) {
    let host = document.querySelector('.toast-host');
    if (!host) {
        host = document.createElement('div');
        host.className = 'toast-host';
        document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-visible'));
    setTimeout(() => {
        el.classList.remove('toast-visible');
        setTimeout(() => el.remove(), 250);
    }, timeout);
}

export function setButtonLoading(btn, loading, loadingText = 'Please wait…') {
    if (!btn) return;
    if (loading) {
        btn.dataset.originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = loadingText;
    } else {
        btn.disabled = false;
        if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
}

export function initTheme() {
    const saved = localStorage.getItem('sf_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sf_theme', next);
}
