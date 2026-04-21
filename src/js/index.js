// index.js

import {findApp} from "./apps.js"
import {setupNavigation, setActiveNav} from "./nav.js"
import {disposer} from "./tk.js"
import "./mud-select.js"
import "./history.js"

function navigate(path) {
  history.pushState({}, "", path)
  render(path)
}

let currentApp

async function render(path) {
  try {
    currentApp?.dispose?.()
    currentApp = null
    disposer.dispose()
    window.dispatchEvent(new CustomEvent("leaving"))
  } catch(e) {
    console.warn(e)
  }

  const appDefinition = findApp(path) ?? {}
  const {name, slug, folder: appFolder, scripts = [], styles = []} = appDefinition
  const folder = appFolder || slug || "home"

  setActiveNav(path)

  const response = await fetch(`/apps/${folder}/index.html`)

  if(!response.ok) {
    console.warn(`No app at /apps/${folder}/index.html (${response.status})`)

    return
  }

  const content = await response.text()
  const parsed = new DOMParser().parseFromString(content, "text/html")
  document.querySelector("main").replaceChildren(...parsed.body.children)

  // inject/replace scripts
  const existingScripts = document.querySelectorAll("script")
  existingScripts.forEach(e => {
    if(!e.hasAttribute("base"))
      e.parentElement.removeChild(e)
  })

  scripts.forEach(e => {
    const element = document.createElement("script")
    element.type = "module"
    element.src = e

    if(e.match(/^https?:\/\//))
      element.src = e
    else
      element.src = `/apps/${folder}/${e}`

    document.head.appendChild(element)
  })

  // inject/replace styles
  const existingStyles = document.querySelectorAll("link")
  existingStyles.forEach(e => {
    if(!e.hasAttribute("base"))
      e.parentElement.removeChild(e)
  })

  styles.forEach(e => {
    const element = document.createElement("link")
    element.rel = "stylesheet"

    if(e.match(/^https?:\/\//))
      element.href = e
    else
      element.href = `/apps/${folder}/${e}`

    document.head.appendChild(element)
  })

  document.title = `MUDtools - ${name}`

  // Now load the app class if available
  try {
    const appJs = await import(`/apps/${folder}/scripts/app.js`)
    if(appJs.default) {
      currentApp = new appJs.default()
      currentApp.boot()
    }
  } catch(e) {
    console.warn(e)
  }
}

// Back/forward
window.addEventListener("popstate", () => render(location.pathname))

// Intercept link clicks
document.addEventListener("click", e => {
  const a = e.target.closest("a[href]")
  if(a && a.origin === location.origin) {
    e.preventDefault()
    navigate(a.pathname)
  }
})

// Boot
document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("arrived", () => window.dispatchEvent(new CustomEvent("boot")))
  setupNavigation()
  render(location.pathname)
})
