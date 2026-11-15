import {
  EVENTS,
  INSTRUMENT_MAP,
  LANDING_COPY,
  LAUNCHER_MAP,
  MISSION_MAP,
  ORBITS,
  PART_MAP,
} from './data.js'

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export function nextRand(seed) {
  let a = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, a >>> 0]
}

export function formatMoney(n) {
  return `$${Math.round(n)}M`
}

export function formatMass(n) {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? `${rounded} t` : `${rounded.toFixed(1)} t`
}

export function formatDv(n, signed = false) {
  const rounded = (Math.round(n * 100) / 100).toFixed(2)
  if (!signed) return `${rounded} km/s`
  const value = Number(rounded)
  if (value > 0) return `+${rounded} km/s`
  return `${rounded} km/s`
}

export function formatTwr(n) {
  return (Math.round(n * 100) / 100).toFixed(2)
}

export function partMass(part) {
  return part.dry + part.propellant
}

export function defaultDesign(missionId) {
  const mission = MISSION_MAP[missionId] || MISSION_MAP.selene
  const orbits = ORBITS[mission.id] || ORBITS.sandbox
  return {
    orbitId: orbits[0].id,
    launcherId: 'baseline',
    instrumentIds: [],
    crew: mission.crew,
    objective: mission.summary,
  }
}

export function evaluateDesign(mission, partIds, design) {
  const plan = { ...defaultDesign(mission.id), ...(design || {}) }
  const orbits = ORBITS[mission.id] || ORBITS.sandbox
  const orbit = orbits.find((item) => item.id === plan.orbitId) || orbits[0]
  const launcher = LAUNCHER_MAP[plan.launcherId] || LAUNCHER_MAP.baseline
  const instruments = (plan.instrumentIds || []).map((id) => INSTRUMENT_MAP[id]).filter(Boolean)
  const crew = mission.id === 'sandbox' ? clamp(Number(plan.crew) || 0, 0, 4) : mission.crew
  let cost = mission.base.cost + launcher.cost
  let dry = mission.base.dry + launcher.dry
  let propellant = mission.base.propellant
  let thrust = mission.base.thrust + launcher.thrust
  for (const id of partIds) {
    const part = PART_MAP[id]
    if (!part) continue
    cost += part.cost
    dry += part.dry
    propellant += part.propellant
    thrust += part.thrust
  }
  for (const instrument of instruments) {
    cost += instrument.cost
    dry += instrument.dry
  }
  const mass = dry + propellant
  const twr = mass > 0 ? thrust / mass : 0
  const dv = dry > 0 && mass > dry ? mission.base.ve * Math.log(mass / dry) : 0
  const ship = {
    cost,
    dry,
    propellant,
    mass,
    thrust,
    twr,
    dv,
    seats: mission.id === 'sandbox' ? 4 : mission.base.seats,
  }
  const dvRequired = mission.dvRequired + orbit.dvAdd
  const maxMass = mission.maxMass + launcher.massLimit
  const powerGen = Math.round(((crew > 0 ? 80 : 50) + (partIds.includes('solar') ? 60 : 0)) * orbit.sun)
  const powerUse = 20 + instruments.reduce((sum, item) => sum + item.power, 0)
  const comms = orbit.comms + (partIds.includes('computer') ? 5 : 0)
  const data = instruments.reduce((sum, item) => sum + item.data, 0)
  const fit = data <= 0 ? 1 : Math.min(1, comms / data)
  const powerFactor = powerGen >= powerUse ? 1 : 0.4
  const delivered = Math.round(
    instruments.reduce((sum, item) => sum + item.science, 0) * fit * powerFactor * orbit.science,
  )
  const profile = {
    ...mission,
    crew,
    dvRequired,
    maxMass,
    summary: plan.objective || mission.summary,
  }
  return {
    ship,
    mission: profile,
    orbit,
    launcher,
    instruments,
    powerGen,
    powerUse,
    comms,
    data,
    delivered,
    life: orbit.life,
    wear: orbit.wear,
    objective: plan.objective || mission.summary,
  }
}

