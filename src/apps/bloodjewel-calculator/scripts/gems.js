export default {
  diminishing_factor: 2,

  qualities: [
    "raw",
    "rough",
    "uncut",
    "flawed",
    "imperfect",
    "polished",
    "flawless",
    "perfect",
    "luminous",
    "wondrous",
  ],

  types: [
    "bellicose",
    "catalytic",
    "cerebral",
    "devout",
    "ensorcelled",
    "enthralling",
    "fanatical",
    "mercantile",
    "necromantic",
    "perfidious",
    "savage",
  ],

  gems: {
    bellicose: [
      {
        title: "Max HP",
        name: "max_health", values: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
      },
      {
        title: "Natural AC",
        name: "natural_armor", values: [0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
      }
    ],
    catalytic: [
      {
        title: "Threat Generation",
        name: "threat_generation", values: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
      },
      {
        title: "Elemental Resist",
        name: "elemental_resist", values: [2, 3, 3, 4, 4, 5, 5, 6, 6, 7],
        notation: "R",
      }
    ],
    cerebral: [
      {
        title: "SP Regen",
        name: "sp_regen", values: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
      },
      {
        title: "Intelligence",
        name: "intelligence", values: [0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
      }
    ],
    devout: [
      {
        title: "HP Regen",
        name: "hp_regen", values: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
      },
      {
        title: "Wisdom",
        name: "wisdom", values: [0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
      }
    ],
    ensorcelled: [
      {
        title: "Max SP",
        name: "max_sp", values: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
      },
      {
        title: "Armor Penetration",
        name: "resist_armor", values: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
        notation: "R",
      }
    ],
    enthralling: [
      {
        title: "Max Tummy",
        name: "max_tummy", values: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
      },
      {
        title: "Luck",
        name: "luck", values: [0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
      }
    ],
    fanatical: [
      {
        title: "Max EP",
        name: "max_ep", values: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
      },
      {
        title: "Resist Physical",
        name: "resist_physical", values: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
        notation: "R",
      }
    ],
    mercantile: [
      {
        title: "Critical Strike Chance",
        name: "critical_strike", values: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
        notation: "%",
      },
      {
        title: "Rest Regen",
        name: "rest_regen", values: [0, 2, 2, 4, 4, 6, 6, 8, 8, 10],
      }
    ],
    necromantic: [
      {
        title: "EP Regen",
        name: "regen_ep", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      },
      {
        title: "Style Critical Chance",
        name: "critical_style", values: [0, 1, 2, 2, 3, 3, 4, 4, 5, 5],
        notation: "%",
      }
    ],
    perfidious: [
      {
        title: "Max EP",
        name: "max_ep", values: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
      },
      {
        title: "Threat Generation",
        name: "threat_generation", values: [-1, -1, -2, -2, -3, -3, -4, -4, -5, -5],
      }
    ],
    savage: [
      {
        title: "EP Regen",
        name: "regen_ep", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      },
      {
        title: "Style Critical Chance",
        name: "critical_style", values: [0, 1, 2, 2, 3, 3, 4, 4, 5, 5],
        notation: "%",
      }
    ]
  }
}
