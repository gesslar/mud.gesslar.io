const config = {
  epochStart: 631170000,
  startYear: 100,
  dayLength: 7200,
  monthLength: 216000,
  daysInMonth: 30,
  yearLength: 2592000,
  months: [
    "Dawn", "Cuspis", "Thawing", "Renasci",
    "Tempest", "Serenus", "Solaria", "Torrid",
    "Sojourn", "Hoerfest", "Twilight", "Deepchill"
  ],
  weekdays: [
    "Vidi", "Aubus", "Tikun", "Coronea",
    "Dashen", "Merida", "Solus", "Ganymor",
    "Dianis", "Misma", "Duskus", "Lunas"
  ],
  seasons: ["spring", "summer", "autumn", "winter"],
  monthsInSeasons: [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3],
  seasonProgress: [1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0],
  devotions: [
    "Vishnu", "Erosia", "Herastia", "Vivoria",
    "Tempest", "Silvanus", "Calypso", "Mortis",
    "Loviatar", "Belphegore", "Bast", "Gethsemane", "Set"
  ],
  voidDevotion: "The Void"
}

const stageFor = progress => {
  if(progress < 10)
    return "start"

  if(progress < 30)
    return "early"

  if(progress < 67)
    return "middle"

  if(progress < 90)
    return "late"

  return "end"
}

/**
 * Convert a real-world time into the Threshold in-character date/time.
 *
 * @param {Date|number} [when] - Date, ms since epoch, or unix seconds. Defaults to now.
 * @returns {object} IC date/time fields matching the old Glitch API shape.
 */
export const getTime = when => {
  let unixSeconds
  if(when === undefined)
    unixSeconds = Math.floor(Date.now() / 1000)
  else if(when instanceof Date)
    unixSeconds = Math.floor(when.getTime() / 1000)
  else if(when > 1e12)
    unixSeconds = Math.floor(when / 1000)
  else
    unixSeconds = Math.floor(when)

  const elapsed = unixSeconds - config.epochStart

  const year = config.startYear + Math.floor(elapsed / config.yearLength)
  const intoYear = elapsed % config.yearLength

  const month = 1 + Math.floor(intoYear / config.monthLength)
  const intoMonth = intoYear % config.monthLength

  const day = 1 + Math.floor(intoMonth / config.dayLength)

  const secondsIntoDay = elapsed % config.dayLength
  const scaledSeconds = (secondsIntoDay * 86400) / config.dayLength
  const hour = Math.floor(scaledSeconds / 3600)
  const minute = Math.floor((scaledSeconds % 3600) / 60)

  const monthIdx = month - 1
  const monthName = config.months[monthIdx]
  const season = config.seasons[config.monthsInSeasons[monthIdx]]

  const curProgress = day + config.daysInMonth * config.seasonProgress[monthIdx]
  const totalDaysInSeason = config.daysInMonth * 3
  const progress = Math.round((curProgress / totalDaysInSeason) * 100)
  const stage = stageFor(progress)

  const daysFromStart = config.daysInMonth * monthIdx + day
  const weekday = config.weekdays[(daysFromStart - 1) % config.weekdays.length]

  const devotionCycle = Math.floor(daysFromStart / 24)
  const devotion = devotionCycle >= config.devotions.length
    ? config.voidDevotion
    : config.devotions[devotionCycle]

  return {
    year, month, monthName, day,
    hour, minute, season, stage,
    weekday, devotion
  }
}
