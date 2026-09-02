import {notify, DisposerClass, html} from "/js/tk.js"
import gems from "./gems.js"
import Calc from "./calc.js"

export default class {
  #root
  #disposer
  #gemDisposer
  #dialogDisposer
  #calc
  #maxGems = 12
  #activeDialog = null
  #lastTrigger = null

  constructor(root) {
    this.#root = root
  }

  activate() {
    this.#disposer = new DisposerClass()
    this.#gemDisposer = new DisposerClass()
    this.#dialogDisposer = new DisposerClass()
    this.#calc = new Calc(this.#root)
    this.#maxGems = 12
    this.#activeDialog = null
    this.#lastTrigger = null

    const showPasteStageButton = this.#root.querySelector("#showPasteStage")
    const showSaveStageButton = this.#root.querySelector("#showSaveStage")
    const resetGemsButton = this.#root.querySelector("#resetGems")
    const history = this.#root.querySelector("mud-history")

    this.#disposer.register(
      notify.on("click", evt => this.#showPasteStage(evt), showPasteStageButton),
      notify.on("click", evt => this.#showSaveStage(evt), showSaveStageButton),
      notify.on("click", evt => this.#calc.resetGems(evt), resetGemsButton),
      notify.on("recall", e => this.#recall(e.detail.data), history),
      () => this.#gemDisposer.dispose(),
      () => this.#dialogDisposer.dispose(),
      () => this.#calc.dispose(),
    )

    this.#createTable()
  }

  deactivate() {
    this.#disposer?.dispose()
    this.#disposer = null
    this.#gemDisposer = null
    this.#dialogDisposer = null
    this.#calc = null
    this.#activeDialog = null
    this.#lastTrigger = null
  }

  #showPasteStage() {
    if(this.#activeDialog)
      return

    this.#lastTrigger = document.activeElement

    const template = this.#root.querySelector("#pasteDialogTemplate")
    const fragment = template.content.cloneNode(true)
    const pasteDialog = fragment.querySelector("#pasteDialog")
    const pasteBox = fragment.querySelector("#pasteBox")
    const pasteButton = fragment.querySelector("#pasteButton")
    const cancelPasteButton = fragment.querySelector("#cancelpaste")

    const handleTrap = event => {
      if(event.key !== "Tab")
        return

      const focusables = pasteDialog.querySelectorAll(
        "button, textarea, [href], input, select, [tabindex]:not([tabindex='-1'])"
      )
      const focusArray = Array.from(focusables)
        .filter(el => !el.disabled && el.tabIndex !== -1)

      if(focusArray.length === 0)
        return

      const first = focusArray[0]
      const last = focusArray[focusArray.length - 1]

      if(event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if(!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    this.#dialogDisposer.dispose()
    this.#dialogDisposer = new DisposerClass()

    this.#dialogDisposer.register(
      notify.on("click", () => this.#paste(pasteDialog, pasteBox), pasteButton),
      notify.on("click", () => this.#hidePasteStage(pasteDialog, pasteBox), cancelPasteButton),
      notify.on("cancel", event => {
        event.preventDefault()
        this.#hidePasteStage(pasteDialog, pasteBox)
      }, pasteDialog),
      notify.on("close", () => this.#cleanupDialog(pasteDialog), pasteDialog),
      notify.on("keydown", handleTrap, pasteDialog),
    )

    this.#root.appendChild(pasteDialog)
    this.#activeDialog = pasteDialog

    pasteDialog.showModal()
    requestAnimationFrame(() => pasteDialog.classList.add("is-open"))
    pasteBox.focus()
  }

  #hidePasteStage(pasteDialog, pasteBox) {
    pasteBox.blur()
    pasteDialog.classList.remove("is-open")

    const finishClose = () => {
      pasteDialog.removeEventListener("transitionend", finishClose)
      if(pasteDialog.open)
        pasteDialog.close()
    }

    pasteDialog.addEventListener("transitionend", finishClose)
    setTimeout(finishClose, 250)
  }

  #cleanupDialog(pasteDialog) {
    this.#dialogDisposer.dispose()
    this.#dialogDisposer = new DisposerClass()
    pasteDialog.remove()
    this.#activeDialog = null
    if(this.#lastTrigger instanceof HTMLElement)
      this.#lastTrigger.focus()
  }

  #paste(pasteDialog, pasteBox) {
    const lines = pasteBox.value.split("\n")

    pasteBox.value = ""

    this.#hidePasteStage(pasteDialog, pasteBox)

    const {qualities, types} = gems
    const qualityRegex = qualities.join("|")
    const typeRegex = types.join("|")
    const gemRegex = new RegExp(`(?<quality>${qualityRegex}) (?<type>${typeRegex})`)
    const filtered = lines.filter(line => line.match(gemRegex))

    if(filtered.length > this.#maxGems) {
      this.#maxGems = filtered.length
      this.#createTable()
    }

    const selects = this.#root.querySelectorAll("mud-select")

    selects.forEach(el => el.value = "none")

    const gemData = filtered.map(el => {
      const {quality, type} = gemRegex.exec(el)?.groups ?? {}

      return {quality, type}
    })

    gemData.forEach((gem, index) => {
      if(index < this.#maxGems) {
        const qualitySelect = selects[index * 2]
        const typeSelect = selects[index * 2 + 1]

        qualitySelect.value = gem.quality
        typeSelect.value = gem.type
      }
    })

    this.#calc.gemUpdated()
  }

  #generateOptions(num) {
    const {qualities, types} = gems
    const qualityOptions = qualities.map(e => ({text: capitalize(e), value: e}))
    const typeOptions = types.map(e => ({text: capitalize(e), value: e}))

    const template = this.#root.querySelector("#gemTemplate")
    const root = template.content.cloneNode(true)
    const gemContainer = root.querySelector("div")
    gemContainer.id = `bloodjewel-select-${num}`

    const name = root.querySelector(".gem-name")
    name.textContent = `Bloodjewel ${num}`

    void[
      ["quality", qualityOptions],
      ["type", typeOptions]
    ].forEach(([select, opts]) => {
      const element = root.querySelector(`.${select}-select`)
      element.name = `${select}-select-${num}`
      element.setAttribute("aria-label", `Bloodjewel ${num} ${select}`)

      opts.forEach(el => {
        const opt = document.createElement("option")
        opt.value = el.value
        opt.text = el.text
        element.appendChild(opt)
      })

      this.#gemDisposer.register(
        notify.on("change", e => this.#calc.gemUpdated(e), element)
      )
    })

    return root
  }

  #createTable() {
    const stage = this.#root.querySelector("#gemStage")

    this.#gemDisposer.dispose()
    this.#gemDisposer = new DisposerClass()

    html.clearHTMLContent(stage)

    for(let num = 0; num < this.#maxGems; num++)
      stage.appendChild(this.#generateOptions(num + 1))
  }

  #showSaveStage() {
    if(this.#activeDialog)
      return

    this.#lastTrigger = document.activeElement

    const template = this.#root.querySelector("#saveDialogTemplate")
    const fragment = template.content.cloneNode(true)
    const saveDialog = fragment.querySelector("#saveDialog")
    const titleInput = fragment.querySelector("#saveTitle")
    const titleError = fragment.querySelector("#save-title-error")
    const saveButton = fragment.querySelector("#saveConfirm")
    const cancelSaveButton = fragment.querySelector("#cancelSave")

    const handleTrap = event => {
      if(event.key !== "Tab")
        return

      const focusables = saveDialog.querySelectorAll(
        "button, textarea, [href], input, select, [tabindex]:not([tabindex='-1'])"
      )
      const focusArray = Array.from(focusables)
        .filter(el => !el.disabled && el.tabIndex !== -1)

      if(focusArray.length === 0)
        return

      const first = focusArray[0]
      const last = focusArray[focusArray.length - 1]

      if(event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if(!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const submit = () => {
      const title = titleInput.value.trim()

      if(!title) {
        titleInput.setAttribute("aria-invalid", "true")
        titleError.textContent = "Enter a title before saving"
        titleInput.focus()

        return
      }

      this.#saveSnapshot(title)
      this.#hideSaveStage(saveDialog, titleInput)
    }

    this.#dialogDisposer.dispose()
    this.#dialogDisposer = new DisposerClass()

    this.#dialogDisposer.register(
      notify.on("click", submit, saveButton),
      notify.on("click", () => this.#hideSaveStage(saveDialog, titleInput), cancelSaveButton),
      notify.on("keydown", e => {
        if(e.key === "Enter") {
          e.preventDefault()
          submit()
        }
      }, titleInput),
      notify.on("input", () => {
        titleInput.removeAttribute("aria-invalid")
        titleError.textContent = ""
      }, titleInput),
      notify.on("cancel", event => {
        event.preventDefault()
        this.#hideSaveStage(saveDialog, titleInput)
      }, saveDialog),
      notify.on("close", () => this.#cleanupDialog(saveDialog), saveDialog),
      notify.on("keydown", handleTrap, saveDialog),
    )

    this.#root.appendChild(saveDialog)
    this.#activeDialog = saveDialog

    saveDialog.showModal()
    requestAnimationFrame(() => saveDialog.classList.add("is-open"))
    titleInput.focus()
  }

  #hideSaveStage(saveDialog, titleInput) {
    titleInput.blur()
    saveDialog.classList.remove("is-open")

    const finishClose = () => {
      saveDialog.removeEventListener("transitionend", finishClose)
      if(saveDialog.open)
        saveDialog.close()
    }

    saveDialog.addEventListener("transitionend", finishClose)
    setTimeout(finishClose, 250)
  }

  #saveSnapshot(title) {
    const selects = this.#root.querySelectorAll("mud-select")
    const numPairs = selects.length / 2
    const gems = []

    for(let i = 0; i < numPairs; i++) {
      const quality = selects[i * 2].value
      const type = selects[i * 2 + 1].value

      if(quality !== "none" && type !== "none")
        gems.push({quality, type})
    }

    if(gems.length === 0)
      return

    const history = this.#root.querySelector("mud-history")

    history.save({
      summary: title,
      data: {gems},
    })
  }

  #recall({gems}) {
    if(gems.length > this.#maxGems) {
      this.#maxGems = gems.length
      this.#createTable()
    }

    const selects = this.#root.querySelectorAll("mud-select")

    selects.forEach(el => el.value = "none")

    gems.forEach((gem, index) => {
      if(index < this.#maxGems) {
        selects[index * 2].value = gem.quality
        selects[index * 2 + 1].value = gem.type
      }
    })

    this.#calc.gemUpdated()
  }
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
