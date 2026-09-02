// index.js
//
// The shell pre-builds every app into its own hidden <section> under <main>
// at boot: CSS, HTML template, module, and app.activate() all run once so
// every app is fully populated and wired before the user touches anything.
// Navigating = deactivate outgoing, reset its section from template, hide it,
// show the target (already built + wired), then re-activate the outgoing in
// the background so it's fresh for the next visit.

import {apps, findApp} from "./apps.js"
import {setupNavigation, setActiveNav} from "./nav.js"
import "./mud-select.js"
import "./history.js"

const appTemplates = new Map()
const appSections = new Map()
const appInstances = new Map()

let currentSlug = null

function slugOf(appDef) {
  return appDef.folder || appDef.slug || "home"
}

function resolveHref(entry, folder) {
  return /^https?:\/\//.test(entry) ? entry : `/apps/${folder}/${entry}`
}

function loadStylesheet(href) {
  return new Promise(resolve => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    link.addEventListener("load", () => resolve(link), {once: true})
    link.addEventListener("error", () => resolve(link), {once: true})
    document.head.appendChild(link)
  })
}

function populateSection(section, template) {
  const clone = template.cloneNode(true)
  section.replaceChildren(...Array.from(clone.children))
}

function activateInBackground(slug) {
  const app = appInstances.get(slug)

  if(!app?.activate)
    return

  Promise.resolve().then(() => app.activate()).catch(e =>
    console.warn(`Activate failed for ${slug}:`, e)
  )
}

async function prepareApp(appDef) {
  const slug = slugOf(appDef)
  const {scripts = [], styles = []} = appDef

  const section = document.createElement("section")
  section.dataset.app = slug
  section.setAttribute("aria-label", appDef.name)
  section.hidden = true
  document.querySelector("main").appendChild(section)

  appSections.set(slug, section)

  await Promise.all(styles.map(e => loadStylesheet(resolveHref(e, slug))))

  scripts.forEach(e => {
    const element = document.createElement("script")
    element.type = "module"
    element.src = resolveHref(e, slug)
    document.head.appendChild(element)
  })

  const [response, mod] = await Promise.all([
    fetch(`/apps/${slug}/index.html`),
    import(`/apps/${slug}/scripts/app.js`).catch(e => {
      console.warn(`No app module for ${slug}:`, e)

      return null
    }),
  ])

  if(!response.ok) {
    console.warn(`Missing HTML for ${slug}: ${response.status}`)

    return
  }

  const html = await response.text()
  const parsed = new DOMParser().parseFromString(html, "text/html")
  appTemplates.set(slug, parsed.body)

  populateSection(section, parsed.body)

  if(mod?.default) {
    const instance = new mod.default(section)
    appInstances.set(slug, instance)

    try {
      await instance.activate?.()
    } catch(e) {
      console.warn(`Initial activate failed for ${slug}:`, e)
    }
  }
}

async function render(path) {
  const appDef = findApp(path)

  if(!appDef) {
    console.warn(`No app for path ${path}`)

    return
  }

  const slug = slugOf(appDef)

  if(slug === currentSlug)
    return

  const nextSection = appSections.get(slug)

  if(!nextSection)
    return

  const swap = () => {
    const currentSection = currentSlug ? appSections.get(currentSlug) : null
    const currentApp = currentSlug ? appInstances.get(currentSlug) : null
    const currentTemplate = currentSlug ? appTemplates.get(currentSlug) : null
    const leavingSlug = currentSlug

    try {
      currentApp?.deactivate?.()
    } catch(e) {
      console.warn(`Deactivate failed for ${currentSlug}:`, e)
    }

    if(currentSection) {
      if(currentTemplate)
        populateSection(currentSection, currentTemplate)

      currentSection.hidden = true
    }

    nextSection.hidden = false
    setActiveNav(path)
    document.title = `MUDtools - ${appDef.name}`
    currentSlug = slug

    if(leavingSlug)
      activateInBackground(leavingSlug)
  }

  if(document.startViewTransition)
    await document.startViewTransition(swap).finished
  else
    swap()
}

function navigate(path) {
  if(path === location.pathname && currentSlug)
    return

  history.pushState({}, "", path)
  render(path)
}

window.addEventListener("popstate", () => render(location.pathname))

document.addEventListener("click", e => {
  const a = e.target.closest("a[href]")

  if(a && a.origin === location.origin) {
    e.preventDefault()
    navigate(a.pathname)
  }
})

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation()
  await Promise.all(apps.map(prepareApp))
  render(location.pathname)
})
