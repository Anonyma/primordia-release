document.querySelectorAll('.copy').forEach(button => {
  button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.target).textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    } catch {
      button.textContent = 'Select address to copy';
    }
  });
});
