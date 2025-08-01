document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle-input');
  const currentTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  if (currentTheme === 'dark') {
    themeToggle.checked = true;
  }

  themeToggle.addEventListener('change', function(e) {
    const newTheme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Add animation class
    document.querySelector('.theme-toggle').classList.add('theme-changing');
    setTimeout(() => {
      document.querySelector('.theme-toggle').classList.remove('theme-changing');
    }, 300);
  });
});