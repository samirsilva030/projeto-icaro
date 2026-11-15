export function PhaseNav({ current }) {
  const phases = ['MISSION', 'ASSEMBLY', 'LAUNCH', 'FLIGHT', 'REPORT']
  return (
    <nav className="phases" aria-label="Mission phases">
      {phases.map((label, index) => (
        <span key={label} className={index === current ? 'on' : index < current ? 'done' : ''}>
          {String(index + 1).padStart(2, '0')} {label}
        </span>
      ))}
    </nav>
  )
}

export function RocketView({ parts, lit = false }) {
  const has = (id) => parts.includes(id)
  return (
    <svg className={`rocket-svg ${lit ? 'lit' : ''}`} viewBox="0 0 220 460" aria-hidden="true">
      <defs>
        <linearGradient id="body" x1="0" x2="1">
          <stop offset="0" stopColor="#d9d3c6" />
          <stop offset="0.35" stopColor="#f7f4ee" />
          <stop offset="1" stopColor="#c9c2b4" />
        </linearGradient>
        <linearGradient id="flame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff1c9" />
          <stop offset="0.4" stopColor="#ffb15a" />
          <stop offset="1" stopColor="#ff4d1c" />
        </linearGradient>
      </defs>
      {has('solar') && (
        <g fill="#e7eef4" stroke="#7f93a6" strokeWidth="1.5">
          <rect x="8" y="170" width="52" height="92" rx="2" />
          <rect x="160" y="170" width="52" height="92" rx="2" />
          {[0, 1, 2, 3].map((row) => (
            <g key={row}>
              <path d={`M16 ${186 + row * 18}h36`} />
              <path d={`M168 ${186 + row * 18}h36`} />
            </g>
          ))}
        </g>
      )}
      {has('boosters') && (
        <g>
          <rect x="34" y="248" width="26" height="128" rx="13" fill="url(#body)" />
          <rect x="160" y="248" width="26" height="128" rx="13" fill="url(#body)" />
          <path d="M38 376h18l-9 36z" fill="#ff4d1c" />
          <path d="M164 376h18l-9 36z" fill="#ff4d1c" />
          {lit && (
            <>
              <path d="M40 378h14l-7 48z" fill="url(#flame)" opacity="0.9" />
              <path d="M166 378h14l-7 48z" fill="url(#flame)" opacity="0.9" />
            </>
          )}
        </g>
      )}
      <path d="M78 292 L48 348 L86 330 Z" fill="#f3efe6" />
      <path d="M142 292 L172 348 L134 330 Z" fill="#e4ddd0" />
      <path d="M110 16 L156 96 V292 L110 336 L64 292 V96 Z" fill="url(#body)" />
      <path d="M110 16 L156 96 L110 78 L64 96 Z" fill="#fbfaf6" />
      <rect x="96" y="112" width="28" height="36" rx="14" fill="#141b26" />
      <rect x="102" y="118" width="16" height="22" rx="8" fill="#8fd0ff" opacity="0.85" />
      <circle cx="110" cy="196" r="11" fill="#0b8f4a" />
      <path d="M110 188 l8 8 h-16 z" fill="#ffe14a" />
      <circle cx="110" cy="196" r="4" fill="#2046a0" />
      {has('heat') && <rect x="72" y="236" width="76" height="18" fill="#ff4d1c" />}
      {has('lander') && (
        <g fill="none" stroke="#f4efe6" strokeWidth="4" strokeLinecap="round">
          <path d="M80 300 L52 362" />
          <path d="M140 300 L168 362" />
          <path d="M40 362 h28" />
          <path d="M152 362 h28" />
        </g>
      )}
      <text className="rocket-word" x="92" y="196" textAnchor="middle" transform="rotate(-90 92 196)">
        ICARUS
      </text>
      <path d="M92 318 L110 402 L128 318 Z" fill="#222833" />
      <path d="M100 336 L110 390 L120 336 Z" fill="url(#flame)" />
      {lit && <path d="M96 340 L110 430 L124 340 Z" fill="url(#flame)" opacity="0.85" />}
    </svg>
  )
}

