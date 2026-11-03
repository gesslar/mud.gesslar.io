import {notify, DisposerClass, html} from "/js/tk.js"

const CACHE_TTL_MS = 5 * 60 * 1000
const USERNAME = "gesslar"
const PACKAGE_TOPICS = ["mudlet-package", "thresholdrpg"]
const MPKG_TOPIC = "mpkg"
const COPIED_FEEDBACK_MS = 1500
const COPY_TOOLTIP = "Click to copy and then paste into Mudlet's command line"

export default class {
  #root
  #disposer
  #copiedTimers = new WeakMap()
  #manualCopy = null

  constructor(root) {
    this.#root = root
  }

  async activate() {
    this.#disposer = new DisposerClass()
    this.#disposer.register(
      notify.on("click", e => this.#clickInstall(e), this.#root.querySelector("#install-mpkg")),
    )
    await this.#loadPackages()
  }

  deactivate() {
    this.#disposer?.dispose()
    this.#disposer = null
    this.#closeManualCopy()
  }

  async #loadPackages() {
    const list = this.#root.querySelector("#package-list")

    const dynamicPackages = await fetchGitHubRepositories(USERNAME, PACKAGE_TOPICS)
    const staticPackages = readStaticPackages(list)
    const allPackages = [...staticPackages, ...dynamicPackages]

    allPackages.sort((a, b) => a.name.localeCompare(b.name))

    html.clearHTMLContent(list)

    for(const repo of allPackages)
      list.appendChild(this.#renderPackage(repo))

    list.setAttribute("aria-busy", "false")
  }

  #renderPackage(repo) {
    const li = document.createElement("li")
    const text = document.createElement("span")
    text.className = "package-text"

    const link = document.createElement("a")
    link.href = `https://github.com/${USERNAME}/${repo.name}/releases/latest/download/${repo.name}.mpackage`
    link.textContent = repo.name.replace(/_/g, " ")

    text.appendChild(link)
    text.append(` (${repo.description}) `)
    li.appendChild(text)

    if(!repo.html_url)
      return li

    const installButton = repo.mpkg
      ? createMpkgButton(repo.name)
      : createPackageButton(link)

    installButton.type = "button"
    installButton.title = COPY_TOOLTIP
    installButton.dataset.packageName = repo.name

    this.#disposer.register(
      notify.on("click", e => this.#clickInstall(e), installButton),
    )

    li.appendChild(installButton)

    const githubLink = document.createElement("a")
    githubLink.href = repo.html_url
    githubLink.target = "_blank"
    githubLink.rel = "noopener noreferrer"
    githubLink.className = "icon-link"
    githubLink.setAttribute("aria-label", `Visit ${link.textContent} on GitHub`)

    const githubIcon = document.createElement("i")
    githubIcon.className = "codicon codicon-github"
    githubIcon.setAttribute("aria-hidden", "true")

    githubLink.appendChild(githubIcon)
    li.appendChild(githubLink)

    return li
  }

  async #clickInstall(evt) {
    const element = evt.currentTarget
    const {installCommand, packageName} = element.dataset

    this.#closeManualCopy()

    // Fails when the browser denies clipboard access, and on plain HTTP, where
    // navigator.clipboard does not exist at all.
    try {
      await navigator.clipboard.writeText(installCommand)
    } catch(error) {
      console.error(`Could not copy install command: ${error.message}`)
      this.#showManualCopy(element)

      return
    }

    this.#announce(`Install command for ${packageName} copied`)
    this.#showCopied(element)
  }

  #showManualCopy(element) {
    const box = createManualCopyBox(element.dataset.installCommand)
    const input = box.querySelector("input")

    const close = () => {
      this.#closeManualCopy()
      element.focus()
    }

    notify.on("click", close, box.querySelector("button"))
    notify.on("click", () => input.select(), input)
    notify.on("keydown", e => {
      if(e.key === "Escape")
        close()
    }, box)

    const row = element.closest("li")

    if(row)
      row.appendChild(box)
    else
      element.closest("p").after(box)

    this.#manualCopy = box

    input.focus()
    input.select()

    this.#announce(`Could not copy the install command for ${element.dataset.packageName}. It is selected in a text box, ready to copy by hand.`)
  }

  #closeManualCopy() {
    this.#manualCopy?.remove()
    this.#manualCopy = null
  }

  #showCopied(element) {
    clearTimeout(this.#copiedTimers.get(element))
    element.classList.add("copied")

    this.#copiedTimers.set(element, setTimeout(() => {
      element.classList.remove("copied")
    }, COPIED_FEEDBACK_MS))
  }

  #announce(message) {
    const status = this.#root.querySelector("#copy-status")
    status.textContent = ""
    requestAnimationFrame(() => status.textContent = message)
  }
}