export function computeShip(mission, partIds) {
  let cost = mission.base.cost
  let dry = mission.base.dry
  let propellant = mission.base.propellant
  let thrust = mission.base.thrust
  for (const id of partIds) {
    const part = PART_MAP[id]
    if (!part) continue
    cost += part.cost
    dry += part.dry
    propellant += part.propellant
    thrust += part.thrust
  }
  const mass = dry + propellant
  const twr = mass > 0 ? thrust / mass : 0
  const dv = dry > 0 && mass > dry ? mission.base.ve * Math.log(mass / dry) : 0
  return { cost, dry, propellant, mass, thrust, twr, dv, seats: mission.base.seats }
}

export function shipWarnings(mission, ship, partIds) {
  const confirm = []
  const notes = []
  if (ship.dv < mission.dvRequired) {
    confirm.push('Δv is below what the mission needs. The ship can run out of propellant on the way.')
  }
  if (mission.critical.includes('lander') && !partIds.includes('lander')) {
    confirm.push('Without a landing module, the descent becomes an impact.')
  }
  if (mission.critical.includes('heat') && !partIds.includes('heat')) {
    confirm.push(
      mission.id === 'ares'
        ? 'Without a heat shield, Mars entry eats the hull.'
        : 'Without a heat shield, reentry at 40,000 km/h has no survivors.',
    )
  }
  if (mission.warn.includes('radiation') && !partIds.includes('radiation') && mission.crew > 0) {
    notes.push('Without shielding, a solar storm forces the crew to stop the research.')
  }
  if (mission.warn.includes('solar') && !partIds.includes('solar')) {
    notes.push('Without panels, power on a long cruise sits at the edge of the batteries.')
  }
  return { confirm, notes }
}

export function hardFailures(mission, ship) {
  const blocks = []
  if (ship.cost > mission.budget) blocks.push('Over budget.')
  if (ship.mass > mission.maxMass) blocks.push('Over the mass limit.')
  if (ship.twr < 1.2) blocks.push('Not enough thrust to lift off.')
  if (ship.seats < mission.crew) blocks.push('Not enough seats for the crew.')
  return blocks
}

export function confidence(mission, ship, partIds) {
  let score = 67
  const margin = ship.dv - mission.dvRequired
  score += clamp(margin, -0.6, 0.9) * 16
  score += clamp((ship.twr - 1.2) / 1.6, 0, 1) * 10
  score += clamp(1 - ship.mass / mission.maxMass, 0, 0.45) * 10
  score += clamp(1 - ship.cost / mission.budget, 0, 0.5) * 8
  for (const id of mission.critical) {
    score += partIds.includes(id) ? 4.5 : -9
  }
  return Math.round(clamp(score, 6, 99))
}

function drawFrom(ids, count, rand) {
  const bag = [...ids]
  const picked = []
  let cursor = rand
  while (picked.length < count && bag.length) {
    const [roll, next] = nextRand(cursor)
    cursor = next
    const index = Math.floor(roll * bag.length)
    picked.push(bag.splice(index, 1)[0])
  }
  return [picked, cursor]
}

function bumpTime(time, step) {
  if (!time) return time
  if (time.startsWith('DAY')) {
    const day = Number(time.replace(/\D/g, ''))
    return `DAY ${String(day + step).padStart(2, '0')}`
  }
  return time
}

export function buildSteps(mission, seed) {
  let rand = seed >>> 0
  const steps = []
  const pools = mission.pools || {}
  const used = new Set()

  mission.script.forEach((token, index) => {
    if (token.burn) {
      steps.push({
        kind: 'burn',
        fraction: token.burn,
        time: token.time,
        phase: token.phase,
        label: token.label,
      })
      return
    }
    if (token.pool) {
      const available = (pools[token.pool] || []).filter((id) => {
        const event = EVENTS[id]
        if (!event || used.has(id)) return false
        if (event.crewed && mission.crew === 0) return false
        return true
      })
      const [picked, next] = drawFrom(available, token.n, rand)
      rand = next
      picked.forEach((id, offset) => {
        used.add(id)
        const event = EVENTS[id]
        const presentation = event.diary && mission.crew > 0 ? 'diary' : token.presentation || 'technical'
        const stamp = offset === 0 ? token.time : bumpTime(token.time, offset + 1)
        steps.push({
          kind: 'event',
          eventId: id,
          time: stamp,
          phase: token.phase,
          presentation,
          day: token.day ? (offset === 0 ? token.day : bumpTime(token.day, offset + 1)) : stamp,
          route: token.route || '',
          clock: token.clock || '08:40',
        })
      })
      return
    }
    const event = EVENTS[token.event]
    const presentation = event?.diary && mission.crew > 0 ? 'diary' : token.presentation || 'technical'
    steps.push({
      kind: 'event',
      eventId: token.event,
      time: token.time,
      phase: token.phase,
      presentation,
      day: token.day || token.time,
      route: token.route || '',
      clock: token.clock || '08:40',
      index,
    })
  })

  return { steps, rand }
}

