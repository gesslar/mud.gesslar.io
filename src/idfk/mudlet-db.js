// Fetch and display the script
async function loadScript() {
  try {
    const response = await fetch('idfk/mudlet-db.sh');
    const text = await response.text();
    const lines = text.split('\n');
    const numberedLines = lines.map((line, index) => {
      const lineNum = String(index + 1).padStart(3, ' ');
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<span class="line-number">${lineNum}</span>${escapedLine}`;
    }).join('\n');
    document.getElementById('script-content').innerHTML = numberedLines;
  } catch (error) {
    document.getElementById('script-content').textContent = 'Error loading script: ' + error.message;
  }
}

// Copy script to clipboard
async function copyScript() {
  try {
    const response = await fetch('idfk/mudlet-db.sh');
    const text = await response.text();
    await navigator.clipboard.writeText(text);
    showToast();
  } catch (error) {
    console.error('Failed to copy script:', error);
    alert('Failed to copy script to clipboard');
  }
}

// Show toast notification
function showToast() {
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// Copy curl command to clipboard
async function copyCurlCommand() {
  const command = 'bash <(curl -fsSL https://mud.gesslar.dev/idfk/mudlet-db.sh)';
  try {
    await navigator.clipboard.writeText(command);
    const toast = document.getElementById('toast');
    toast.textContent = 'Install command copied to clipboard!';
    showToast();
  } catch (error) {
    console.error('Failed to copy command:', error);
    alert('Failed to copy command to clipboard');
  }
}

// Load script on page load
loadScript();