function createPackageButton(link) {
  const button = document.createElement("button")
  button.className = "icon-link"
  button.setAttribute("aria-label", `Copy install command for ${link.textContent}`)
  button.dataset.installCommand = `lua installPackage("${link.href}")`

  const icon = document.createElement("i")
  icon.className = "codicon codicon-package"
  icon.setAttribute("aria-hidden", "true")
  button.append(icon, createCopiedLabel())

  return button
}

function createMpkgButton(name) {
  const command = `mpkg install ${name}`
  const button = document.createElement("button")
  button.className = "mpkg-command"
  button.setAttribute("aria-label", `${command}: copy to clipboard`)
  button.dataset.installCommand = command

  const commandLabel = document.createElement("code")
  commandLabel.className = "copy-label"
  commandLabel.textContent = command

  button.append(commandLabel, createCopiedLabel())

  return button
}

function createCopiedLabel() {
  const label = document.createElement("span")
  label.className = "copied-label"
  label.textContent = "Copied!"

  return label
}

function createManualCopyBox(command) {
  const box = document.createElement("div")
  box.className = "manual-copy"

  const message = document.createElement("p")
  message.textContent = "Couldn't copy that automatically. It's selected below, so press Ctrl+C (Cmd+C on a Mac), then paste it into Mudlet's command line."

  const input = document.createElement("input")
  input.type = "text"
  input.readOnly = true
  input.value = command
  input.setAttribute("aria-label", "Install command")

  const dismiss = document.createElement("button")
  dismiss.type = "button"
  dismiss.className = "copy-link"
  dismiss.textContent = "Dismiss"

  box.append(message, input, dismiss)

  return box
}

function readStaticPackages(list) {
  const items = list.querySelectorAll("li[data-static='true']")

  return Array.from(items).map(item => {
    const link = item.querySelector("a")
    const name = link.textContent.replace(".mpackage", "")
    const match = item.textContent.match(/\(([^)]+)\)/)
    const description = match ? match[1] : "No description provided"

    return {name, description, html_url: null, isStatic: true}
  })
}

async function fetchGitHubRepositories(username, topics) {
  const cacheKey = `mudtools.cache.github.${username}.${topics.join(",")}`
  const cached = readCache(cacheKey, CACHE_TTL_MS)

  if(cached)
    return cached

  // Scope by topic and filter to the owner client-side. A "user:" qualifier
  // cannot be used here: with a private GitHub profile, the search API rejects
  // user-scoped queries (422) even though the repos themselves stay public and
  // remain discoverable by topic.
  const results = await Promise.all(
    topics.map(topic => fetchRepositoriesByTopic(topic))
  )

  const byName = new Map()

  for(const repo of results.flat()) {
    if(repo.owner?.login?.toLowerCase() !== username.toLowerCase())
      continue

    byName.set(repo.name, {
      name: repo.name,
      description: repo.description || "No description provided",
      html_url: repo.html_url,
      mpkg: repo.topics?.includes(MPKG_TOPIC) ?? false,
    })
  }

  const repos = Array.from(byName.values())

  writeCache(cacheKey, repos)

  return repos
}

async function fetchRepositoriesByTopic(topic) {
  const url = `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}&per_page=100`

  const response = await fetch(url)

  if(!response.ok) {
    console.error(`GitHub API error for topic ${topic}: ${response.status} ${response.statusText}`)

    return []
  }

  const data = await response.json()

  return data.items
}

function readCache(key, ttlMs) {
  const raw = localStorage.getItem(key)

  if(!raw)
    return null

  try {
    const {timestamp, data} = JSON.parse(raw)

    if(Date.now() - timestamp > ttlMs)
      return null

    return data
  } catch {
    return null
  }
}

function writeCache(key, data) {
  localStorage.setItem(key, JSON.stringify({timestamp: Date.now(), data}))
}
