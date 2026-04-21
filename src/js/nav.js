import {apps} from "./apps.js"

/**
 * Generates a navigation list from routes.
 */
function generateNav() {
  const nav = apps.map(app => {
    const {name, slug} = app

    return `<li><a href="/${slug}">${name}</a></li>`
  })

  return `<ul>${nav.join("")}</ul>`
}

/**
 * Sets up the navigation by generating and injecting the nav list into the DOM.
 */
export function setupNavigation() {
  const nav = generateNav()

  document.querySelector("nav").innerHTML = nav
}

/**
 * Marks the link matching `path` as the current page; clears the marker on others.
 */
export function setActiveNav(path) {
  const links = document.querySelectorAll("nav a")

  for(const link of links) {
    if(link.getAttribute("href") === path)
      link.setAttribute("aria-current", "page")
    else
      link.removeAttribute("aria-current")
  }
}
