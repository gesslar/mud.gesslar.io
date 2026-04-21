import {notify, DisposerClass, html} from "/js/tk.js"

const CACHE_TTL_MS = 5 * 60 * 1000
const USERNAME = "gesslar"
const PACKAGE_TOPICS = ["mudlet-package", "thresholdrpg"]

export default class {
  #root
  #disposer

  constructor(root) {
    this.#root = root
  }

  async activate() {
    this.#disposer = new DisposerClass()
    await this.#loadPackages()
  }

  deactivate() {
    this.#disposer?.dispose()
    this.#disposer = null
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

    const installIcon = document.createElement("i")
    installIcon.className = "codicon codicon-package icon-link"
    installIcon.setAttribute("role", "button")
    installIcon.setAttribute("tabindex", "0")
    installIcon.setAttribute("aria-label", `Copy install command for ${link.textContent}`)
    installIcon.dataset.packageLink = link.href

    this.#disposer.register(
      notify.on("click", e => this.#clickInstall(e), installIcon),
      notify.on("keydown", e => {
        if(e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          this.#clickInstall(e)
        }
      }, installIcon),
    )

    li.appendChild(installIcon)

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
    const install = `lua installPackage("${element.dataset.packageLink}")`

    await navigator.clipboard.writeText(install)
    element.classList.add("clicked")

    notify.on("transitionend", e => {
      e.currentTarget.classList.remove("clicked")
    }, element, {once: true})
  }
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

  const topicsQuery = topics.map(t => `topic:${encodeURIComponent(t)}`).join("+")
  const url = `https://api.github.com/search/repositories?q=user:${encodeURIComponent(username)}+${topicsQuery}`

  const response = await fetch(url)

  if(!response.ok) {
    console.error(`GitHub API error: ${response.status} ${response.statusText}`)

    return []
  }

  const data = await response.json()
  const repos = data.items.map(repo => ({
    name: repo.name,
    description: repo.description || "No description provided",
    html_url: repo.html_url,
  }))

  writeCache(cacheKey, repos)

  return repos
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