export function eventView(eventId, missionId) {
  const event = EVENTS[eventId]
  if (eventId === 'landing') {
    const copy = LANDING_COPY[missionId] || LANDING_COPY.selene
    return { ...event, ...copy }
  }
  return event
}

export function failureChance(choice, run) {
  if (typeof choice.risk === 'function') {
    const raw = choice.risk(run)
    if (raw >= 1) return 1
    return clamp(raw, 0.05, 0.92)
  }
  let chance = choice.risk ?? 0
  if (choice.riskTwr) chance -= (run.twr - 1.5) * 0.18
  if (choice.riskBoosters && run.parts.includes('boosters')) chance -= 0.14
  return clamp(chance, 0.06, 0.9)
}

function resolveValue(value, run) {
  return typeof value === 'function' ? value(run) : value
}

function marginOf(run) {
  return run.dv - run.dvNeeded
}

export function createRun(mission, ship, partIds, seed, extras = {}) {
  const built = buildSteps(mission, seed)
  return {
    missionId: mission.id,
    parts: [...partIds],
    seed,
    rand: built.rand,
    steps: built.steps,
    index: 0,
    dv: ship.dv,
    dvNeeded: mission.dvRequired,
    dvGoal: mission.dvRequired,
    shipDv: ship.dv,
    twr: ship.twr,
    crew: mission.crew,
    wear: extras.wear || 1,
    brief: extras.brief || null,
    integrity: 100,
    oxygen: 100,
    science: extras.delivered || 0,
    log: extras.delivered
      ? [{ time: 'T+00:00:00', text: `Payload checked in. ${extras.delivered} science is already on the recorder.`, tone: 'good', beat: true }]
      : [],
    history: [],
    ended: null,
  }
}

function finish(run, success, cause) {
  const mission = MISSION_MAP[run.missionId]
  const copy = success ? successCopy(mission) : failureCopy(cause)
  const margin = marginOf(run)
  const progress = 1 - clamp(run.dvNeeded / (run.dvGoal || mission.dvRequired), 0, 1)
  let score = Math.round(run.integrity * 0.55 + run.science * 0.85 + Math.max(0, margin) * 46 + progress * 72)
  if (success) score += 86
  if ((run.crew ?? mission.crew) > 0) score += Math.round(run.oxygen * 0.12)
  score = Math.max(0, score)
  return {
    ...run,
    ended: {
      success,
      cause,
      title: copy.title,
      subtitle: copy.subtitle,
      text: copy.text,
      score,
      margin,
      science: run.science,
      integrity: run.integrity,
      oxygen: run.oxygen,
      goal: mission.scienceGoal,
      history: run.history,
      brief: run.brief || null,
    },
  }
}

function successCopy(mission) {
  if (mission.id === 'sentinela') {
    return {
      title: 'SUCCESS',
      subtitle: 'STABLE ORBIT',
      text: 'The climate satellite is on station, at 550 km. Earth gets a new eye on its own weather.',
    }
  }
  if (mission.id === 'ares') {
    return {
      title: 'SUCCESS',
      subtitle: 'BASE AWAKE',
      text: 'Four people spend the first night in Jezero. Mars stops being only a point in the sky.',
    }
  }
  if (mission.id === 'sandbox') {
    return {
      title: 'SUCCESS',
      subtitle: 'OBJECTIVE MET',
      text: 'The custom mission holds together. The trades you accepted are still in the numbers.',
    }
  }
  return {
    title: 'SUCCESS',
    subtitle: 'HOME AGAIN',
    text: 'The crew comes through reentry and down in one piece. The Moon is behind them. The data is not.',
  }
}

