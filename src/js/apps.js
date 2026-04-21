// apps.js

const apps = [
  {
    name: "Home",
    slug: "",
    folder: "home",
    styles: [
      "styles/style.css",
    ]
  },

  {
    name: "MUDpad",
    slug: "mudpad",
    scripts: [],
    styles: [
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
      "styles/style.css",
    ]
  },

  {
    name: "Bloodjewel Calculator",
    slug: "bloodjewel-calculator",
    styles: [
      "styles/index.css"
    ]
  },

  {
    name: "ThreshTime",
    slug: "threshtime",
    styles: [
      "styles/style.css",
    ]
  },
]

/**
 * Finds a route by matching the needle against route slugs or normalized names.
 */
function findApp(needle) {
  if(!(needle && typeof needle === "string"))
    throw new TypeError(`Needle must be a non-empty string. Got ${needle}`)

  console.info("findApp", needle)

  return apps.find(e => `/${e.slug}` === needle)
}

export {
  apps,
  findApp,
}
