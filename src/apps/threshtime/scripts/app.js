import {notify, DisposerClass} from "/js/tk.js"
import {getTime} from "./threshtime.js"

const formatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
}

export default class {
  #disposer = new DisposerClass()
  #els = {}

  boot() {
    const root = document.querySelector("#content")

    this.#els = {
      date: root.querySelector("#rldateinput"),
      time: root.querySelector("#rltimeinput"),
      convert: root.querySelector("#convert"),
      etOutput: root.querySelector("#etdatetimeoutput"),
      icOutput: root.querySelector("#icdatetimeoutput"),
      icMoreInfo: root.querySelector("#icmoreinfo"),
      copyEt: root.querySelector("#copyet"),
      copyIc: root.querySelector("#copyic"),
      history: document.querySelector("mud-history"),
    }

    this.#disposer.register(
      notify.on("click", () => {
        this.#updateTimes()
        this.#saveSnapshot()
        this.#flash(this.#els.convert)
      }, this.#els.convert),
      notify.on("click", () => {
        this.#copy(this.#els.etOutput)
        this.#flash(this.#els.copyEt)
      }, this.#els.copyEt),
      notify.on("click", () => {
        this.#copy(this.#els.icOutput)
        this.#flash(this.#els.copyIc)
      }, this.#els.copyIc),
      notify.on("recall", e => this.#recall(e.detail.data), this.#els.history),
    )

    this.#setCurrentDateTime()
  }

  #saveSnapshot() {
    const et = this.#els.etOutput.value
    const ic = this.#els.icOutput.value

    this.#els.history.save({
      summary: `${et} → ${ic}`,
      summaryHtml: `${et} <i class="codicon codicon-arrow-small-right" aria-hidden="true"></i> ${ic}`,
      data: {date: this.#els.date.value, time: this.#els.time.value},
    })
  }

  #recall({date, time}) {
    this.#els.date.value = date
    this.#els.time.value = time
    this.#updateTimes()
  }

  dispose() {
    this.#disposer.dispose()
  }

  #setCurrentDateTime() {
    const {month, day, year, hour, minute} = parseRLDate(new Date())

    this.#els.date.value = `${year}-${month}-${day}`
    this.#els.time.value = `${hour}:${minute}:00.000`

    this.#updateTimes()
  }

  #updateTimes() {
    const newDate = new Date(`${this.#els.date.value}T${this.#els.time.value}`)

    this.#updateEtOutput(newDate)
    this.#updateIcOutput(newDate)
  }

  #updateEtOutput(date) {
    const {month, day, year, hour, minute} = parseRLDate(date, "America/Toronto")

    this.#els.etOutput.value = `${year}-${month}-${day} ${hour}:${minute}`
  }

  #updateIcOutput(date) {
    const {monthName, day, year, hour, minute, weekday, stage, season, devotion} = getTime(date)

    this.#els.icOutput.value = `${monthName} ${day}, ${year} ${hour}:${pad(minute, 2)}`
    this.#els.icMoreInfo.innerText =
      `Weekday: ${weekday}\n` +
      `Season: ${capitalize(stage)} ${capitalize(season)}\n` +
      `Devotion: ${devotion}`
  }

  async #copy(input) {
    await navigator.clipboard.writeText(input.value)
  }

  #flash(button) {
    const group = button.closest(".group")

    if(!group)
      return

    group.classList.add("clicked")
    group.addEventListener("transitionend",
      () => group.classList.remove("clicked"),
      {once: true})
  }
}

function parseRLDate(date, timezone) {
  const options = {...formatOptions}

  if(timezone)
    options.timeZone = timezone

  const dateParts = new Intl.DateTimeFormat("en-US", options)
    .formatToParts(date)
    .filter(({type, value}) => type !== "literal" || value.match(/[0-9]+/))
    .map(({value}) => Number(value))
    .map(num => num < 10 ? `0${num}` : String(num))

  const [month, day, year, hour, minute] = dateParts

  return {month, day, year, hour, minute}
}

function pad(value, width) {
  const str = String(value)

  if(str.length >= width)
    return str

  return "0".repeat(width - str.length) + str
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
