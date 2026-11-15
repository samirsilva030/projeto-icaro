import { useEffect, useRef, useState } from 'react'
import { EVENT_DESK, INSTRUMENTS, LAUNCHERS, MISSIONS, MISSION_MAP, ORBITS, PARTS, PART_MAP, ROLES, TRADEOFFS } from './data.js'
import {
  confidence,
  currentEventNumber,
  evaluateDesign,
  eventView,
  formatDv,
  formatMass,
  formatMoney,
  formatTwr,
  fuelPercent,
  hardFailures,
  shipWarnings,
} from './sim.js'
import { playBad, playGood, playTone } from './audio.js'
import { Cabin, ChoiceButton, PhaseNav, RocketView, Stars, Stat } from './ui.jsx'

const SHORT = {
  heat: 'Heat Shield',
  solar: 'Solar Panels',
  computer: 'Backup Computer',
  lander: 'Landing Module',
  radiation: 'Radiation Shielding',
  repair: 'Repair Kit',
  boosters: 'Side Boosters',
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now.toISOString().slice(11, 19)
}

function tagFor(part, mission) {
  if (mission.critical.includes(part.id)) return 'Essential'
  if (mission.id === 'sentinela' && ['heat', 'lander', 'radiation', 'repair'].includes(part.id)) return 'Little use here'
  return ''
}

export function Menu({ active, onNew, onContinue, onHangar, onArchive, onSettings }) {
  const clock = useClock()
  const [hover, setHover] = useState(0)
  const continueLabel = !active
    ? 'No saved progress'
    : active.run
      ? `${MISSION_MAP[active.missionId]?.code || 'MISSION'} · flight in progress`
      : `${MISSION_MAP[active.missionId]?.code || 'MISSION'} · assembly`
  const items = [
    { n: '01', title: 'NEW MISSION', sub: 'Plan, build, and launch', action: onNew },
    { n: '02', title: 'CONTINUE', sub: continueLabel, action: onContinue, disabled: !active },
    { n: '03', title: 'HANGAR', sub: 'Saved rockets', action: onHangar },
    { n: '04', title: 'MISSION ARCHIVE', sub: 'History and records', action: onArchive },
    { n: '05', title: 'SETTINGS', sub: 'Audio and saved data', action: onSettings },
  ]
  return (
    <div className="menu">
      <Stars />
      <div className="pad-scene" aria-hidden="true">
        <div className="tower" />
        <div className="gantry" />
        <div className="pad-rocket">
          <RocketView parts={['boosters', 'heat']} lit />
        </div>
        <div className="flood a" />
        <div className="flood b" />
        <div className="smoke" />
        <div className="ground" />
      </div>
      <div className="menu-copy">
        <p className="eyebrow">EXPERIMENTAL PROGRAMS DIVISION</p>
        <p className="kicker">SPACE MISSION SIMULATOR</p>
        <h1>
          ICARUS
          <br />
          <span>PROGRAM</span>
        </h1>
        <p className="lede">
          Plan the mission. Build the rocket. Launch. Every part you choose changes what can go right — or wrong — up there.
        </p>
        <ul className="menu-list">
          {items.map((item, index) => (
            <li key={item.n}>
              <button
                type="button"
                className={hover === index ? 'hot' : ''}
                disabled={item.disabled}
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onClick={item.action}
              >
                <em>{item.n}</em>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.sub}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="menu-meta">
        <span>UTC {clock}</span>
        <span className="go">STATUS: GO</span>
      </div>
    </div>
  )
}

export function MissionSelect({ missionId, onSelect, onHangar, onMenu }) {
  const mission = MISSION_MAP[missionId]
  return (
    <div className="grid-screen">
      <div className="frame">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onMenu}>
            ← MENU
          </button>
          <PhaseNav current={0} />
        </header>
        <p className="kicker">PHASE 01 · PLANNING</p>
        <h2 className="display">CHOOSE THE MISSION</h2>
        <p className="intro">Each mission sets your budget, the rocket’s maximum mass, and how much propellant you will need.</p>
        <div className="mission-grid">
          {MISSIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mission-card ${item.id === missionId ? 'on' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <div className={`planet planet-${item.id}`}>
                <span className="code">{item.code}</span>
                <span className="bars">
                  {[0, 1, 2].map((bar) => (
                    <i key={bar} className={bar < item.bars ? 'on' : ''} />
                  ))}
                </span>
              </div>
              <div className="mission-body">
                <p className="rank">
                  {item.phase} · {item.rank}
                </p>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <dl>
                  <div>
                    <dt>BUDGET</dt>
                    <dd>{formatMoney(item.budget)}</dd>
                  </div>
                  <div>
                    <dt>MAX MASS</dt>
                    <dd>{formatMass(item.maxMass)}</dd>
                  </div>
                  <div>
                    <dt>ΔV REQUIRED</dt>
                    <dd>{formatDv(item.dvRequired)}</dd>
                  </div>
                  <div>
                    <dt>CREW</dt>
                    <dd>{item.crew === 0 ? 'None' : item.crew}</dd>
                  </div>
                </dl>
              </div>
            </button>
          ))}
        </div>
      </div>
      <footer className="briefing">
        <div>
          <p className="kicker">BRIEFING · {mission.code}</p>
          <p>{mission.briefing}</p>
          <small>Estimated duration: {mission.duration}</small>
        </div>
        <button type="button" className="go-btn" onClick={onHangar}>
          GO TO THE HANGAR <span>›</span>
        </button>
      </footer>
    </div>
  )
}