function failureCopy(cause) {
  if (cause === 'fuel') {
    return {
      title: 'FAILURE',
      subtitle: 'ADRIFT IN SPACE',
      text: 'The propellant ran out before the objective. The ship continues on an orbit with no way back.',
    }
  }
  if (cause === 'oxygen') {
    return {
      title: 'FAILURE',
      subtitle: 'THIN AIR',
      text: 'The oxygen runs out before the mission does. The crew does not answer the next call.',
    }
  }
  if (cause === 'landing') {
    return {
      title: 'FAILURE',
      subtitle: 'IMPACT',
      text: 'The landing does not find the ground. It finds the end of the mission. The signal is lost in the dust.',
    }
  }
  if (cause === 'reentry') {
    return {
      title: 'FAILURE',
      subtitle: 'BURNUP',
      text: 'Reentry consumes the capsule. Plasma enters where a shield should have been.',
    }
  }
  if (cause === 'skip') {
    return {
      title: 'FAILURE',
      subtitle: 'NO SECOND WINDOW',
      text: 'The capsule skips off the atmosphere and back into space. There is no propellant for another try.',
    }
  }
  return {
    title: 'FAILURE',
    subtitle: 'LOSS OF VEHICLE',
    text: 'The structure does not hold. Contact with the ship ends in the middle of the telemetry.',
  }
}

function killCheck(run, lethal) {
  if (run.integrity <= 0) return finish(run, false, lethal || 'integrity')
  const mission = MISSION_MAP[run.missionId]
  if ((run.crew ?? mission.crew) > 0 && run.oxygen <= 0) return finish(run, false, 'oxygen')
  if (run.dv < -0.001) return finish(run, false, 'fuel')
  return null
}

function applyFx(run, fx) {
  run.integrity = clamp(run.integrity + (fx.integrity || 0), 0, 100)
  run.oxygen = clamp(run.oxygen + (fx.oxygen || 0), 0, 100)
  run.science = Math.max(0, Math.round(run.science + (fx.science || 0)))
  run.dv += fx.dv || 0
}

function clockTax(run, step) {
  const mission = MISSION_MAP[run.missionId]
  const hard = mission.id === 'ares' ? 1.15 : mission.id === 'sentinela' ? 0.35 : 1
  const wear = run.wear || 1
  const crew = run.crew ?? mission.crew
  let dv = -0.02 * hard * wear
  let oxygen = 0
  let integrity = -1
  if (step.kind === 'burn') {
    dv -= 0.04 * hard * wear
    if (crew > 0) oxygen -= 3
    if (run.parts.includes('computer')) dv += 0.025 * hard
  } else if (step.presentation === 'diary' && crew > 0) {
    oxygen -= 5
    integrity -= 2
    if (!run.parts.includes('solar')) oxygen -= 3
    if (run.parts.includes('radiation')) integrity += 2
  } else {
    integrity -= 1
  }
  run.dv += dv
  run.oxygen = clamp(run.oxygen + oxygen, 0, 100)
  run.integrity = clamp(run.integrity + integrity, 0, 100)
  const bits = []
  if (Math.abs(dv) >= 0.005) bits.push(`correction ${dv.toFixed(2)} km/s`)
  if (oxygen) bits.push(`oxygen ${oxygen}`)
  if (integrity) bits.push(`integrity ${integrity}`)
  if (bits.length) {
    run.log = [
      ...run.log,
      {
        time: step.time,
        text: `Time passes. ${bits.join(' · ')}.`,
        tone: integrity < -1 || oxygen < -6 ? 'bad' : 'neutral',
      },
    ]
  }
  return killCheck(run)
}

