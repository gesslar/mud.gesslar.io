import * as TK from "https://esm.sh/@gesslar/toolkit@3.34.0"

const {HTML, Notify} = TK

/**
 * Fetch dynamic repositories from GitHub based on multiple topics.
 *
 * @param {string} username - GitHub username.
 * @param {Array<string>} topics - Array of topics to include in the search.
 * @returns {Promise<Array<object>>} - Array of repository objects.
 */
async function fetchGitHubRepositories(username, topics) {
  const topicsQuery = topics.map(topic => `topic:${encodeURIComponent(topic)}`).join("+")
  const url = `https://api.github.com/search/repositories?q=user:${encodeURIComponent(username)}+${topicsQuery}`
  const response = await fetch(url)
  if(!response.ok) {
    console.error(`GitHub API error: ${response.status} ${response.statusText}`)

    return []
  }

  const data = await response.json()

  /**
   * @param {object} repo
   * @returns {object}
   */
  return data.items.map(repo => ({
    name: repo.name,
    description: repo.description || "No description provided",
    html_url: repo.html_url
  }))
}

/**
 * Get all current packages from the list.
 * This includes both static and dynamic packages.
 *
 * @returns {Array<object>} - Array of package objects.
 */
function getCurrentPackages() {
  const packageList = document.querySelector("#package-list")
  const packageItems = packageList.querySelectorAll("li")
  const packages = []

  packageItems.forEach(item => {
    const link = item.querySelector("a")
    const name = link.textContent.replace(".mpackage", "")
    const descriptionMatch = item.textContent.match(/\(([^)]+)\)/)
    const description = descriptionMatch ? descriptionMatch[1] : "No description provided"
    const isStatic = item.getAttribute("data-static") === "true"
    const html_url = isStatic ? null : link.href
    packages.push({name, description, html_url, isStatic})
  })

  return packages
}

/**
 * Display repositories in a specified list element.
 *
 * @param {Array<object>} repositories - Array of repository objects.
 * @param {HTMLUListElement} list - The HTMLUListElement to populate.
 * @param {string | () => string} linkPrefix - The prefix to be added to the repository name to form the download URL.
 * @param {boolean} isPackage - Flag indicating if the repositories are packages (affects URL generation).
 */
function displayRepositories(
  repositories,
  list,
  linkPrefix,
  isPackage = false) {

  repositories.sort((a, b) => a.name.localeCompare(b.name))
  HTML.clearHTMLContent(list)

  repositories.forEach(repo => {
    const listItem = document.createElement("li")
    const link = document.createElement("a")
    const cleanedName = repo.name.replace(/_/g, " ")

    link.href = linkPrefix(repo)

    link.textContent = cleanedName
    listItem.appendChild(link)
    listItem.append(` (${repo.description}) `)

    if(isPackage && repo.html_url) {
      const packageIcon = document.createElement("span")
      packageIcon.classList.add("icon")
      packageIcon.classList.add("icon-link")
      packageIcon.classList.add("material-symbols-outlined")
      packageIcon.textContent = "package_2"
      packageIcon.dataset.packageLink = link.href

      Notify.on("click", clickPackage, packageIcon)

      const packageLink = document.createElement("span")
      packageLink.append(packageIcon)
      listItem.append(packageLink)
    }

    if(repo.html_url) {
      const githubIcon = document.createElement("img")
      githubIcon.setAttribute("src", "img/line-md--github-loop.svg")
      githubIcon.classList.add("icon")

      const iconLink = document.createElement("a")
      iconLink.href = repo.html_url
      iconLink.target = "_blank"
      iconLink.className = "github-icon-link"

      iconLink.appendChild(githubIcon)
      listItem.appendChild(iconLink)
    }

    list.appendChild(listItem)
  })
}

/**
 * Combine static and dynamic packages/tools and display them.
 */
async function loadPackages() {
  const username = "gesslar"
  const packageTopics = ["mudlet-package", "thresholdrpg"]
  const toolsTopics = ["mud-tools"]

  const dynamicPackages = await fetchGitHubRepositories(username, packageTopics)
  const dynamicTools = await fetchGitHubRepositories(username, toolsTopics)

  const staticPackages = getCurrentPackages().filter(pkg => pkg.isStatic)
  const allPackages = [...staticPackages, ...dynamicPackages]

  const packageList = document.querySelector("#package-list")
  const toolsList = document.querySelector("#tools-list")

  displayRepositories(allPackages, packageList , p => `https://github.com/gesslar/${p.name}/releases/latest/download/${p.name}.mpackage`, true)
  displayRepositories(dynamicTools, toolsList, p => `https://${p.name}/`)
}

/**
 * Click handler for the package span item thing.
 *
 * @param {Event} evt - The event of click
 */
async function clickPackage(evt) {
  const element = evt.currentTarget
  const link = element.dataset.packageLink
  const install = `lua installPackage("${link}")`
  await navigator.clipboard.writeText(install)
  element.classList.toggle("clicked")
  Notify.on("transitionend", evt => {
    evt.currentTarget.classList.toggle("clicked")
  }, element, {once: true})
}

Notify.on("DOMContentLoaded", loadPackages)