export function Cabin({ mood = 'calm' }) {
  const alert =
    mood === 'storm'
      ? ['ALERT', 'SOLAR STORM']
      : mood === 'power'
        ? ['POWER', 'BATTERIES FALLING']
        : mood === 'damage'
          ? ['HULL', 'PRESSURE UNSTABLE']
          : ['NOMINAL', 'OPEN SKY']
  return (
    <div className={`cabin mood-${mood}`} aria-hidden="true">
      <div className="cabin-rivets" />
      <div className="shelf">
        <div className="plant"><i /><b /></div>
        <div className="mug">ONE DAY<br />FARTHER</div>
        <div className="photo" />
        <div className="crate"><span>SPACE<br />RATIONS</span></div>
        <div className="tank"><em>O₂</em></div>
        <div className="duffel"><span>EXPLORE<br />PRESERVE<br />CONTINUE</span></div>
      </div>
      <svg className="astronaut" viewBox="0 0 460 480">
        <ellipse cx="230" cy="450" rx="150" ry="18" fill="#000" opacity="0.28" />
        <path d="M150 250h170l28 150H128z" fill="#2c241c" />
        <path d="M168 236h150l18 168H150z" fill="#f4eee4" />
        <path d="M188 248h118l8 150H180z" fill="#e7dfd2" />
        <path d="M214 268h16v92h-16z" fill="#c45520" />
        <path d="M268 268h16v92h-16z" fill="#c45520" />
        <rect x="206" y="330" width="62" height="24" rx="2" fill="#f7f4ee" stroke="#241c16" />
        <text x="237" y="346" textAnchor="middle" fontSize="12" fontFamily="IBM Plex Mono, monospace" fill="#1c1916">
          ICARUS
        </text>
        <circle cx="286" cy="358" r="11" fill="#0b8f4a" />
        <path d="M286 350l6 7h-12z" fill="#ffe14a" />
        <path d="M300 300c36 8 58 36 62 78" fill="none" stroke="#f4eee4" strokeWidth="26" strokeLinecap="round" />
        <path d="M156 292c-28 18-36 70-8 108" fill="none" stroke="#f4eee4" strokeWidth="26" strokeLinecap="round" />
        <path d="M248 248c28-6 62-46 48-78" fill="none" stroke="#f4eee4" strokeWidth="22" strokeLinecap="round" />
        <circle cx="292" cy="164" r="13" fill="#e4cbb8" />
        <ellipse cx="236" cy="168" rx="48" ry="52" fill="#c48862" />
        <path d="M188 166c2-58 34-92 66-84 26 6 42 10 54 32 8 16 4 34-8 42-16-22-30-28-50-22-20 6-40 18-54 40z" fill="#241c16" />
        <path d="M210 150c14-6 24-4 34 6" fill="none" stroke="#1a1410" strokeWidth="3" />
        <path d="M248 176c10 4 16 14 14 22" fill="none" stroke="#a86b50" strokeWidth="2" />
        <circle cx="214" cy="176" r="3.2" fill="#24160f" />
        <circle cx="246" cy="172" r="3.4" fill="#24160f" />
        <path d="M228 198c8 7 18 6 26-1" fill="none" stroke="#8d5340" strokeWidth="2" />
        <path d="M196 214h78c6 10 4 18-6 22h-66c-10-4-12-12-6-22z" fill="#d9d0c2" />
      </svg>
      <div className="window-wrap">
        <div className="porthole">
          <div className="earth">
            <i className="land" />
            <i className="land two" />
            <i className="lights" />
          </div>
        </div>
        <div className="alert-panel">
          <strong>{alert[0]}</strong>
          <span>{alert[1]}</span>
          <svg viewBox="0 0 120 36" className="spark">
            <path d="M0 28 L16 28 L24 8 L34 30 L44 14 L54 28 L70 28 L78 4 L90 28 L120 28" />
          </svg>
        </div>
        <div className="rad">RAD<br />0.8</div>
        <div className="scope">
          <svg viewBox="0 0 120 80">
            <circle cx="40" cy="40" r="6" />
            <path d="M48 40 C70 20, 90 30, 110 18" />
            <text x="70" y="68" fontSize="9">384.400 km</text>
          </svg>
        </div>
      </div>
      <div className="stamp">SAME EARTH<br />FARTHER HORIZONS</div>
    </div>
  )
}

export function Stars() {
  return <div className="stars" aria-hidden="true" />
}

function Icon({ name }) {
  if (name === 'wrench') {
    return (
      <svg viewBox="0 0 24 24" className="ico">
        <path d="M14.5 4.5a4 4 0 0 0-5.2 5.2L3 16.1 7.9 21l6.4-6.3a4 4 0 0 0 5.2-5.2l-3 3-2.8-2.8 3-3z" />
      </svg>
    )
  }
  if (name === 'lock') {
    return (
      <svg viewBox="0 0 24 24" className="ico">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="ico">
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z" />
    </svg>
  )
}

export function ChoiceButton({ choice, owned, partLabel, onPick, variant = 'tech', blocked = false }) {
  const needsPart = Boolean(choice.requires && !owned)
  const locked = needsPart || blocked
  const unlocked = Boolean(choice.requires && owned) && !blocked
  const icon = locked ? 'lock' : choice.icon || 'shelter'
  return (
    <button
      type="button"
      className={`choice ${variant} ${locked ? 'locked' : ''} ${unlocked ? 'armed' : ''} key-${choice.key.toLowerCase()}`}
      disabled={locked}
      onClick={() => onPick(choice.id)}
    >
      <span className="choice-key">{choice.key}</span>
      {variant === 'diary' && <Icon name={icon} />}
      <span className="choice-copy">
        <strong>{choice.label}</strong>
        <small>{needsPart ? `Requires: ${partLabel}` : blocked ? 'Another seat has this call' : choice.detail}</small>
      </span>
      {unlocked && <em className="badge">AVAILABLE: {partLabel}</em>}
    </button>
  )
}

export function Stat({ label, value, tone = '', sub }) {
  return (
    <div className={`stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  )
}
