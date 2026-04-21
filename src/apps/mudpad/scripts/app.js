import {init} from "https://esm.sh/modern-monaco"
import {wrapify} from "https://esm.sh/@gesslar/wrapify"
import {notify, DisposerClass} from "/js/tk.js"
import {vsToMonaco} from "./vscode-theme-to-monaco.js"

export default class {
  #root
  #disposer
  #disposed = false
  #editor
  #history

  constructor(root) {
    this.#root = root
  }

  async #initializeEditor() {
    const container = this.#root.querySelector("#container")
    if(!container)
      return

    const monaco = await init()
    if(this.#disposed)
      return

    const themeUrl = new URL("../themes/blackboard.color-theme.json", import.meta.url)
    const vscodeTheme = await fetch(themeUrl).then(r => r.json())
    if(this.#disposed)
      return

    const monacoTheme = vsToMonaco(vscodeTheme)

    monaco.editor.defineTheme("blackboard", monacoTheme)

    this.#editor = monaco.editor.create(container, {
      value: "",
      language: "plaintext",
      theme: "blackboard",
      fontFamily: "Victor Mono, ui-monospace, monospace",
      glyphMargin: false,
      lineNumbers: "on",
      minimap: {enabled: false},
      overviewRulerBorder: false,
      overviewRulerLanes: 0,
      scrollBeyondLastLine: false,
      contextmenu: true,
      insertSpaces: true,
      renderLineHighlight: "none",
      quickSuggestions: false,
      wordBasedSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: "off",
      autoClosingBrackets: "never",
      wordWrap: "on",
      colorDecorators: false,
      folding: false,
      detectIndentation: false,
      fontLigatures: false,
      links: false,
      overtypeCursorStyle: "block",
      padding: {
        top: 10,
        bottom: 10,
      },
      placeholder: "Paste or type in any text, and then click Wrap It Up!",
      renderFinalNewline: "dimmed",
      renderWhitespace: "boundary",
      tabFocusMode: true,
      rulers: [80],
    })

    // A deactivate could have landed between `await` above and here; if so,
    // the disposer has already run so registering cleanup now would leak.
    // Tear the editor down directly instead.
    if(this.#disposed) {
      this.#editor.dispose()
      this.#editor = null

      return
    }

    this.#disposer.register(() => this.#editor?.dispose())

    // Escape blurs the editor to the Wrap button so keyboard users can Tab out.
    const wrapButton = this.#root.querySelector("#wrap")
    this.#editor.addCommand(monaco.KeyCode.Escape, () => wrapButton?.focus())

    const layout = () => {
      const {width, height} = container.getBoundingClientRect()
      this.#editor.layout({width, height})
    }

    layout()
    this.#editor.focus()

    const resizeObserver = new ResizeObserver(() => {
      if(this.#editor)
        layout()
    })

    resizeObserver.observe(container)
    this.#disposer.register(() => resizeObserver.disconnect())
  }

  #wrapIt() {
    if(!this.#editor || typeof wrapify !== "function")
      return

    this.#editor.setValue(wrapify(this.#editor.getValue(), 80, 0))
    this.#editor.focus()
    this.#saveSnapshot()
  }

  #saveSnapshot() {
    const text = this.#editor.getValue()

    if(!text.trim())
      return

    this.#history.save({
      summary: collapse(text, 100),
      data: {text},
    })
  }

  #recall({text}) {
    this.#editor?.setValue(text)
    this.#editor?.focus()
  }

  #handleKeyboardShortcuts(event) {
    if(event.ctrlKey && event.key.toLowerCase() === "e") {
      event.preventDefault()
      this.#editor?.focus()
    }
  }

  activate() {
    this.#disposed = false
    this.#disposer = new DisposerClass()
    this.#editor = null

    const wrapButton = this.#root.querySelector("#wrap")

    this.#history = this.#root.querySelector("mud-history")

    this.#disposer.register(
      notify.on("click", this.#wrapIt.bind(this), wrapButton),
      notify.on("keydown", this.#handleKeyboardShortcuts.bind(this), window),
      notify.on("recall", e => this.#recall(e.detail.data), this.#history),
    )

    this.#initializeEditor().catch(error => console.error("Failed to initialize Monaco", error))
  }

  deactivate() {
    this.#disposed = true
    this.#disposer?.dispose()
    this.#disposer = null
    this.#editor = null
    this.#history = null
  }
}

function collapse(text, maxLen) {
  const flat = text.replace(/\s+/g, " ").trim()

  return flat.length > maxLen
    ? flat.slice(0, maxLen - 1) + "…"
    : flat
}
