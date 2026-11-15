import { useEffect, useRef, useState } from 'react'
import { MISSIONS, MISSION_MAP, PARTS, PART_MAP } from './data.js'
import {
  confidence,
  currentEventNumber,
  eventView,
  formatDv,
  formatMass,
  formatMoney,
  formatTwr,
  fuelPercent,
  hardFailures,
  shipWarnings,
  computeShip,
} from './sim.js'
import { playBad, playGood, playTone } from './audio.js'
import { Cabin, ChoiceButton, PhaseNav, RocketView, Stars, Stat } from './ui.jsx'

const SHORT = {
  heat: 'Escudo Térmico',
  solar: 'Painéis Solares',
  computer: 'Computador Reserva',
  lander: 'Módulo de Pouso',
  radiation: 'Blindagem Anti-radiação',
  repair: 'Kit de Reparos',
  boosters: 'Propulsores Laterais',
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
  if (mission.critical.includes(part.id)) return 'Essencial'
  if (mission.id === 'sentinela' && ['heat', 'lander', 'radiation', 'repair'].includes(part.id)) return 'Pouco útil aqui'
  return ''
}

export function Menu({ active, onNew, onContinue, onHangar, onArchive, onSettings }) {
  const clock = useClock()
  const [hover, setHover] = useState(0)
  const continueLabel = !active
    ? 'Nenhum progresso salvo'
    : active.run
      ? `${MISSION_MAP[active.missionId]?.code || 'MISSÃO'} · viagem em curso`
      : `${MISSION_MAP[active.missionId]?.code || 'MISSÃO'} · montagem`
  const items = [
    { n: '01', title: 'NOVA MISSÃO', sub: 'Planejar, montar e lançar', action: onNew },
    { n: '02', title: 'CONTINUAR', sub: continueLabel, action: onContinue, disabled: !active },
    { n: '03', title: 'HANGAR', sub: 'Foguetes salvos', action: onHangar },
    { n: '04', title: 'ARQUIVO DE MISSÕES', sub: 'Histórico e recordes', action: onArchive },
    { n: '05', title: 'CONFIGURAÇÕES', sub: 'Áudio e dados salvos', action: onSettings },
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
        <p className="eyebrow">DIVISÃO DE PROGRAMAS EXPERIMENTAIS</p>
        <p className="kicker">SIMULADOR DE MISSÕES ESPACIAIS</p>
        <h1>
          PROGRAMA
          <br />
          <span>ÍCARO</span>
        </h1>
        <p className="lede">
          Planeje a missão. Monte o foguete. Lance. Cada peça que você escolhe muda o que pode dar certo — ou errado — lá em cima.
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
        <p className="kicker">FASE 01 · PLANEJAMENTO</p>
        <h2 className="display">ESCOLHA A MISSÃO</h2>
        <p className="intro">Cada missão define seu orçamento, o peso máximo do foguete e o quanto de combustível você vai precisar.</p>
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
                    <dt>ORÇAMENTO</dt>
                    <dd>{formatMoney(item.budget)}</dd>
                  </div>
                  <div>
                    <dt>MASSA MÁX.</dt>
                    <dd>{formatMass(item.maxMass)}</dd>
                  </div>
                  <div>
                    <dt>ΔV NECESSÁRIO</dt>
                    <dd>{formatDv(item.dvRequired)}</dd>
                  </div>
                  <div>
                    <dt>TRIPULAÇÃO</dt>
                    <dd>{item.crew === 0 ? 'Nenhuma' : item.crew}</dd>
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
          <small>Duração estimada: {mission.duration}</small>
        </div>
        <button type="button" className="go-btn" onClick={onHangar}>
          IR PARA O HANGAR <span>›</span>
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

export function Assembly({ missionId, parts, confirm, onToggle, onBack, onAsk, onCancel, onLaunch }) {
  const mission = MISSION_MAP[missionId]
  const ship = computeShip(mission, parts)
  const blocks = hardFailures(mission, ship)
  const { confirm: warnings, notes } = shipWarnings(mission, ship, parts)
  const [tab, setTab] = useState('extras')
  const margin = ship.dv - mission.dvRequired
  const conf = confidence(mission, ship, parts)
  const tabs = [
    ['engine', 'MOTOR', '1'],
    ['tank', 'TANQUE', '1'],
    ['capsule', 'CÁPSULA', '1'],
    ['extras', 'EXTRAS', String(parts.length)],
  ]
  return (
    <div className="grid-screen">
      <div className="frame assembly-frame">
        <header className="topbar">
          <button type="button" className="text-btn" onClick={onBack}>
            ← MISSÕES
          </button>
          <PhaseNav current={1} />
        </header>
        <div className="assembly-head">
          <div>
            <p className="kicker">FASE 02 · HANGAR DE MONTAGEM · {mission.code}</p>
            <h2 className="display">MONTE SEU FOGUETE</h2>
          </div>
          <p className="aside">
            As peças extras desbloqueiam escolhas durante a viagem. Mas cada uma custa dinheiro e peso. A margem de Δv é o que sobra para os imprevistos.
          </p>
        </div>
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
                <p className="panel-note">OPCIONAL · SELECIONE QUANTOS QUISER</p>
                <div className="part-grid">
                  {PARTS.map((part) => {
                    const on = parts.includes(part.id)
                    const tag = tagFor(part, mission)
                    return (
                      <button key={part.id} type="button" className={`part ${on ? 'on' : ''}`} onClick={() => onToggle(part.id)}>
                        <div className="part-top">
                          <strong>{part.name}</strong>
                          <span className="tick">{on ? '✓' : ''}</span>
                        </div>
                        <p>{part.desc}</p>
                        <div className="part-meta">
                          <em>{formatMoney(part.cost)}</em>
                          <em>{formatMass(part.dry + part.propellant)}</em>
                          {part.thrust ? <em className="thrust">+{part.thrust} tf</em> : null}
                          {tag ? <em className={tag === 'Essencial' ? 'need' : 'dim'}>{tag}</em> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="included">
                <p className="panel-note">INCLUÍDO NA ESTRUTURA · NÃO SAI DA CONTA</p>
                <h3>{tab === 'engine' ? 'MOTOR PRINCIPAL' : tab === 'tank' ? 'TANQUE' : 'CÁPSULA'}</h3>
                <p>
                  {tab === 'engine' ? mission.base.engine : tab === 'tank' ? mission.base.tank : mission.base.capsule}
                </p>
                <dl className="included-stats">
                  <div>
                    <dt>CUSTO BASE</dt>
                    <dd>{formatMoney(mission.base.cost)}</dd>
                  </div>
                  <div>
                    <dt>MASSA BASE</dt>
                    <dd>{formatMass(mission.base.dry + mission.base.propellant)}</dd>
                  </div>
                  <div>
                    <dt>EMPUXO</dt>
                    <dd>{mission.base.thrust} tf</dd>
                  </div>
                  <div>
                    <dt>ASSENTOS</dt>
                    <dd>{mission.base.seats === 0 ? 'Nenhum' : mission.base.seats}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
          <section className="panel rocket-panel">
            <p className="panel-note">VISTA LATERAL · ESCALA 1:400</p>
            <RocketView parts={parts} />
            <ul className="rocket-readout">
              <li>
                <span>MASSA</span>
                <strong>{formatMass(ship.mass)}</strong>
              </li>
              <li>
                <span>EMPUXO</span>
                <strong>{Math.round(ship.thrust)} tf</strong>
              </li>
              <li>
                <span>CONF.</span>
                <strong>{conf}%</strong>
              </li>
            </ul>
          </section>
          <section className="panel telem">
            <p className="panel-note">TELEMETRIA DE PROJETO</p>
            <h3>{mission.project}</h3>
            <label>
              <span>ORÇAMENTO</span>
              <b>
                {formatMoney(ship.cost)} / {mission.budget}
              </b>
            </label>
            <div className={`meter ${ship.cost > mission.budget ? 'over' : 'orange'}`}>
              <i style={{ width: `${Math.min(100, (ship.cost / mission.budget) * 100)}%` }} />
            </div>
            <label>
              <span>MASSA DE LANÇAMENTO</span>
              <b>
                {formatMass(ship.mass)} / {formatMass(mission.maxMass)}
              </b>
            </label>
            <div className={`meter ${ship.mass > mission.maxMass ? 'over' : 'gold'}`}>
              <i style={{ width: `${Math.min(100, (ship.mass / mission.maxMass) * 100)}%` }} />
            </div>
            <label>
              <span>EMPUXO / PESO</span>
              <b>{formatTwr(ship.twr)}</b>
            </label>
            <div className={`meter ${ship.twr < 1.2 ? 'over' : 'green'}`}>
              <i style={{ width: `${Math.min(100, (ship.twr / 4) * 100)}%` }} />
            </div>
            <label>
              <span>ALCANCE ΔV</span>
              <b className={margin < 0 ? 'danger' : ''}>{formatDv(ship.dv)}</b>
            </label>
            <div className={`meter ${margin < 0 ? 'over' : 'green'}`}>
              <i style={{ width: `${Math.min(100, (ship.dv / (mission.dvRequired * 1.25)) * 100)}%` }} />
            </div>
            <p className={`margin-note ${margin < 0 ? 'danger' : ''}`}>Margem {formatDv(margin, true)} sobre o necessário</p>
            <ul className="checks">
              <Check ok label="Motor, tanque e cápsula" value="Estrutura completa" />
              <Check ok={ship.cost <= mission.budget} label="Orçamento" value={`${formatMoney(ship.cost)} de ${formatMoney(mission.budget)}`} />
              <Check ok={ship.mass <= mission.maxMass} label="Massa de lançamento" value={`${formatMass(ship.mass)} de ${formatMass(mission.maxMass)}`} />
              <Check ok={ship.twr >= 1.2} label="Empuxo/peso" value={`${formatTwr(ship.twr)} (mín. 1.2)`} />
              <Check
                ok={ship.seats >= mission.crew}
                label="Tripulação"
                value={mission.crew === 0 ? 'Sem tripulação' : `${mission.crew} de ${ship.seats} assentos`}
              />
              <Check ok={ship.dv + 0.001 >= mission.dvRequired} label="Alcance (Δv)" value={`${formatDv(ship.dv)} de ${formatDv(mission.dvRequired)}`} />
              {mission.critical.includes('lander') && (
                <Check ok={parts.includes('lander')} label="Módulo de pouso" value={parts.includes('lander') ? 'A bordo' : 'Ausente'} />
              )}
              {mission.critical.includes('heat') && (
                <Check ok={parts.includes('heat')} label="Escudo térmico" value={parts.includes('heat') ? 'A bordo' : 'Ausente'} />
              )}
            </ul>
            <button type="button" className="go-btn launch" disabled={blocks.length > 0} onClick={() => (warnings.length || blocks.length ? onAsk() : onLaunch())}>
              INICIAR CONTAGEM
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
            <p className="kicker">FORA DO PERFIL</p>
            <h3>LANÇAR ASSIM MESMO?</h3>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
              {warnings.length === 0 && <li>A nave passa nas contas duras. A viagem ainda pode surpreender.</li>}
            </ul>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={onCancel}>
                VOLTAR AO HANGAR
              </button>
              <button type="button" className="go-btn" onClick={onLaunch}>
                INICIAR CONTAGEM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CALLS = [
  [10, 'SEQUÊNCIA AUTOMÁTICA'],
  [8, 'TANQUES PRESSURIZADOS'],
  [6, 'COMPUTADOR DE VOO'],
  [4, 'DEFLETOR ALAGADO'],
  [2, 'IGNIÇÃO'],
  [0, 'TORRE LIVRE'],
]

export function Launch({ missionId, parts, sound, onDone, onAbort }) {
  const mission = MISSION_MAP[missionId]
  const ship = computeShip(mission, parts)
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
            ABORTAR
          </button>
          <PhaseNav current={2} />
        </header>
        <div className="launch-layout">
          <div>
            <p className="kicker">FASE 03 · {mission.code}</p>
            <p className="count-label">{call}</p>
            <div className="count">{String(Math.max(count, 0)).padStart(2, '0')}</div>
            <p className="lede">T−{String(Math.max(count, 0)).padStart(2, '0')}:00 · margem {formatDv(ship.dv - mission.dvRequired, true)}</p>
            <button
              type="button"
              className="text-btn skip"
              onClick={() => {
                if (sent.current) return
                sent.current = true
                onDone()
              }}
            >
              PULAR CONTAGEM
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
      {log.length === 0 && <p className="wait">Aguardando primeiro evento..</p>}
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
      {parts.length === 0 && <li className="muted">Estrutura base apenas</li>}
      {parts.map((id) => (
        <li key={id}>
          <i style={{ background: PART_MAP[id].dot }} />
          {SHORT[id]}
        </li>
      ))}
      <li>
        <i className="crew-dot" />
        {crew === 0 ? 'Sem tripulação' : `${crew} tripulante${crew > 1 ? 's' : ''}`}
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
  SUBIDA: 'O ar vai ficando fino. Por um instante, o motor é a única coisa que existe.',
  INSERÇÃO: 'A queima acaba e o peso some. Sobram os cliques dos instrumentos.',
  ÓRBITA: 'A Terra vira um disco. Dá para ver a noite caminhando sobre ela.',
  TRANSLUNAR: 'A Terra encolhe no vidro. O rádio demora mais para responder.',
  'ÓRBITA LUNAR': 'A Lua deixa de ser uma luz e vira terreno.',
  DESCIDA: 'O chão cresce. Não existe mais margem para a dúvida.',
  SUPERFÍCIE: 'Poeira fina. O silêncio daqui tem outro peso.',
  RETORNO: 'A Lua fica para trás. A Terra ainda é só um ponto.',
  REENTRADA: 'O ar volta de uma vez, e vem quente.',
  'TRANS MARTE': 'O Sol fica menor. As mensagens passam a chegar no dia seguinte.',
  CRUZEIRO: 'Dias iguais. Quando o problema vem, não marca hora.',
  CHEGADA: 'Marte ocupa a janela. A atmosfera já começa a cantar no casco.',
  ENTRADA: 'Fogo curto. Chão perto.',
  JEZERO: 'O motor cala. O céu é da cor de ferrugem.',
}

function Passage({ bridge, onContinue, onReport }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), 700)
    return () => clearTimeout(timer)
  }, [])
  const next = bridge.next
  const stamp = next?.day || next?.time || 'FIM DE CONTATO'
  const fromStamp = bridge.from?.day || bridge.from?.time || ''
  const phase = next?.phase || bridge.ended?.subtitle || ''
  const flavor = bridge.ended
    ? bridge.ended.text
    : PASSAGE_FLAVOR[next?.phase] || 'O relógio da nave segue, mesmo quando ninguém mexe nos controles.'
  const before = bridge.before
  const after = bridge.after
  const deltas = []
  if (before && after) {
    if (before.integrity !== after.integrity) deltas.push(['INTEGRIDADE', `${before.integrity}%`, `${after.integrity}%`, after.integrity < before.integrity])
    if (before.oxygen !== after.oxygen) deltas.push(['OXIGÊNIO', `${before.oxygen}%`, `${after.oxygen}%`, after.oxygen < before.oxygen])
    if (Math.abs(before.margin - after.margin) >= 0.01) {
      deltas.push(['MARGEM', formatDv(before.margin, true), formatDv(after.margin, true), after.margin < before.margin])
    }
    if (before.science !== after.science) deltas.push(['CIÊNCIA', String(before.science), String(after.science), after.science < before.science])
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
        {bridge.ended ? 'VER RELATÓRIO' : 'SEGUIR'}
      </button>
    </div>
  )
}

export function Voyage({ missionId, run, pause, sound, onChoose, onPause, onResume, onMenu, onAbort, onReport }) {
  const mission = MISSION_MAP[missionId]
  const step = run.steps[run.index]
  const event = step?.kind === 'event' ? eventView(step.eventId, missionId) : null
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
    const lines = (beats.length ? beats : fresh.filter((line) => !line.text.startsWith('O tempo passa'))).slice(-2)
    if (fresh.some((line) => line.text.includes('O motor corta'))) {
      lines.push({
        time: next?.time || '',
        text: 'A queima acaba. O próximo dia chega sem pedir licença.',
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
      if (id) onChoose(id)
      if (eventKey.key === 'Escape') onPause()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChoose, onPause, onResume, pause, bridge, onReport])

  const choices = event ? event.choices.map((choice) => (
    <ChoiceButton
      key={choice.id}
      choice={choice}
      owned={!choice.requires || run.parts.includes(choice.requires)}
      partLabel={choice.requires ? PART_MAP[choice.requires].badge : ''}
      onPick={(id) => {
        if (!bridge) onChoose(id)
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
        <p className="kicker">VOO PAUSADO</p>
        <h3>A NAVE ESPERA</h3>
        <p>O progresso fica salvo neste navegador.</p>
        <div className="modal-actions column">
          <button type="button" className="go-btn" onClick={onResume}>
            RETOMAR
          </button>
          <button type="button" className="ghost" onClick={onMenu}>
            SALVAR E VOLTAR AO MENU
          </button>
          <button type="button" className="ghost danger" onClick={onAbort}>
            ABORTAR MISSÃO
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
            <button type="button" className="x" onClick={onPause} aria-label="Pausar">
              ×
            </button>
            <div className="brand">
              PROGRAMA ÍCARO <i />
              <b />
            </div>
          </div>
          <div className="route">
            {step.day} · {step.route}
          </div>
          <div className="vitals">
            <span>
              <svg viewBox="0 0 24 24"><path d="M4 14c2-6 4-6 6 0s4 6 6 0 4-6 4 0" /></svg>
              OXIGÊNIO {Math.round(run.oxygen)}%
            </span>
            <span>
              <svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>
              INTEGRIDADE {Math.round(run.integrity)}%
            </span>
            <span>
              <svg viewBox="0 0 24 24"><path d="M5 16c2-8 4 0 6-2s3-6 8-6" /></svg>
              COMBUSTÍVEL {fuel}%
            </span>
          </div>
        </header>
        <Cabin mood={mood} />
        <section className={`diary-body ${bridge ? '' : 'event-in'}`} key={bridge ? 'hold' : run.index}>
          <p className="kicker">
            DIÁRIO DE BORDO · {step.clock || '08:40'}
          </p>
          <h2 className="display">{event.title}</h2>
          <p className="story">{event.body}</p>
          <div className="diary-choices">{choices}</div>
        </section>
        <footer className="diary-foot">
          <span>
            <i /> MISSÃO {mission.code}
          </span>
          <span>DIÁRIO</span>
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
            × PAUSAR
          </button>
          <PhaseNav current={3} />
        </header>
        <p className="kicker">
          FASE 04 · {mission.code} EM VOO
        </p>
        <div className="flight-stats">
          <Stat label="INTEGRIDADE" value={`${Math.round(run.integrity)}%`} tone={run.integrity < 40 ? 'danger' : ''} />
          <Stat label="MARGEM DE COMBUSTÍVEL" value={formatDv(margin, true)} tone={margin < 0 ? 'danger' : ''} />
          <Stat label={`CIÊNCIA (META ${mission.scienceGoal})`} value={String(run.science)} />
        </div>
        <div className="voyage">
          <section className={`event ${bridge ? '' : 'event-in'}`} key={bridge ? 'hold' : run.index}>
            <p className="kicker">
              EVENTO {number} · {step.time} · {step.phase}
            </p>
            <h2 className="display event-title">{event.title}</h2>
            <p className="story">{event.body}</p>
            <div className="tech-choices">{choices}</div>
          </section>
          <aside className="side">
            <section className="panel">
              <p className="panel-note">SUA NAVE</p>
              <ShipList parts={run.parts} crew={mission.crew} />
            </section>
            <section className="panel grow">
              <p className="panel-note">DIÁRIO DE BORDO</p>
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
        <p className="kicker center">FASE 05 · RELATÓRIO FINAL · {report.code}</p>
        <h2 className={`verdict ${success ? 'win' : 'loss'}`}>{report.title}</h2>
        <h3 className="subtitle">{report.subtitle}</h3>
        <p className="report-text">{report.text}</p>
        <div className="report-stats">
          <Stat label="PONTUAÇÃO" value={String(report.score)} tone="score" />
          <Stat label="INTEGRIDADE" value={`${Math.round(report.integrity)}%`} />
          <Stat label="COMBUSTÍVEL RESTANTE" value={formatDv(report.margin, true)} tone={report.margin < 0 ? 'danger' : ''} />
          <Stat label="CIÊNCIA" value={String(report.science)} sub={report.science >= report.goal ? 'Meta atingida' : `Meta ${report.goal}`} />
        </div>
        <section className="timeline">
          <p className="panel-note">LINHA DO TEMPO DA MISSÃO</p>
          {report.history.length === 0 && <p className="wait">A missão terminou antes da primeira escolha.</p>}
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
              VOLTAR AO ARQUIVO
            </button>
          ) : (
            <>
              <button type="button" className="go-btn" onClick={onRetry}>
                AJUSTAR FOGUETE E TENTAR DE NOVO
              </button>
              <button type="button" className="ghost" onClick={onOther}>
                OUTRA MISSÃO
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
        <h2 className="display">FOGUETES SALVOS</h2>
        <p className="intro">Cada contagem iniciada deixa uma cópia aqui. Carregar abre a montagem com as mesmas peças.</p>
        {hangar.length === 0 && <p className="empty">Nenhum foguete salvo. Monte um e inicie a contagem.</p>}
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
                CARREGAR
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
        <p className="kicker">ARQUIVO DE MISSÕES</p>
        <h2 className="display">HISTÓRICO</h2>
        {archive.length === 0 && <p className="empty">Nenhuma missão concluída. O relatório de cada voo aparece aqui.</p>}
        <ul className="archive-list">
          {archive.map((item) => (
            <li key={item.id}>
              <button type="button" className="record" onClick={() => onOpen(item)}>
                <strong className={item.success ? 'win' : 'loss'}>{item.success ? 'SUCESSO' : 'FALHA'}</strong>
                <span>
                  {item.code} · {item.subtitle}
                  <small>
                    {item.score} pts · {new Date(item.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
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
        <p className="kicker">CONFIGURAÇÕES</p>
        <h2 className="display">SISTEMAS</h2>
        <div className="setting">
          <div>
            <strong>SOM</strong>
            <small>Cliques, contagem e o tom de cada escolha.</small>
          </div>
          <button type="button" className={`switch ${sound ? 'on' : ''}`} onClick={onToggle} aria-pressed={sound}>
            {sound ? 'LIGADO' : 'MUDO'}
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>APAGAR DADOS</strong>
            <small>Remove o voo em curso, o hangar e o arquivo deste navegador.</small>
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
            {armed ? 'CONFIRMAR' : 'APAGAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
