import {Time} from "/js/tk.js"
import gems from "./gems.js"

export default class Calc {
  #selectedGems = []
  #effects = {}
  #pending = null

  get output() {
    return document.querySelector("#outputStage")
  }

  get selects() {
    return document.querySelectorAll("mud-select")
  }

  gemUpdated() {
    if(this.#pending)
      return

    this.#pending = Time.after(50, () => {
      this.#pending = null
      this.output.innerHTML = ""
      this.#toggleOutput(false)

      this.buildSelectedGems()
      this.generateEffects()
      this.floorValues()
      this.printEffects()
    })
  }

  resetGems(_evt) {
    this.#selectedGems.length = 0
    this.#effects = {}

    for(const select of this.selects) {
      select.selectedIndex = 0
    }

    this.gemUpdated()
  }

  buildSelectedGems() {
    const selects = document.querySelectorAll("mud-select")
    const numPairs = selects.length / 2

    this.#selectedGems.length = 0

    for(let i = 0; i < numPairs; i++) {
      const qualitySelect = selects[i * 2]
      const typeSelect = selects[i * 2 + 1]

      const gemQuality = qualitySelect.value
      const gemType = typeSelect.value

      const {qualities, types} = gems
      if(types.indexOf(gemType) === -1 || qualities.indexOf(gemQuality) === -1)
        continue

      this.#selectedGems.push({
        type: gemType,
        quality: qualities.indexOf(gemQuality)
      })
    }
  }

  generateEffects() {
    this.#effects = {}
    const allBonuses = {}

    this.#selectedGems.forEach(gem => {
      const {type, quality} = gem
      const bonuses = gems.gems[type]

      bonuses.forEach(bonus => {
        const {title, values, name, notation} = bonus
        if(!allBonuses[title]) {
          allBonuses[title] = {
            values: [],
            name: name,
            notation: notation || ""
          }
        }

        allBonuses[title].values.push(values[quality])
      })
    })

    Object.keys(allBonuses).forEach(title => {
      const values = allBonuses[title].values
      if(values.length === 0)
        return

      values.sort((a, b) => Math.abs(b) - Math.abs(a))

      const mainValue = values[0]
      let totalValue = mainValue

      if(values.length > 1) {
        const remainder = values.slice(1)
        const remainderSum = remainder.reduce((acc, val) => acc + val, 0)
        const diminishedSum = remainderSum / gems.diminishing_factor

        totalValue += diminishedSum
      }

      if(!this.#effects[title]) {
        this.#effects[title] = {
          value: 0,
          name: allBonuses[title].name,
          notation: allBonuses[title].notation
        }
      }

      this.#effects[title].value += totalValue
    })
  }

  floorValues() {
    for(const label in this.#effects) {
      this.#effects[label].value = Math.floor(this.#effects[label].value)
    }
  }

  printEffects() {
    const labels = Object.keys(this.#effects).sort()
    const hasEffects = labels.some(label => this.#effects[label].value !== 0)

    if(!hasEffects) {
      this.output.innerHTML = `<div class="effects-panel"><div class="effects-empty">No effects yet</div></div>`
      this.#toggleOutput(false)

      return
    }

    const items = labels
      .filter(label => this.#effects[label].value !== 0)
      .map(label => {
        const {value, notation} = this.#effects[label]

        return `<li class="effect-item"><span class="effect-name">${label}</span><span class="effect-value">${value}${notation}</span></li>`
      })
      .join("")

    this.output.innerHTML = `
      <div class="effects-panel" aria-label="Calculated effects summary">
        <div class="effects-title">Totals</div>
        <ul class="effects-list">
          ${items}
        </ul>
      </div>`
    this.#toggleOutput(true)
  }

  #toggleOutput(show) {
    const content = document.querySelector("#content")
    console.info(content)
    const output = this.output
    if(!content || !output)
      return

    if(show) {
      output.classList.remove("is-hidden")
      content.classList.add("with-output")
    } else {
      output.classList.add("is-hidden")
      content.classList.remove("with-output")
    }
  }

  dispose() {
    Time.cancel(this.#pending)
    this.#pending = null
  }
}