function Check({ ok, label, value }) {
  return (
    <li className={ok ? 'ok' : 'bad'}>
      <i>{ok ? '✓' : '!'}</i>
      <span>{label}</span>
      <em>{value}</em>
    </li>
  )
}

function DesignPick({ tab, missionId, design, leadOk, scienceOk, onPatch, onInstrument }) {
  if (tab === 'orbit') {
    const orbits = ORBITS[missionId] || ORBITS.sandbox
    return (
      <div className="included">
        <p className="panel-note">{leadOk ? 'ORBIT · THE LEAD CHOOSES' : 'MISSION LEAD’S BOARD · PASS THE SEAT'}</p>
        <div className="part-grid">
          {orbits.map((orbit) => (
            <button key={orbit.id} type="button" className={`part ${design.orbitId === orbit.id ? 'on' : ''}`} disabled={!leadOk} onClick={() => onPatch({ orbitId: orbit.id })}>
              <div className="part-top">
                <strong>{orbit.name}</strong>
                <span className="tick">{design.orbitId === orbit.id ? '✓' : ''}</span>
              </div>
              <p>{orbit.desc}</p>
              <div className="part-meta">
                <em>Δv {orbit.dvAdd > 0 ? '+' : ''}{orbit.dvAdd.toFixed(2)}</em>
                <em>link {orbit.comms}</em>
                <em>{orbit.life}</em>
              </div>
            </button>
          ))}
        </div>
        {missionId === 'sandbox' && (
          <div className="sandbox-fields">
            <label>
              Objective
              <input value={design.objective} maxLength={140} disabled={!leadOk} onChange={(event) => onPatch({ objective: event.target.value })} />
            </label>
            <div className="crew-picks">
              <span>CREW</span>
              {[0, 1, 2, 3, 4].map((count) => (
                <button key={count} type="button" className={design.crew === count ? 'on' : ''} disabled={!leadOk} onClick={() => onPatch({ crew: count })}>
                  {count}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  if (tab === 'launcher') {
    return (
      <div className="included">
        <p className="panel-note">{leadOk ? 'LAUNCH VEHICLE · THE LEAD CHOOSES' : 'MISSION LEAD’S BOARD · PASS THE SEAT'}</p>
        <div className="part-grid">
          {LAUNCHERS.map((launcher) => (
            <button key={launcher.id} type="button" className={`part ${design.launcherId === launcher.id ? 'on' : ''}`} disabled={!leadOk} onClick={() => onPatch({ launcherId: launcher.id })}>
              <div className="part-top">
                <strong>{launcher.name}</strong>
                <span className="tick">{design.launcherId === launcher.id ? '✓' : ''}</span>
              </div>
              <p>{launcher.desc}</p>
              <div className="part-meta">
                <em>{launcher.cost > 0 ? `+${formatMoney(launcher.cost)}` : launcher.cost < 0 ? formatMoney(launcher.cost) : '$0M'}</em>
                <em>{launcher.thrust > 0 ? `+${launcher.thrust} tf` : launcher.thrust < 0 ? `${launcher.thrust} tf` : 'thrust unchanged'}</em>
                <em>mass cap {launcher.massLimit > 0 ? `+${launcher.massLimit} t` : launcher.massLimit < 0 ? `${launcher.massLimit} t` : 'unchanged'}</em>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="included">
      <p className="panel-note">{scienceOk ? 'INSTRUMENTS · SCIENCE CHOOSES' : 'SCIENCE’S BOARD · PASS THE SEAT'}</p>
      <div className="part-grid">
        {INSTRUMENTS.map((instrument) => {
          const on = design.instrumentIds.includes(instrument.id)
          return (
            <button key={instrument.id} type="button" className={`part ${on ? 'on' : ''}`} disabled={!scienceOk} onClick={() => onInstrument(instrument.id)}>
              <div className="part-top">
                <strong>{instrument.name}</strong>
                <span className="tick">{on ? '✓' : ''}</span>
              </div>
              <p>{instrument.desc}</p>
              <div className="part-meta">
                <em>{formatMoney(instrument.cost)}</em>
                <em>{formatMass(instrument.dry)}</em>
                <em>{instrument.power} pwr</em>
                <em>{instrument.data} data</em>
                <em>+{instrument.science} sci</em>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TeamSetup({ team, onSave, onHangar, onBack }) {
  const [draft, setDraft] = useState(team.length ? team : [])
  const used = new Set(draft.map((player) => player.role))
  const add = (role) => {
    if (draft.length >= 4 || used.has(role)) return
    const title = ROLES.find((item) => item.id === role)?.title || 'CREW'
    setDraft([...draft, { role, name: title.split(' ')[0] }])
  }
  return (
    <div className="grid-screen">
      <div className="frame narrow">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onBack}>
            ← HANGAR
          </button>
        </header>
        <p className="kicker">ONE COMPUTER · UP TO 4</p>
        <h2 className="display">WHO IS FLYING</h2>
        <p className="intro">
          Solo uses every board. With a team, pass the computer to the person whose role is called. Untaken roles stay open to everyone.
        </p>
        <div className="part-grid">
          {ROLES.map((role) => (
            <button key={role.id} type="button" className={`part ${used.has(role.id) ? 'on' : ''}`} disabled={used.has(role.id) || draft.length >= 4} onClick={() => add(role.id)}>
              <div className="part-top">
                <strong>{role.title}</strong>
                <span className="tick">{used.has(role.id) ? '✓' : ''}</span>
              </div>
              <p>{role.duty}</p>
            </button>
          ))}
        </div>
        <ul className="archive-list">
          {draft.map((player, index) => (
            <li key={player.role}>
              <input
                value={player.name}
                maxLength={18}
                aria-label={`${player.role} name`}
                onChange={(event) => {
                  const next = draft.slice()
                  next[index] = { ...player, name: event.target.value }
                  setDraft(next)
                }}
              />
              <button type="button" className="ghost" onClick={() => setDraft(draft.filter((item) => item.role !== player.role))}>
                REMOVE
              </button>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              onSave([])
              onHangar()
            }}
          >
            FLY SOLO
          </button>
          <button
            type="button"
            className="go-btn"
            onClick={() => {
              onSave(draft.length >= 2 ? draft : [])
              onHangar()
            }}
          >
            {draft.length >= 2 ? 'SAVE TEAM' : 'OPEN THE HANGAR'}
          </button>
        </div>
      </div>
    </div>
  )
}

function seatHolds(team, seat, role) {
  if (!team || team.length < 2) return true
  const owner = team.find((player) => player.role === role)
  if (!owner) return true
  return team[seat]?.role === role
}

export function Assembly({ missionId, parts, design, team, seat, confirm, onToggle, onInstrument, onPatch, onSeat, onTeam, onBack, onAsk, onCancel, onLaunch }) {
  const mission = MISSION_MAP[missionId]
  const profile = evaluateDesign(mission, parts, design)
  const ship = profile.ship
  const tuned = profile.mission
  const blocks = hardFailures(tuned, ship)
  const { confirm: warnings, notes } = shipWarnings(tuned, ship, parts)
  if (profile.powerUse > profile.powerGen) {
    notes.push('The instruments draw more power than the bus and the panels can feed. Science from the payload is cut.')
  }
  if (profile.data > profile.comms) {
    notes.push('The instruments make more data than the link can send. What does not fit is lost.')
  }
  const craftOk = seatHolds(team, seat, 'craft')
  const scienceOk = seatHolds(team, seat, 'science')
  const leadOk = seatHolds(team, seat, 'lead')
  const [tab, setTab] = useState('extras')
  const margin = ship.dv - tuned.dvRequired
  const conf = confidence(tuned, ship, parts)
  const tabs = [
    ['engine', 'ENGINE', '1'],
    ['tank', 'TANK', '1'],
    ['capsule', 'CAPSULE', '1'],
    ['extras', 'EXTRAS', String(parts.length)],
    ['orbit', 'ORBIT', '1'],
    ['launcher', 'LAUNCH', '1'],
    ['instruments', 'INSTRUMENTS', String(design.instrumentIds.length)],
  ]
  return (
    <div className="grid-screen">
      <div className="frame assembly-frame">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onBack}>
            ← MISSIONS
          </button>
          <PhaseNav current={1} />
        </header>
        <div className="assembly-head">
          <div>
            <p className="kicker">PHASE 02 · ASSEMBLY HANGAR · {mission.code}</p>
            <h2 className="display">BUILD YOUR ROCKET</h2>
          </div>
          <div className="aside">
            <p>
              Extra parts unlock choices during the flight. Instruments, orbit, and the launcher change power, data, and Δv.
            </p>
            <button type="button" className="text-btn" onClick={onTeam}>
              {team.length < 2 ? 'TEAM · SOLO' : `TEAM · ${team.length}`}
            </button>
          </div>
        </div>
        <div className="seat-row">
          {team.length > 1 &&
            team.map((player, index) => (
              <button key={player.role} type="button" className={seat === index ? 'on' : ''} onClick={() => onSeat(index)}>
                {player.name} · {ROLES.find((role) => role.id === player.role)?.title}
              </button>
            ))}
        </div>
        <ul className="why">
          {TRADEOFFS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="assembly">
          <section className="panel parts-panel">
            <div className="tabs">
              {tabs.map(([id, label, count]) => (
                <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                  {label} [{count}]
                </button>
              ))}
            </div>
            {tab === 'extras' ? (
              <>
                <p className="panel-note">{craftOk ? 'OPTIONAL · SELECT AS MANY AS YOU WANT' : 'SPACECRAFT’S BOARD · PASS THE SEAT'}</p>
                <div className="part-grid">
                  {PARTS.map((part) => {
                    const on = parts.includes(part.id)
                    const tag = tagFor(part, mission)
                    return (
                      <button key={part.id} type="button" className={`part ${on ? 'on' : ''}`} disabled={!craftOk} onClick={() => onToggle(part.id)}>
                        <div className="part-top">
                          <strong>{part.name}</strong>
                          <span className="tick">{on ? '✓' : ''}</span>
                        </div>
                        <p>{part.desc}</p>
                        <div className="part-meta">
                          <em>{formatMoney(part.cost)}</em>
                          <em>{formatMass(part.dry + part.propellant)}</em>
                          {part.thrust ? <em className="thrust">+{part.thrust} tf</em> : null}
                          {tag ? <em className={tag === 'Essential' ? 'need' : 'dim'}>{tag}</em> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : tab === 'orbit' || tab === 'launcher' || tab === 'instruments' ? (
              <DesignPick
                tab={tab}
                missionId={missionId}
                design={design}
                leadOk={leadOk}
                scienceOk={scienceOk}
                onPatch={onPatch}
                onInstrument={onInstrument}
              />
            ) : (
              <div className="included">
                <p className="panel-note">INCLUDED IN THE STRUCTURE · ALREADY IN THE ACCOUNT</p>
                <h3>{tab === 'engine' ? 'MAIN ENGINE' : tab === 'tank' ? 'TANK' : 'CAPSULE'}</h3>
                <p>
                  {tab === 'engine' ? mission.base.engine : tab === 'tank' ? mission.base.tank : mission.base.capsule}
                </p>
                <dl className="included-stats">
                  <div>
                    <dt>BASE COST</dt>
                    <dd>{formatMoney(mission.base.cost)}</dd>
                  </div>
                  <div>
                    <dt>BASE MASS</dt>
                    <dd>{formatMass(mission.base.dry + mission.base.propellant)}</dd>
                  </div>
                  <div>
                    <dt>THRUST</dt>
                    <dd>{mission.base.thrust} tf</dd>
                  </div>
                  <div>
                    <dt>SEATS</dt>
                    <dd>{mission.base.seats === 0 ? 'None' : mission.base.seats}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
          <section className="panel rocket-panel">
            <p className="panel-note">SIDE VIEW · SCALE 1:400</p>
            <RocketView parts={parts} />
            <ul className="rocket-readout">
              <li>
                <span>MASS</span>
                <strong>{formatMass(ship.mass)}</strong>
              </li>
              <li>
                <span>THRUST</span>
                <strong>{Math.round(ship.thrust)} tf</strong>
              </li>
              <li>
                <span>CONF.</span>
                <strong>{conf}%</strong>
              </li>
            </ul>
          </section>
          <section className="panel telem">
            <p className="panel-note">PROJECT TELEMETRY</p>
            <h3>{mission.project}</h3>
            <label>
              <span>BUDGET</span>
              <b>
                {formatMoney(ship.cost)} / {tuned.budget}
              </b>
            </label>
            <div className={`meter ${ship.cost > tuned.budget ? 'over' : 'orange'}`}>
              <i style={{ width: `${Math.min(100, (ship.cost / tuned.budget) * 100)}%` }} />
            </div>
            <label>
              <span>LAUNCH MASS</span>
              <b>
                {formatMass(ship.mass)} / {formatMass(tuned.maxMass)}
              </b>
            </label>
            <div className={`meter ${ship.mass > tuned.maxMass ? 'over' : 'gold'}`}>
              <i style={{ width: `${Math.min(100, (ship.mass / tuned.maxMass) * 100)}%` }} />
            </div>
            <label>
              <span>THRUST / WEIGHT</span>
              <b>{formatTwr(ship.twr)}</b>
            </label>
            <div className={`meter ${ship.twr < 1.2 ? 'over' : 'green'}`}>
              <i style={{ width: `${Math.min(100, (ship.twr / 4) * 100)}%` }} />
            </div>
            <label>
              <span>ΔV RANGE</span>
              <b className={margin < 0 ? 'danger' : ''}>{formatDv(ship.dv)}</b>
            </label>
            <div className={`meter ${margin < 0 ? 'over' : 'green'}`}>
              <i style={{ width: `${Math.min(100, (ship.dv / (tuned.dvRequired * 1.25)) * 100)}%` }} />
            </div>
            <p className={`margin-note ${margin < 0 ? 'danger' : ''}`}>Margin {formatDv(margin, true)} over what is required</p>
            <label>
              <span>POWER</span>
              <b className={profile.powerUse > profile.powerGen ? 'danger' : ''}>
                {profile.powerUse} / {profile.powerGen}
              </b>
            </label>
            <div className={`meter ${profile.powerUse > profile.powerGen ? 'over' : 'green'}`}>
              <i style={{ width: `${Math.min(100, (profile.powerUse / Math.max(profile.powerGen, 1)) * 100)}%` }} />
            </div>
            <label>
              <span>DATA / LINK</span>
              <b className={profile.data > profile.comms ? 'danger' : ''}>
                {profile.data} / {profile.comms}
              </b>
            </label>
            <div className={`meter ${profile.data > profile.comms ? 'over' : 'gold'}`}>
              <i style={{ width: `${Math.min(100, (profile.data / Math.max(profile.comms, 1)) * 100)}%` }} />
            </div>
            <p className="quiet-note">
              {profile.orbit.name} · {profile.launcher.name} · life {profile.life} · payload science {profile.delivered}
            </p>
            <ul className="checks">
              <Check ok label="Engine, tank, and capsule" value="Structure complete" />
              <Check ok={ship.cost <= tuned.budget} label="Budget" value={`${formatMoney(ship.cost)} of ${formatMoney(tuned.budget)}`} />
              <Check ok={ship.mass <= tuned.maxMass} label="Launch mass" value={`${formatMass(ship.mass)} of ${formatMass(tuned.maxMass)}`} />
              <Check ok={ship.twr >= 1.2} label="Thrust/weight" value={`${formatTwr(ship.twr)} (min. 1.2)`} />
              <Check
                ok={ship.seats >= tuned.crew}
                label="Crew"
                value={tuned.crew === 0 ? 'No crew' : `${tuned.crew} of ${ship.seats} seats`}
              />
              <Check ok={ship.dv + 0.001 >= tuned.dvRequired} label="Range (Δv)" value={`${formatDv(ship.dv)} of ${formatDv(tuned.dvRequired)}`} />
              {mission.critical.includes('lander') && (
                <Check ok={parts.includes('lander')} label="Landing module" value={parts.includes('lander') ? 'On board' : 'Missing'} />
              )}
              {mission.critical.includes('heat') && (
                <Check ok={parts.includes('heat')} label="Heat shield" value={parts.includes('heat') ? 'On board' : 'Missing'} />
              )}
            </ul>
            <button type="button" className="go-btn launch" disabled={blocks.length > 0 || !leadOk} onClick={() => (warnings.length || blocks.length ? onAsk() : onLaunch())}>
              {leadOk ? 'START COUNTDOWN' : 'MISSION LEAD LAUNCHES'}
            </button>
            {blocks.length > 0 && <p className="block-note">{blocks.join(' ')}</p>}
            {notes.map((note) => (
              <p key={note} className="quiet-note">
                {note}
              </p>
            ))}
          </section>
        </div>
      </div>
      {confirm && (
        <div className="modal-back">
          <div className="modal" role="dialog" aria-modal="true">
            <p className="kicker">OFF PROFILE</p>
            <h3>LAUNCH ANYWAY?</h3>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
              {warnings.length === 0 && <li>The ship clears the hard numbers. The flight can still surprise you.</li>}
            </ul>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={onCancel}>
                BACK TO THE HANGAR
              </button>
              <button type="button" className="go-btn" onClick={onLaunch}>
                START COUNTDOWN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CALLS = [
  [10, 'AUTOMATIC SEQUENCE'],
  [8, 'TANKS PRESSURIZED'],
  [6, 'FLIGHT COMPUTER'],
  [4, 'FLAME TRENCH FLOODED'],
  [2, 'IGNITION'],
  [0, 'TOWER CLEAR'],
]

export function Launch({ missionId, parts, design, sound, onDone, onAbort }) {
  const mission = MISSION_MAP[missionId]
  const profile = evaluateDesign(mission, parts, design)
  const ship = profile.ship
  const [count, setCount] = useState(10)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const sent = useRef(false)

  useEffect(() => {
    if (count <= 0) {
      const timer = setTimeout(() => {
        if (sent.current) return
        sent.current = true
        doneRef.current()
      }, 1200)
      return () => clearTimeout(timer)
    }
    playTone(sound, { freq: count <= 2 ? 140 : 660, dur: 0.07, type: 'square', gain: 0.02 })
    const timer = setTimeout(() => setCount((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [count, sound])

  const call = [...CALLS].reverse().find(([mark]) => count <= mark)?.[1] || CALLS[0][1]
  return (
    <div className="launch-screen">
      <Stars />
      <div className="frame">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onAbort}>
            ABORT
          </button>
          <PhaseNav current={2} />
        </header>
        <div className="launch-layout">
          <div>
            <p className="kicker">PHASE 03 · {mission.code}</p>
            <p className="count-label">{call}</p>
            <div className="count">{String(Math.max(count, 0)).padStart(2, '0')}</div>
            <p className="lede">T−{String(Math.max(count, 0)).padStart(2, '0')}:00 · margin {formatDv(ship.dv - profile.mission.dvRequired, true)}</p>
            <button
              type="button"
              className="text-btn skip"
              onClick={() => {
                if (sent.current) return
                sent.current = true
                onDone()
              }}
            >
              SKIP COUNTDOWN
            </button>
          </div>
          <div className={`launch-rocket ${count <= 2 ? 'up' : ''}`}>
            <RocketView parts={parts} lit={count <= 2} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LogList({ log }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [log])
  return (
    <div className="log" ref={ref}>
      {log.length === 0 && <p className="wait">Waiting for the first event..</p>}
      {log.map((line, index) => (
        <p key={`${line.time}-${index}`} className={line.tone || ''}>
          <em>{line.time}</em>
          {line.text}
        </p>
      ))}
    </div>
  )
}

function ShipList({ parts, crew }) {
  return (
    <ul className="ship-list">
      {parts.length === 0 && <li className="muted">Base structure only</li>}
      {parts.map((id) => (
        <li key={id}>
          <i style={{ background: PART_MAP[id].dot }} />
          {SHORT[id]}
        </li>
      ))}
      <li>
        <i className="crew-dot" />
        {crew === 0 ? 'No crew' : `${crew} crew`}
      </li>
    </ul>
  )
}

function snapRun(run) {
  return {
    integrity: Math.round(run.integrity),
    oxygen: Math.round(run.oxygen),
    science: run.science,
    margin: run.dv - run.dvNeeded,
    fuel: Math.round(fuelPercent(run)),
  }
}

const PASSAGE_FLAVOR = {
  ASCENT: 'The air thins. For a moment, the engine is the only thing that exists.',
  INSERTION: 'The burn ends and the weight vanishes. Only the clicks of the instruments remain.',
  ORBIT: 'Earth becomes a disc. You can watch the night walk across it.',
  'TRANS-LUNAR': 'Earth shrinks in the glass. The radio takes longer to answer.',
  'LUNAR ORBIT': 'The Moon stops being a light and becomes terrain.',
  DESCENT: 'The ground grows. There is no margin left for doubt.',
  SURFACE: 'Fine dust. The silence here has a different weight.',
  RETURN: 'The Moon falls behind. Earth is still only a point.',
  REENTRY: 'The air comes back all at once, and it comes hot.',
  'TRANS-MARS': 'The Sun gets smaller. Messages start arriving the next day.',
  CRUISE: 'Days that look the same. When trouble comes, it does not keep a schedule.',
  ARRIVAL: 'Mars fills the window. The atmosphere is already singing on the hull.',
  ENTRY: 'A short fire. Ground close.',
  JEZERO: 'The engine goes quiet. The sky is the color of rust.',
}

function Passage({ bridge, onContinue, onReport }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), 700)
    return () => clearTimeout(timer)
  }, [])
  const next = bridge.next
  const stamp = next?.day || next?.time || 'LOSS OF CONTACT'
  const fromStamp = bridge.from?.day || bridge.from?.time || ''
  const phase = next?.phase || bridge.ended?.subtitle || ''
  const flavor = bridge.ended
    ? bridge.ended.text
    : PASSAGE_FLAVOR[next?.phase] || 'The ship’s clock keeps moving, even when nobody touches the controls.'
  const before = bridge.before
  const after = bridge.after
  const deltas = []
  if (before && after) {
    if (before.integrity !== after.integrity) deltas.push(['INTEGRITY', `${before.integrity}%`, `${after.integrity}%`, after.integrity < before.integrity])
    if (before.oxygen !== after.oxygen) deltas.push(['OXYGEN', `${before.oxygen}%`, `${after.oxygen}%`, after.oxygen < before.oxygen])
    if (Math.abs(before.margin - after.margin) >= 0.01) {
      deltas.push(['MARGIN', formatDv(before.margin, true), formatDv(after.margin, true), after.margin < before.margin])
    }
    if (before.science !== after.science) deltas.push(['SCIENCE', String(before.science), String(after.science), after.science < before.science])
  }
  return (
    <div
      className={`passage ${bridge.ended ? 'ended' : ''} ${armed ? 'armed' : ''}`}
      onClick={() => {
        if (armed && !bridge.ended) onContinue()
      }}
    >
      <p className="kicker">{phase}</p>
      {fromStamp && fromStamp !== stamp ? <p className="passage-from">{fromStamp}</p> : null}
      <div className="passage-time">{stamp}</div>
      <div className="passage-bar" aria-hidden="true"><i /></div>
      {next?.presentation === 'diary' && next.route ? <p className="passage-route">{next.route}</p> : null}
      <div className="passage-log">
        {bridge.lines.map((line, index) => (
          <p key={`${line.time}-${index}`} className={line.tone || ''}>
            {line.text}
          </p>
        ))}
      </div>
      {deltas.length > 0 && (
        <ul className="passage-deltas">
          {deltas.map(([label, from, to, down]) => (
            <li key={label} className={down ? 'down' : 'up'}>
              <span>{label}</span>
              <strong>{from}</strong>
              <em>→</em>
              <strong>{to}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="passage-flavor">{flavor}</p>
      <button
        type="button"
        className="go-btn"
        disabled={!armed && !bridge.ended}
        onClick={(event) => {
          event.stopPropagation()
          if (!armed && !bridge.ended) return
          if (bridge.ended) onReport()
          else onContinue()
        }}
      >
        {bridge.ended ? 'VIEW REPORT' : 'CONTINUE'}
      </button>
    </div>
  )
}

export function Voyage({ missionId, run, team, seat, pause, sound, onChoose, onSeat, onPause, onResume, onMenu, onAbort, onReport }) {
  const mission = MISSION_MAP[missionId]
  const step = run.steps[run.index]
  const event = step?.kind === 'event' ? eventView(step.eventId, missionId) : null
  const desk = EVENT_DESK[step?.eventId] || 'lead'
  const deskRole = ROLES.find((role) => role.id === desk)
  const deskOwner = (team || []).find((player) => player.role === desk)
  const deskOpen = !deskOwner || (team || []).length < 2 || team[seat]?.role === desk
  const number = String(currentEventNumber(run)).padStart(2, '0')
  const margin = run.dv - run.dvNeeded
  const fuel = Math.round(fuelPercent(run))
  const lastTone = useRef(run.log.length)
  const [seenLog, setSeenLog] = useState(run.log.length)
  const [seenIndex, setSeenIndex] = useState(run.index)
  const [priorStats, setPriorStats] = useState(() => snapRun(run))
  const [bridge, setBridge] = useState(null)

  if (run.log.length !== seenLog || (run.ended && !bridge?.ended)) {
    const fresh = run.log.slice(seenLog)
    const before = priorStats
    const from = run.steps[seenIndex]
    const next = run.ended ? null : run.steps[run.index]
    const beats = fresh.filter((line) => line.beat)
    const lines = (beats.length ? beats : fresh.filter((line) => !line.text.startsWith('Time passes'))).slice(-2)
    if (fresh.some((line) => line.text.includes('The engine cuts'))) {
      lines.push({
        time: next?.time || '',
        text: 'The burn ends. The next day arrives without asking.',
        tone: 'neutral',
      })
    }
    setSeenLog(run.log.length)
    setPriorStats(snapRun(run))
    if (!run.ended) setSeenIndex(run.index)
    if (fresh.length || run.ended) {
      setBridge({
        lines: lines.length ? lines : fresh.slice(-2),
        before,
        after: snapRun(run),
        from,
        next,
        ended: run.ended,
      })
    }
  }

  useEffect(() => {
    if (run.log.length === lastTone.current) return
    const tone = run.log[run.log.length - 1]?.tone
    if (tone === 'good') playGood(sound)
    else if (tone === 'bad') playBad(sound)
    else playTone(sound, { freq: 340, dur: 0.05, gain: 0.015 })
    lastTone.current = run.log.length
  }, [run.log, sound])

  useEffect(() => {
    const onKey = (eventKey) => {
      if (bridge) {
        if (eventKey.key === 'Escape' && pause) onResume()
        if (eventKey.key === 'Enter' || eventKey.key === ' ') {
          eventKey.preventDefault()
          if (bridge.ended) onReport()
          else setBridge(null)
        }
        return
      }
      if (pause) {
        if (eventKey.key === 'Escape') onResume()
        return
      }
      const map = { a: 'a', b: 'b', c: 'c', 1: 'a', 2: 'b', 3: 'c' }
      const id = map[eventKey.key.toLowerCase()]
      if (id && deskOpen) onChoose(id)
      if (eventKey.key === 'Escape') onPause()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChoose, onPause, onResume, pause, bridge, onReport, deskOpen])

  const choices = event ? event.choices.map((choice) => (
    <ChoiceButton
      key={choice.id}
      choice={choice}
      owned={!choice.requires || run.parts.includes(choice.requires)}
      blocked={!deskOpen}
      partLabel={choice.requires ? PART_MAP[choice.requires].badge : ''}
      onPick={(id) => {
        if (!bridge && deskOpen) onChoose(id)
      }}
      variant={step.presentation === 'diary' ? 'diary' : 'tech'}
    />
  ))
  : []

  const bridgeLayer = bridge ? (
    <Passage bridge={bridge} onContinue={() => setBridge(null)} onReport={onReport} />
  ) : null

  const pauseLayer = pause ? (
    <div className="modal-back">
      <div className="modal">
        <p className="kicker">FLIGHT PAUSED</p>
        <h3>THE SHIP WAITS</h3>
        <p>Progress stays saved in this browser.</p>
        <div className="modal-actions column">
          <button type="button" className="go-btn" onClick={onResume}>
            RESUME
          </button>
          <button type="button" className="ghost" onClick={onMenu}>
            SAVE AND RETURN TO MENU
          </button>
          <button type="button" className="ghost danger" onClick={onAbort}>
            ABORT MISSION
          </button>
        </div>
      </div>
    </div>
  ) : null

  if (!event) {
    return (
      <div className="grid-screen">
        {bridgeLayer}
        {pauseLayer}
      </div>
    )
  }

  if (step.presentation === 'diary') {
    const mood =
      step.eventId === 'storm' ? 'storm' : step.eventId === 'power' ? 'power' : step.eventId === 'micro' || step.eventId === 'o2' ? 'damage' : 'calm'
    return (
      <div className="diary">
        <header className="diary-bar">
          <div className="brand-wrap">
            <button type="button" className="x" onClick={onPause} aria-label="Pause">
              ×
            </button>
            <div className="brand">
              ICARUS PROGRAM <i />
              <b />
            </div>
          </div>
          <div className="route">
            {step.day} · {step.route}
          </div>
          <div className="vitals">
            <span>
              <svg viewBox="0 0 24 24"><path d="M4 14c2-6 4-6 6 0s4 6 6 0 4-6 4 0" /></svg>
              OXYGEN {Math.round(run.oxygen)}%
            </span>
            <span>
              <svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>
              INTEGRITY {Math.round(run.integrity)}%
            </span>
            <span>
              <svg viewBox="0 0 24 24"><path d="M5 16c2-8 4 0 6-2s3-6 8-6" /></svg>
              FUEL {fuel}%
            </span>
          </div>
        </header>
        <Cabin mood={mood} />
        <section className={`diary-body ${bridge ? '' : 'event-in'}`} key={bridge ? 'hold' : run.index}>
          <p className="kicker">
            CAPTAIN'S LOG · {step.clock || '08:40'}
          </p>
          <h2 className="display">{event.title}</h2>
          <p className="story">{event.body}</p>
          {deskOwner && !deskOpen && (
            <button type="button" className="ghost desk-pass" onClick={() => onSeat((team || []).findIndex((player) => player.role === desk))}>
              Pass to {deskOwner.name} · {deskRole?.title}
            </button>
          )}
          <div className="diary-choices">{choices}</div>
        </section>
        <footer className="diary-foot">
          <span>
            <i /> MISSION {mission.code}
          </span>
          <span>LOG</span>
        </footer>
        {bridgeLayer}
        {pauseLayer}
      </div>
    )
  }

  return (
    <div className="grid-screen">
      <div className="frame">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onPause}>
            × PAUSE
          </button>
          <PhaseNav current={3} />
        </header>
        <p className="kicker">
          PHASE 04 · {mission.code} IN FLIGHT
        </p>
        <div className="flight-stats">
          <Stat label="INTEGRITY" value={`${Math.round(run.integrity)}%`} tone={run.integrity < 40 ? 'danger' : ''} />
          <Stat label="FUEL MARGIN" value={formatDv(margin, true)} tone={margin < 0 ? 'danger' : ''} />
          <Stat label={`SCIENCE (GOAL ${mission.scienceGoal})`} value={String(run.science)} />
        </div>
        <div className="voyage">
          <section className={`event ${bridge ? '' : 'event-in'}`} key={bridge ? 'hold' : run.index}>
            <p className="kicker">
              EVENT {number} · {step.time} · {step.phase}
            </p>
            <h2 className="display event-title">{event.title}</h2>
            <p className="story">{event.body}</p>
            {deskOwner && !deskOpen && (
              <button type="button" className="ghost desk-pass" onClick={() => onSeat((team || []).findIndex((player) => player.role === desk))}>
                Pass to {deskOwner.name} · {deskRole?.title}
              </button>
            )}
            <div className="tech-choices">{choices}</div>
          </section>
          <aside className="side">
            <section className="panel">
              <p className="panel-note">YOUR SHIP</p>
              <ShipList parts={run.parts} crew={mission.crew} />
            </section>
            <section className="panel grow">
              <p className="panel-note">CAPTAIN'S LOG</p>
              <LogList log={run.log} />
            </section>
          </aside>
        </div>
      </div>
      {bridgeLayer}
      {pauseLayer}
    </div>
  )
}

export function Report({ report, fromArchive, onRetry, onOther, onMenu, onArchive }) {
  if (!report) return null
  const success = report.success
  return (
    <div className={`report-screen ${success ? 'success' : 'failure'}`}>
      <Stars />
      <div className="regolith" />
      <div className="frame report-frame">
        <header className="topbar">
          <span />
          <PhaseNav current={4} />
        </header>
        <p className="kicker center">PHASE 05 · FINAL REPORT · {report.code}</p>
        <h2 className={`verdict ${success ? 'win' : 'loss'}`}>{report.title}</h2>
        <h3 className="subtitle">{report.subtitle}</h3>
        <p className="report-text">{report.text}</p>
        {report.brief && (
          <p className="report-text">
            {report.brief.objective} {report.brief.orbit}. {report.brief.launcher}. Power margin {report.brief.power}. Data {report.brief.data}. Life {report.brief.life}.
            {report.brief.instruments?.length ? ` Instruments: ${report.brief.instruments.join(', ')}.` : ' No extra instruments.'}
            {report.brief.team?.length ? ` Team: ${report.brief.team.join('; ')}.` : ' Flown solo.'}
          </p>
        )}
        <div className="report-stats">
          <Stat label="SCORE" value={String(report.score)} tone="score" />
          <Stat label="INTEGRITY" value={`${Math.round(report.integrity)}%`} />
          <Stat label="FUEL REMAINING" value={formatDv(report.margin, true)} tone={report.margin < 0 ? 'danger' : ''} />
          <Stat label="SCIENCE" value={String(report.science)} sub={report.science >= report.goal ? 'Goal met' : `Goal ${report.goal}`} />
        </div>
        <section className="timeline">
          <p className="panel-note">MISSION TIMELINE</p>
          {report.history.length === 0 && <p className="wait">The mission ended before the first choice.</p>}
          {report.history.map((item, index) => (
            <article key={`${item.time}-${index}`}>
              <p>
                {item.time} · {item.phase}
              </p>
              <p>
                <strong>
                  {item.title} — {item.choice}.
                </strong>{' '}
                {item.outcome}
              </p>
            </article>
          ))}
        </section>
        <div className="report-actions">
          {fromArchive ? (
            <button type="button" className="go-btn" onClick={onArchive}>
              BACK TO THE ARCHIVE
            </button>
          ) : (
            <>
              <button type="button" className="go-btn" onClick={onRetry}>
                ADJUST THE ROCKET AND TRY AGAIN
              </button>
              <button type="button" className="ghost" onClick={onOther}>
                ANOTHER MISSION
              </button>
              <button type="button" className="ghost" onClick={onMenu}>
                MENU
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function Hangar({ hangar, onLoad, onMenu }) {
  return (
    <div className="grid-screen">
      <div className="frame narrow">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onMenu}>
            ← MENU
          </button>
        </header>
        <p className="kicker">HANGAR</p>
        <h2 className="display">SAVED ROCKETS</h2>
        <p className="intro">Every countdown you start leaves a copy here. Load opens assembly with the same parts.</p>
        {hangar.length === 0 && <p className="empty">No saved rockets. Build one and start the countdown.</p>}
        <ul className="archive-list">
          {hangar.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.code}</strong>
                <small>
                  {formatMoney(item.cost)} · {formatMass(item.mass)} · Δv {formatDv(item.dv)} · {item.parts.length} extras
                </small>
              </div>
              <button type="button" className="ghost" onClick={() => onLoad(item.id)}>
                LOAD
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Archive({ archive, onOpen, onMenu }) {
  return (
    <div className="grid-screen">
      <div className="frame narrow">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onMenu}>
            ← MENU
          </button>
        </header>
        <p className="kicker">MISSION ARCHIVE</p>
        <h2 className="display">RANKING</h2>
        <p className="intro">Highest score on this computer. Science, a living ship, and fuel left all count.</p>
        <ol className="archive-list ranking">
          {[...archive]
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map((item, index) => (
              <li key={`rank-${item.id}`}>
                <button type="button" className="record" onClick={() => onOpen(item)}>
                  <strong>#{index + 1}</strong>
                  <span>
                    {item.code} · {item.score} pts · {item.success ? 'SUCCESS' : 'FAILURE'}
                    <small>{item.brief?.team?.length ? item.brief.team.join(' · ') : 'Solo'}</small>
                  </span>
                </button>
              </li>
            ))}
        </ol>
        <h2 className="display">HISTORY</h2>
        {archive.length === 0 && <p className="empty">No finished missions. Each flight’s report shows up here.</p>}
        <ul className="archive-list">
          {archive.map((item) => (
            <li key={item.id}>
              <button type="button" className="record" onClick={() => onOpen(item)}>
                <strong className={item.success ? 'win' : 'loss'}>{item.success ? 'SUCCESS' : 'FAILURE'}</strong>
                <span>
                  {item.code} · {item.subtitle}
                  <small>
                    {item.score} pts · {new Date(item.date).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Settings({ sound, onToggle, onReset, onMenu }) {
  const [armed, setArmed] = useState(false)
  return (
    <div className="grid-screen">
      <div className="frame narrow">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onMenu}>
            ← MENU
          </button>
        </header>
        <p className="kicker">SETTINGS</p>
        <h2 className="display">SYSTEMS</h2>
        <div className="setting">
          <div>
            <strong>SOUND</strong>
            <small>Clicks, the countdown, and the tone of each choice.</small>
          </div>
          <button type="button" className={`switch ${sound ? 'on' : ''}`} onClick={onToggle} aria-pressed={sound}>
            {sound ? 'ON' : 'MUTED'}
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>ERASE DATA</strong>
            <small>Removes the flight in progress, the hangar, and the archive from this browser.</small>
          </div>
          <button
            type="button"
            className="ghost danger"
            onClick={() => {
              if (!armed) {
                setArmed(true)
                return
              }
              onReset()
            }}
          >
            {armed ? 'CONFIRM' : 'ERASE'}
          </button>
        </div>
      </div>
    </div>
  )
}
