/*
 * Theme Management
 * Handles dark/light mode toggling and persistence
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const lightIcon = themeToggleBtn.querySelector('.light-icon');
    const darkIcon = themeToggleBtn.querySelector('.dark-icon');
    
    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('api-nexus-theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    
    // Set initial theme
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        setTheme('light');
    } else {
        setTheme('dark');
    }
    
    // Toggle theme on button click
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        
        // Show toast notification
        if (window.showToast) {
            window.showToast(`Theme changed to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'sun');
        }
    });
    
    function setTheme(themeName) {
        if (themeName === 'light') {
            document.body.setAttribute('data-theme', 'light');
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'block';
        } else {
            document.body.removeAttribute('data-theme');
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            lightIcon.style.display = 'block';
            darkIcon.style.display = 'none';
        }
        
        localStorage.setItem('api-nexus-theme', themeName);
    }
});
