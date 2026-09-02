// history.js — shared <mud-history> custom element.
//
// Each app drops <mud-history app-id="..."> below its main panel.
// Apps interact via:
//   const h = document.querySelector("mud-history")
//   h.save({summary: "...", data: {...}})  // persist a snapshot
//   notify.on("recall", e => {              // user clicked recall
//     const {data} = e.detail               // app rehydrates from data
//   }, h)
//
// Storage: localStorage keyed by app-id, capped at MAX_ENTRIES, newest first.
// Survives across browser sessions.

const MAX_ENTRIES = 20
const FLIP_DURATION_MS = 320
const FLIP_EASING = "cubic-bezier(0.175, 0.885, 0.32, 1.275)"

export default class MudHistory extends HTMLElement {
  #appId
  #entries = []
  #list
  #empty
  #clearButton
  #announcer

  connectedCallback() {
    if(this.#list)
      return

    this.#appId = this.getAttribute("app-id")

    if(!this.#appId)
      throw new Error("<mud-history> requires an app-id attribute")

    this.setAttribute("role", "region")
    this.setAttribute("aria-label", "Saved history")

    this.#load()
    this.#render()
    this.#bindEvents()
    this.#renderEntries()
  }

  save({summary, summaryHtml, data}) {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      summary,
      summaryHtml,
      data,
    }

    this.#entries.unshift(entry)

    if(this.#entries.length > MAX_ENTRIES)
      this.#entries.length = MAX_ENTRIES

    this.#persist()
    this.#renderEntries()
    this.#announce("History entry saved")
  }

  // Move an entry to the top, refresh its timestamp, and animate the move.
  // Used on recall so the most-recently-touched item bubbles up.
  touch(id) {
    const idx = this.#entries.findIndex(e => e.id === id)

    if(idx < 0)
      return

    const entry = this.#entries[idx]
    entry.timestamp = Date.now()

    if(idx > 0) {
      this.#entries.splice(idx, 1)
      this.#entries.unshift(entry)
    }

    this.#persist()
    this.#renderEntries({highlightId: id})
  }

  clear() {
    this.#entries = []
    this.#persist()
    this.#renderEntries()
    this.#announce("History cleared")
  }

  #render() {
    this.innerHTML = `
      <div class="mud-history__header">
        <h2 class="mud-history__title">History</h2>
        <button type="button" class="mud-history__clear" aria-label="Clear all saved history">Clear</button>
      </div>
      <p class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="mud-history__body">
        <p class="mud-history__empty">No history yet.</p>
        <ul class="mud-history__list" role="list"></ul>
      </div>
    `

    this.#list = this.querySelector(":scope > .mud-history__body > .mud-history__list")
    this.#empty = this.querySelector(":scope > .mud-history__body > .mud-history__empty")
    this.#clearButton = this.querySelector(":scope > .mud-history__header > .mud-history__clear")
    this.#announcer = this.querySelector(":scope > [role='status']")
  }

  #bindEvents() {
    this.#clearButton.addEventListener("click", () => {
      if(this.#entries.length === 0)
        return

      this.clear()
    })

    this.#list.addEventListener("click", e => {
      const button = e.target.closest("button[data-action]")

      if(!button)
        return

      const li = button.closest("li[data-id]")

      if(!li)
        return

      const entry = this.#entries.find(en => en.id === li.dataset.id)

      if(!entry)
        return

      if(button.dataset.action === "recall") {
        this.touch(entry.id)
        this.#announce("History entry recalled")
        this.dispatchEvent(new CustomEvent("recall", {
          detail: {
            id: entry.id,
            timestamp: entry.timestamp,
            summary: entry.summary,
            data: entry.data,
          },
          bubbles: true,
        }))
      } else if(button.dataset.action === "delete") {
        this.#entries = this.#entries.filter(en => en.id !== entry.id)
        this.#persist()
        this.#renderEntries()
        this.#announce("History entry deleted")
      }
    })
  }

  #renderEntries({highlightId} = {}) {
    const isEmpty = this.#entries.length === 0

    this.#empty.hidden = !isEmpty
    this.#list.hidden = isEmpty
    this.#clearButton.disabled = isEmpty

    if(isEmpty) {
      this.#list.innerHTML = ""

      return
    }

    // FIRST: capture each existing row's current top before we mutate.
    const oldTops = new Map()

    for(const li of this.#list.querySelectorAll(":scope > li[data-id]"))
      oldTops.set(li.dataset.id, li.getBoundingClientRect().top)

    this.#list.innerHTML = this.#entries.map(entry => `
      <li class="mud-history__entry" data-id="${escapeAttr(entry.id)}">
        <span class="mud-history__time">${escapeHtml(formatTime(entry.timestamp))}</span>
        <span class="mud-history__summary" title="${escapeAttr(entry.summary)}">${entry.summaryHtml ?? escapeHtml(entry.summary)}</span>
        <button type="button" class="mud-history__action" data-action="recall" aria-label="Recall ${escapeAttr(entry.summary)}">
          <i class="codicon codicon-arrow-up" aria-hidden="true"></i>
        </button>
        <button type="button" class="mud-history__action" data-action="delete" aria-label="Delete ${escapeAttr(entry.summary)}">
          <i class="codicon codicon-trash" aria-hidden="true"></i>
        </button>
      </li>
    `).join("")

    // LAST + INVERT + PLAY: animate any row whose position changed.
    for(const li of this.#list.querySelectorAll(":scope > li[data-id]")) {
      const oldTop = oldTops.get(li.dataset.id)

      if(oldTop !== undefined) {
        const delta = oldTop - li.getBoundingClientRect().top

        if(delta !== 0) {
          li.style.transform = `translateY(${delta}px)`
          li.style.transition = "none"

          requestAnimationFrame(() => {
            li.style.transition = `transform ${FLIP_DURATION_MS}ms ${FLIP_EASING}`
            li.style.transform = ""
            li.addEventListener("transitionend", () => {
              li.style.transition = ""
              li.style.transform = ""
            }, {once: true})
          })
        }
      }

      if(li.dataset.id === highlightId) {
        li.classList.add("mud-history__entry--recalled")
        li.addEventListener("animationend", () => {
          li.classList.remove("mud-history__entry--recalled")
        }, {once: true})
      }
    }
  }

  #load() {
    const raw = localStorage.getItem(this.#storageKey)

    if(!raw) {
      this.#entries = []

      return
    }

    try {
      const parsed = JSON.parse(raw)
      this.#entries = Array.isArray(parsed) ? parsed : []
    } catch {
      this.#entries = []
    }
  }

  #persist() {
    localStorage.setItem(this.#storageKey, JSON.stringify(this.#entries))
  }

  #announce(message) {
    this.#announcer.textContent = ""
    requestAnimationFrame(() => this.#announcer.textContent = message)
  }

  get #storageKey() {
    return `mudtools.history.${this.#appId}`
  }
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp))
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[c]))
}

function escapeAttr(s) {
  return String(s).replace(/["'&<>]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[c]))
}

customElements.define("mud-history", MudHistory)
