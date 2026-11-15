import { MISSION_MAP } from './data.js'
import { applyChoice, computeShip, createRun } from './sim.js'

export const SAVE_KEY = 'programa-icaro-v1'

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        hangar: state.hangar,
        archive: state.archive,
        settings: state.settings,
        active: state.active,
      }),
    )
  } catch {
    /* ignore quota */
  }
}

export function boot(saved) {
  return {
    screen: 'menu',
    missionId: 'selene',
    parts: [],
    run: null,
    report: null,
    fromArchive: false,
    confirm: false,
    pause: false,
    hangar: saved?.hangar ?? [],
    archive: saved?.archive ?? [],
    settings: { sound: saved?.settings?.sound !== false },
    active: saved?.active ?? null,
  }
}

function track(state) {
  if (state.screen === 'assembly') {
    return {
      ...state,
      active: { missionId: state.missionId, parts: state.parts, run: null },
    }
  }
  if (state.screen === 'voyage' || state.screen === 'launch') {
    return {
      ...state,
      active: { missionId: state.missionId, parts: state.parts, run: state.run },
    }
  }
  return state
}

function hangarEntry(mission, parts) {
  const ship = computeShip(mission, parts)
  return {
    id: `${mission.id}:${[...parts].sort().join(',')}`,
    missionId: mission.id,
    code: mission.code,
    parts: [...parts],
    cost: ship.cost,
    mass: ship.mass,
    dv: ship.dv,
    twr: ship.twr,
    savedAt: Date.now(),
  }
}

export function reducer(state, action) {
  switch (action.type) {
    case 'NEW':
      return { ...state, screen: 'mission', confirm: false, pause: false, fromArchive: false }
    case 'SELECT_MISSION':
      return {
        ...state,
        missionId: action.id,
        parts: action.id === state.missionId ? state.parts : [],
      }
    case 'TO_HANGAR':
      return track({ ...state, screen: 'assembly', confirm: false })
    case 'BACK_MISSIONS':
      return { ...state, screen: 'mission', confirm: false }
    case 'TOGGLE_PART': {
      const has = state.parts.includes(action.id)
      const parts = has ? state.parts.filter((id) => id !== action.id) : [...state.parts, action.id]
      return track({ ...state, parts })
    }
    case 'ASK_LAUNCH':
      return { ...state, confirm: true }
    case 'CANCEL_LAUNCH':
      return { ...state, confirm: false }
    case 'LAUNCH': {
      const mission = MISSION_MAP[state.missionId]
      const ship = computeShip(mission, state.parts)
      const run = createRun(mission, ship, state.parts, (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0)
      const entry = hangarEntry(mission, state.parts)
      const hangar = [entry, ...state.hangar.filter((item) => item.id !== entry.id)].slice(0, 8)
      return track({
        ...state,
        screen: 'launch',
        run,
        confirm: false,
        pause: false,
        hangar,
      })
    }
    case 'ENTER_FLIGHT':
      if (state.screen !== 'launch') return state
      return track({ ...state, screen: 'voyage' })
    case 'CHOOSE': {
      if (state.screen !== 'voyage' || !state.run || state.run.ended) return state
      const run = applyChoice(state.run, action.id)
      return track({ ...state, run, pause: false })
    }
    case 'OPEN_REPORT': {
      if (state.screen !== 'voyage' || !state.run?.ended) return state
      const mission = MISSION_MAP[state.missionId]
      const record = {
        id: Date.now(),
        missionId: state.missionId,
        code: mission.code,
        project: mission.project,
        date: new Date().toISOString(),
        ...state.run.ended,
      }
      return {
        ...state,
        screen: 'report',
        report: record,
        fromArchive: false,
        pause: false,
        active: null,
        archive: [record, ...state.archive].slice(0, 20),
      }
    }
    case 'PAUSE':
      return { ...state, pause: true }
    case 'RESUME':
      return { ...state, pause: false }
    case 'SAVE_MENU':
      return { ...state, screen: 'menu', pause: false, confirm: false }
    case 'ABORT':
      return { ...state, screen: 'menu', pause: false, confirm: false, run: null, active: null }
    case 'RETRY':
      return track({
        ...state,
        screen: 'assembly',
        run: null,
        report: null,
        fromArchive: false,
        confirm: false,
      })
    case 'OTHER_MISSION':
      return { ...state, screen: 'mission', report: null, fromArchive: false, confirm: false }
    case 'MENU':
      return { ...state, screen: 'menu', pause: false, confirm: false, fromArchive: false }
    case 'CONTINUE':
      if (!state.active) return state
      return {
        ...state,
        screen: state.active.run ? 'voyage' : 'assembly',
        missionId: state.active.missionId,
        parts: state.active.parts || [],
        run: state.active.run || null,
        pause: false,
        confirm: false,
      }
    case 'OPEN_HANGAR':
      return { ...state, screen: 'hangar' }
    case 'LOAD_SHIP': {
      const item = state.hangar.find((entry) => entry.id === action.id)
      if (!item) return state
      return track({
        ...state,
        screen: 'assembly',
        missionId: item.missionId,
        parts: [...item.parts],
        run: null,
        confirm: false,
      })
    }
    case 'OPEN_ARCHIVE':
      return { ...state, screen: 'archive', fromArchive: false }
    case 'OPEN_RECORD':
      return { ...state, screen: 'report', report: action.record, fromArchive: true }
    case 'OPEN_SETTINGS':
      return { ...state, screen: 'settings' }
    case 'TOGGLE_SOUND':
      return { ...state, settings: { ...state.settings, sound: !state.settings.sound } }
    case 'RESET_DATA':
      return { ...boot(null), screen: 'settings' }
    default:
      return state
  }
}
