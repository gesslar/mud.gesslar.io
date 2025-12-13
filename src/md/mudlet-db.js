// Fetch and display the script
async function loadScript() {
  try {
    const response = await fetch("mudlet-db.sh")
    const text = await response.text()

    // Highlight the code
    const highlighted = window.hljs.highlight(text, {language: "bash"}).value

    // Split into lines and add line numbers
    const lines = highlighted.split("\n")
    const numberedLines = lines.map((line, index) => {
      const lineNum = String(index + 1).padStart(3, " ")

      return `<span class="line-number">${lineNum}</span>${line}`
    }).join("\n")

    document.getElementById("script-content").innerHTML = numberedLines
  } catch(error) {
    document.getElementById("script-content").textContent = "Error loading script: " + error.message
  }
}

// Copy script to clipboard
async function copyScript() {
  try {
    const response = await fetch("mudlet-db.sh")
    const text = await response.text()
    await navigator.clipboard.writeText(text)
    showToast()
  } catch(error) {
    console.error("Failed to copy script:", error)
    alert("Failed to copy script to clipboard")
  }
}

// Show toast notification
function showToast() {
  const toast = document.getElementById("toast")
  toast.classList.add("show")
  setTimeout(() => {
    toast.classList.remove("show")
  }, 2000)
}

// Copy curl command to clipboard
async function copyCurlCommand() {
  const command = "bash <(curl -fsSL https://mud.gesslar.dev/md/mudlet-db.sh)"
  try {
    await navigator.clipboard.writeText(command)
    const toast = document.getElementById("toast")
    toast.textContent = "Install command copied to clipboard!"
    showToast()
  } catch(error) {
    console.error("Failed to copy command:", error)
    alert("Failed to copy command to clipboard")
  }
}

// Toggle script visibility
function toggleScript() {
  const wrapper = document.getElementById("script-content-wrapper")
  const button = document.querySelector(".toggle-script")

  wrapper.classList.toggle("show")

  if(wrapper.classList.contains("show")) {
    button.textContent = "Hide Script"
  } else {
    button.textContent = "Show Script"
  }
}

// Load script on page load
loadScript()