export function advance(run) {
  let index = run.index + 1
  while (index < run.steps.length && run.steps[index].kind === 'burn') {
    const step = run.steps[index]
    const mission = MISSION_MAP[run.missionId]
    const cost = step.fraction * mission.dvRequired
    if (run.dv < cost - 0.001) {
      run.log = [
        ...run.log,
        {
          time: step.time,
          text: `${step.label} does not close. The tank runs dry before cutoff.`,
          tone: 'bad',
        },
      ]
      return finish(run, false, 'fuel')
    }
    run.dv -= cost
    run.dvNeeded = Math.max(0, run.dvNeeded - cost)
    run.log = [
      ...run.log,
      { time: step.time, text: `${step.label}. The engine cuts. Outside, the silence arrives all at once.`, tone: 'neutral' },
    ]
    const worn = clockTax(run, step)
    if (worn) return worn
    index += 1
  }
  if (index >= run.steps.length) return finish(run, true, null)
  const arrived = clockTax(run, run.steps[index])
  if (arrived) return arrived
  const margin = marginOf(run)
  if (margin < 0 && !run.log.some((line) => line.text.startsWith('Propellant margin'))) {
    run.log = [
      ...run.log,
      {
        time: run.steps[index].time,
        text: 'Propellant margin went negative. The next big burn may not close.',
        tone: 'bad',
      },
    ]
  }
  return { ...run, index }
}

function remember(run, step, event, choiceLabel, logText, tone) {
  run.history = [
    ...run.history,
    { time: step.time, phase: step.phase, title: event.short, choice: choiceLabel, outcome: logText },
  ]
  run.log = [...run.log, { time: step.time, text: `${event.short} — ${choiceLabel}. ${logText}`, tone, beat: true }]
}

export function applyChoice(original, choiceId) {
  if (original.ended) return original
  const step = original.steps[original.index]
  if (!step || step.kind !== 'event') return original
  const event = eventView(step.eventId, original.missionId)
  const choice = event.choices.find((item) => item.id === choiceId)
  if (!choice) return original
  if (choice.requires && !original.parts.includes(choice.requires)) return original

  const run = {
    ...original,
    parts: [...original.parts],
    log: [...original.log],
    history: [...original.history],
  }

  let logText
  let tone = choice.tone || 'neutral'
  if (choice.risk != null) {
    const [roll, next] = nextRand(run.rand)
    run.rand = next
    const chance = failureChance(choice, run)
    if (roll < chance) {
      applyFx(run, resolveValue(choice.failure, run) || {})
      logText = resolveValue(choice.logFailure, run)
      tone = 'bad'
    } else {
      applyFx(run, resolveValue(choice.success, run) || {})
      logText = resolveValue(choice.logSuccess, run)
      tone = 'good'
    }
  } else {
    const fx = resolveValue(choice.effects, run) || {}
    applyFx(run, fx)
    logText = resolveValue(choice.log, run)
  }

  if (choice.ends === 'retry-entry') {
    const dead = killCheck(run, choice.lethal)
    if (dead) {
      remember(dead, step, event, choice.label, logText, 'bad')
      dead.ended = { ...dead.ended, history: dead.history }
      return dead
    }
    if (!run.parts.includes('heat')) {
      logText = 'The second pass meets the same plasma. Without a shield, the capsule does not make it through.'
      remember(run, step, event, choice.label, logText, 'bad')
      run.integrity = 0
      return finish(run, false, 'reentry')
    }
    if (run.dv < 0.15) {
      logText = 'The capsule skips and falls back into space. No propellant is left for a second window.'
      remember(run, step, event, choice.label, logText, 'bad')
      return finish(run, false, 'skip')
    }
    logText = 'The capsule skips off the atmosphere, propellant remains, and the second pass goes through the fire.'
    remember(run, step, event, choice.label, logText, 'good')
    run.integrity = clamp(run.integrity - 6, 0, 100)
    const burned = killCheck(run, 'reentry')
    if (burned) return burned
    return finish(run, true, null)
  }

  remember(run, step, event, choice.label, logText, tone)
  const dead = killCheck(run, choice.lethal)
  if (dead) return dead
  return advance(run)
}

export function fuelPercent(run) {
  if (!run.shipDv) return 0
  return clamp((run.dv / run.shipDv) * 100, 0, 100)
}

export function currentEventNumber(run) {
  return run.steps.slice(0, run.index + 1).filter((step) => step.kind === 'event').length
}
