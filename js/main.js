// This script is for SHARED functionality across all admin pages.

// Hamburger Menu Logic
const hamburgerMenu = document.getElementById('hamburger-menu');
const navPanel = document.getElementById('nav-panel');

if (hamburgerMenu && navPanel) {
    hamburgerMenu.addEventListener('click', () => {
        const isOpened = hamburgerMenu.getAttribute('aria-expanded') === 'true';
        hamburgerMenu.setAttribute('aria-expanded', !isOpened);
        hamburgerMenu.classList.toggle('open');
        navPanel.classList.toggle('open');
    });

    // Close menu if clicking outside of it
    document.addEventListener('click', (e) => {
        if (!hamburgerMenu.contains(e.target) && !navPanel.contains(e.target) && navPanel.classList.contains('open')) {
            hamburgerMenu.setAttribute('aria-expanded', 'false');
            hamburgerMenu.classList.remove('open');
            navPanel.classList.remove('open');
        }
    });
}

// Dev Log Copy Button
const copyLogBtn = document.getElementById('copy-log-btn');
if (copyLogBtn) {
    copyLogBtn.addEventListener('click', () => {
        const devLog = document.getElementById('dev-log');
        if (devLog && devLog.textContent) {
            navigator.clipboard.writeText(devLog.textContent)
                .then(() => console.log('Dev log copied to clipboard!'))
                .catch(err => console.error('Failed to copy dev log: ', err));
        }
    });
}