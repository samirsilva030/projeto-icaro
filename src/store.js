import { MISSION_MAP, ROLES } from './data.js'
import { applyChoice, createRun, defaultDesign, evaluateDesign } from './sim.js'

export const SAVE_KEY = 'icarus-program-v2'

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
    design: defaultDesign('selene'),
    team: [],
    seat: 0,
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
  const board = {
    missionId: state.missionId,
    parts: state.parts,
    design: state.design,
    team: state.team,
    seat: state.seat,
  }
  if (state.screen === 'assembly' || state.screen === 'team') {
    return { ...state, active: { ...board, run: null } }
  }
  if (state.screen === 'voyage' || state.screen === 'launch') {
    return { ...state, active: { ...board, run: state.run } }
  }
  return state
}

function holds(state, role) {
  if (!state.team || state.team.length < 2) return true
  const owner = state.team.find((player) => player.role === role)
  if (!owner) return true
  return state.team[state.seat]?.role === role
}

function hangarEntry(mission, parts, design) {
  const profile = evaluateDesign(mission, parts, design)
  const instruments = [...(design.instrumentIds || [])].sort().join(',')
  return {
    id: `${mission.id}:${design.orbitId}:${design.launcherId}:${[...parts].sort().join(',')}:${instruments}:${design.crew}`,
    missionId: mission.id,
    code: mission.code,
    parts: [...parts],
    design,
    cost: profile.ship.cost,
    mass: profile.ship.mass,
    dv: profile.ship.dv,
    twr: profile.ship.twr,
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
        design: action.id === state.missionId ? state.design : defaultDesign(action.id),
        seat: 0,
      }
    case 'TO_TEAM':
      return track({ ...state, screen: 'team', confirm: false })
    case 'SET_TEAM':
      return track({ ...state, team: action.team.slice(0, 4), seat: 0 })
    case 'SET_SEAT':
      return { ...state, seat: action.seat }
    case 'TO_HANGAR':
      return track({ ...state, screen: 'assembly', confirm: false })
    case 'PATCH_DESIGN': {
      if (!holds(state, 'lead')) return state
      return track({ ...state, design: { ...state.design, ...action.patch } })
    }
    case 'TOGGLE_INSTRUMENT': {
      if (!holds(state, 'science')) return state
      const ids = state.design.instrumentIds || []
      const instrumentIds = ids.includes(action.id) ? ids.filter((id) => id !== action.id) : [...ids, action.id]
      return track({ ...state, design: { ...state.design, instrumentIds } })
    }
    case 'BACK_MISSIONS':
      return { ...state, screen: 'mission', confirm: false }
    case 'TOGGLE_PART': {
      if (!holds(state, 'craft')) return state
      const has = state.parts.includes(action.id)
      const parts = has ? state.parts.filter((id) => id !== action.id) : [...state.parts, action.id]
      return track({ ...state, parts })
    }
    case 'ASK_LAUNCH':
      if (!holds(state, 'lead')) return state
      return { ...state, confirm: true }
    case 'CANCEL_LAUNCH':
      return { ...state, confirm: false }
    case 'LAUNCH': {
      if (!holds(state, 'lead')) return state
      const mission = MISSION_MAP[state.missionId]
      const profile = evaluateDesign(mission, state.parts, state.design)
      const run = createRun(profile.mission, profile.ship, state.parts, (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0, {
        delivered: profile.delivered,
        wear: profile.wear,
        brief: {
          objective: profile.objective,
          orbit: profile.orbit.name,
          launcher: profile.launcher.name,
          instruments: profile.instruments.map((item) => item.name),
          power: `${profile.powerGen - profile.powerUse}`,
          data: `${profile.data}/${profile.comms}`,
          life: profile.life,
          team: state.team.map((player) => `${player.name} · ${ROLES.find((role) => role.id === player.role)?.title || player.role}`),
        },
      })
      const entry = hangarEntry(mission, state.parts, state.design)
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
        design: state.active.design || defaultDesign(state.active.missionId),
        team: state.active.team || [],
        seat: state.active.seat || 0,
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
        design: item.design || defaultDesign(item.missionId),
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
