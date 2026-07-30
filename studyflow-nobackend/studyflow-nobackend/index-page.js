// Landing page: send signed-in users straight to the dashboard.
import { initTheme } from './ui.js';
import { getSession } from './auth-data.js';

initTheme();
getSession().then((session) => {
    if (session) window.location.href = 'dashboard.html';
});
