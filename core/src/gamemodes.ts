import type { GameMode } from "./types.ts";

export const gameModes: GameMode[] = [
  {
    code: "ffa",
    score: 1500,
    name: "Free For All",
    desc1: "Free For All",
    desc2: "",
    maps: [0],
    teams: false,
    killScoreMult: 1
  },
  {
    code: "tdm",
    score: 2200,
    name: "Team Deathmatch",
    desc1: "Eliminate the enemy team",
    desc2: "Eliminate the enemy team",
    maps: [0],
    teams: true,
    killScoreMult: 1
  },
  {
    code: "hp",
    score: 2400,
    name: "Hardpoint",
    desc1: "Capture and Hold the Hardpoint",
    desc2: "Capture and Hold the Hardpoint",
    maps: [0],
    teams: true,
    killScoreMult: 1
  },
  {
    code: "lc",
    score: 3000,
    name: "Lootcrate",
    desc1: "Collect the Lootcrates",
    desc2: "Collect the Lootcrates",
    maps: [0],
    teams: true,
    killScoreMult: 1
  },
  {
    code: "snipe",
    score: 1000,
    name: "Sniper War",
    desc1: "Hunt your Enemies",
    desc2: "Hunt your Enemies",
    maps: [0],
    teams: false,
    killScoreMult: 1
  },
  {
    code: "boss",
    score: 2000,
    name: "Boss Hunt",
    desc1: "Slay the Boss",
    desc2: "Destroy all Humans",
    maps: [0],
    teams: true,
    killScoreMult: 1
  },
  {
    code: "zmtch",
    score: 2500,
    name: "Zone War",
    desc1: "Enter the Enemy Zone",
    desc2: "Enter the Enemy Zone",
    maps: [0],
    teams: true,
    killScoreMult: 0.5
  },
  {
    code: "rckt",
    score: 1000,
    name: "Rocket War",
    desc1: "Blow them Up!",
    desc2: "Blow them Up!",
    maps: [0],
    teams: false,
    killScoreMult: 1
  }
]
