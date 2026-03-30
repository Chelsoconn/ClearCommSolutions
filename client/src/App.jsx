import { useState, useEffect, useRef, useCallback } from 'react'
import Admin from './Admin.jsx'

function CheckOpt({ label, checked, onToggle }) {
  return (
    <div className={`check-opt${checked ? ' on' : ''}`} onClick={onToggle}>
      <div className="cbox">
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <polyline points="1 4 4 7 9 1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="clbl">{label}</span>
    </div>
  )
}

const HAZARD_OPTS = [
  'ATEX Zone 1 — Continuous risk',
  'ATEX Zone 2 — Occasional risk',
  'NEC Class I Division 1',
  'NEC Class I Division 2',
  'Non-classified / General Industry',
  'Not sure — need assessment',
]

const CREW_OPTS = [
  'Trade / Labour Crews',
  'Supervisors / Foremen',
  'Crane / Rigging Operations',
  'Safety / EHS Officers',
  'Vehicle / Equipment Operators',
  'Security Personnel',
  'Confined Space Entry Teams',
  'Management / Executive',
]

const INFRA_OPTS = [
  'Repeater / Range Extension',
  'Vehicle Mount Radios',
  'Command Post / Base Station',
  'Earpieces / Remote Speaker Mics',
]

const QTY_OPTS = ['1–10', '11–25', '26–50', '51–100', '101–250', '250+']

const CHANNELS = [
  {
    color: '#F0A500', role: 'CH 1 — Site Command',
    users: 'All supervisors · Site manager · Safety officer',
    details: [
      { k: 'Access', v: 'Supervisors, PM, Safety — scan-only for crew leads' },
      { k: 'Encryption', v: 'AES-256 Digital Encryption' },
      { k: 'Priority', v: 'P1 — overrides crew channels on conflict' },
      { k: 'OSHA Ref', v: '29 CFR 1910.38 Emergency Action compliance' },
    ]
  },
  {
    color: '#E84040', role: 'CH 2 — EMERGENCY / ALL-CALL',
    users: 'Every device on site — always accessible',
    details: [
      { k: 'Access', v: 'One-button override — programmed on every device' },
      { k: 'Function', v: 'Interrupts all crew channels simultaneously' },
      { k: 'Response', v: 'ClearComm technician alerted on activation' },
      { k: 'OSHA Ref', v: '29 CFR 1910.38 · 29 CFR 1926.35' },
    ]
  },
  {
    color: '#3B8EFF', role: 'CH 3 — Crew A · Structural Steel',
    users: '14 workers · 1 crew lead · Crane rigger',
    details: [
      { k: 'Access', v: 'Crew A members only — isolated from all other crews' },
      { k: 'Monitoring', v: 'Site supervisor has scan-listen (no transmit)' },
      { k: 'Devices', v: '16 units — IS-7X Pro (ATEX Zone 1 rated)' },
      { k: 'OSHA Ref', v: '29 CFR 1926 Subpart R Structural Steel' },
    ]
  },
  {
    color: '#00C07F', role: 'CH 4 — Crew B · Concrete / Forming',
    users: '18 workers · 1 crew lead · 2 pump operators',
    details: [
      { k: 'Access', v: 'Crew B members only — isolated channel' },
      { k: 'Devices', v: '21 units — XT-450 Site Runner (IP67)' },
      { k: 'Special', v: 'Pump operator sub-group on CH 4B (talk-around)' },
    ]
  },
  {
    color: '#A855F7', role: 'CH 5 — Crane Operations',
    users: 'Riggers · Signal persons · Crane operators',
    details: [
      { k: 'Access', v: 'Crane-certified personnel only — locked by radio ID' },
      { k: 'Compliance', v: '29 CFR 1926 Subpart CC — Dedicated lift signals' },
      { k: 'Protocol', v: 'Clear/hold/emergency language pre-briefed at mobilization' },
    ]
  },
  {
    color: '#F87171', role: 'CH 6 — Safety & OSHA Officers',
    users: 'Safety officer · EHS team · Medical response',
    details: [
      { k: 'Access', v: 'Safety personnel only — independent of ops chain' },
      { k: 'Authority', v: 'Can interrupt any channel via safety override' },
      { k: 'Logging', v: 'All transmissions logged and time-stamped' },
      { k: 'OSHA Ref', v: '29 CFR 1910.119 · 29 CFR 1910.146' },
    ]
  },
]

const PROCESS_STEPS = [
  {
    n: 1, phase: 'Step 01 — The Conversation', title: 'We Learn How Your Site Runs',
    body: "Before anything else, we talk. We want to understand your crews, your roles, your supervisors, who talks to who, and what your site's safety requirements look like. This isn't a questionnaire — it's a real conversation. The more we understand your operation, the better the system we build for it. We won't waste your time asking things that don't matter.",
    deliverables: ['Crew roles & headcount', 'Who needs cross-channel access', 'Site hazard areas', 'Safety requirements']
  },
  {
    n: 2, phase: 'Step 02 — The Plan', title: 'We Build Your Channel Plan',
    body: "Based on that conversation, we map out every channel — which crew gets which one, who's allowed to cross over, who's isolated, and how the emergency channel is set up. Everything gets configured and tested before we show up on site. You'll know exactly what the system looks like before we deploy it.",
    deliverables: ['Channel map per crew', 'All devices pre-programmed', 'Spares included (20%)', 'Safety cert documentation']
  },
  {
    n: 3, phase: 'Step 03 — On Site · Two Days', title: 'We Come In, Set Up, and Make Sure It Works',
    body: "We're on your site for two days. Day one is setup — everything in, tested, coverage confirmed. Day two is crew briefings — every team gets walked through their radios, their channels, and the emergency procedure. We don't leave until everyone is comfortable and the system is confirmed operational. After that, we step back and you call us when you need us.",
    deliverables: ['Full equipment setup & test', 'Crew-by-crew briefings', 'Emergency protocol confirmed', 'Site sign-off before we leave']
  },
  {
    n: 4, phase: 'Step 04 — Ongoing', title: '24/7 Phone Support for the Life of the Project',
    body: "We're not on site every day — but we're always available by phone. Day or night. Something stops working, call us. New crew starting, call us. A radio gets damaged, we'll sort out a replacement. Your dedicated contact knows your site and your setup. No call centres, no ticket systems — you reach a person who already knows your job.",
    deliverables: ['24/7 live phone support', 'Spare swap coordination', 'Mid-project crew changes', 'One dedicated contact']
  },
  {
    n: 5, phase: 'Step 05 — Closeout', title: 'We Come Back and Pick It All Up',
    body: "When the project wraps, we return and collect everything — radios, chargers, any infrastructure we put in. If the work is moving to a new phase or site, we can redeploy the whole system there. You never have to worry about managing, storing, or shipping equipment back. We handle it.",
    deliverables: ['Full equipment retrieval', 'Available for redeployment', 'OSHA compliance record', 'Clean closeout']
  },
]

export default function App() {
  const [page, setPage] = useState('home')
  const [openCh, setOpenCh] = useState(null)
  const [selQty, setSelQty] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refNum, setRefNum] = useState('')
  const [form, setForm] = useState({
    fname: '', lname: '', email: '', phone: '', company: '',
    jobtitle: '', industry: '', location: '', startdate: '', duration: '', notes: ''
  })
  const [errors, setErrors] = useState({})
  const [hazards, setHazards] = useState(new Set())
  const [crewTypes, setCrewTypes] = useState(new Set())
  const [infra, setInfra] = useState(new Set())

  const waveRefs = useRef({})
  const lastWaveRef = useRef(-1)

  const logVisit = (pageName) => {
    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pageName }),
    }).catch(() => {})
  }

  const goPage = (id) => {
    setPage(id)
    logVisit(id)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setPage('admin')
    } else {
      logVisit('home')
    }
  }, [])

  const scrollToId = (id) => {
    const el = document.getElementById(id)
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 72
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  const buildWave = useCallback((key, color, active) => {
    const c = waveRefs.current[key]
    if (!c) return
    c.innerHTML = ''
    const count = active ? 12 : 6
    for (let i = 0; i < count; i++) {
      const b = document.createElement('div')
      b.className = 'ch-bar'
      const h = active ? (4 + Math.random() * 14) : 3
      b.style.height = h + 'px'
      b.style.background = color
      b.style.opacity = active ? '0.9' : '0.25'
      b.style.animationDelay = (i * 0.08) + 's'
      b.style.animationDuration = active ? (0.8 + Math.random() * 0.6) + 's' : '2s'
      c.appendChild(b)
    }
  }, [])

  useEffect(() => {
    buildWave('cmd', '#F0A500', true)
    buildWave('a', '#3B8EFF', false)
    buildWave('b', '#00C07F', false)
    buildWave('crane', '#A855F7', false)
    buildWave('safe', '#F87171', false)
    buildWave('sup', '#FCD34D', false)

    const waves = [
      ['a', '#3B8EFF'], ['b', '#00C07F'], ['crane', '#A855F7'],
      ['safe', '#F87171'], ['sup', '#FCD34D']
    ]
    const interval = setInterval(() => {
      let idx
      do { idx = Math.floor(Math.random() * waves.length) } while (idx === lastWaveRef.current)
      if (lastWaveRef.current >= 0) buildWave(waves[lastWaveRef.current][0], waves[lastWaveRef.current][1], false)
      buildWave(waves[idx][0], waves[idx][1], true)
      lastWaveRef.current = idx
    }, 2800)
    return () => clearInterval(interval)
  }, [buildWave])

  const updateForm = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: false }))
  }

  const toggleSet = (setFn, val) => {
    setFn(s => {
      const next = new Set(s)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      return next
    })
  }

  const validate = () => {
    const errs = {}
    ;['fname', 'lname', 'email', 'phone', 'company', 'industry', 'location', 'startdate', 'duration'].forEach(f => {
      if (!form[f]?.trim()) errs[f] = true
    })
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = true
    if (!selQty) errs.qty = true
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submitForm = async () => {
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(false)
    const ref = 'CC-' + Math.floor(100000 + Math.random() * 900000)
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refNum: ref,
          firstName: form.fname,
          lastName: form.lname,
          email: form.email,
          phone: form.phone,
          company: form.company,
          jobTitle: form.jobtitle,
          industry: form.industry,
          location: form.location,
          startDate: form.startdate,
          duration: form.duration,
          qty: selQty,
          hazards: [...hazards],
          crewTypes: [...crewTypes],
          infra: [...infra],
          notes: form.notes,
        }),
      })
      if (!res.ok) throw new Error('Server error')
      setRefNum(ref)
      setShowSuccess(true)
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (page === 'admin') {
    return <Admin onExit={() => { setPage('home'); window.history.pushState({}, '', '/'); logVisit('home') }} />
  }

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-logo" onClick={() => goPage('home')}>
          <div className="logo-hex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.9l.004 2.02h-.004z" />
            </svg>
          </div>
          <span className="logo-wordmark">Clear<em>Comm</em></span>
        </div>
        <div className="nav-center">
          <button className="nav-link" onClick={() => goPage('home')}>What We Do</button>
          <button className="nav-link" onClick={() => scrollToId('architecture')}>Channel Arch</button>
          <button className="nav-link" onClick={() => scrollToId('process')}>How It Works</button>
          <button className="nav-link" onClick={() => scrollToId('safety')}>Safety &amp; OSHA</button>
          <button className="nav-link" onClick={() => scrollToId('industries')}>Industries</button>
        </div>
        <button className="nav-cta-btn" onClick={() => goPage('pricing')}>Request Deployment Quote</button>
      </nav>

      {/* STATUS BAR */}
      <div className="status-bar">
        <div className="status-item"><div className="sdot"></div>All Systems Operational</div>
        <div className="status-item"><div className="sdot a"></div>ATEX IS-Certified Fleet</div>
        <div className="status-item"><div className="sdot b"></div>24/7 Site Support Active</div>
        <div className="status-item">// Managed Comms Provider — Not a Rental Company</div>
      </div>

      {/* HOME PAGE */}
      <div className={`page${page === 'home' ? ' active' : ''}`}>

        {/* HERO */}
        <div className="hero">
          <div className="hero-left">
            <div className="eyebrow-small">Managed Site Communications</div>
            <h1 className="htitle">Your Site's<br /><span className="hs">Comms. Done.</span></h1>
            <div className="hero-tagline">We learn your site · We build your system · We back you 24/7</div>
            <p className="hero-body">
              ClearComm is not a radio rental company. We're <strong>your on-site communications partner</strong> — we sit down with you, learn how your operation runs, and build a comms system around your crews and their roles. We handle the setup, we train your people, and we're on call <strong>around the clock</strong> when anything comes up.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => goPage('pricing')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                Request Deployment Quote
              </button>
              <button className="btn-outline" onClick={() => scrollToId('architecture')}>See Channel Architecture</button>
            </div>
          </div>
          <div className="hero-right">
            <div className="comms-diagram">
              <div className="diag-title">Live Channel Map · Active Site</div>
              <div className="ch-row">
                <div className="ch-label"><div className="ch-dot" style={{ background: '#F0A500', boxShadow: '0 0 6px #F0A500' }}></div><div className="ch-name">Site Command</div></div>
                <div className="ch-activity"><div className="ch-wave" ref={el => waveRefs.current['cmd'] = el}></div><div className="ch-status" style={{ color: 'var(--signal)' }}>TX ACTIVE</div></div>
              </div>
              <div className="ch-row">
                <div className="ch-label"><div className="ch-dot" style={{ background: '#3B8EFF' }}></div><div className="ch-name">Crew A — Steel</div></div>
                <div className="ch-activity"><div className="ch-wave" ref={el => waveRefs.current['a'] = el}></div><div className="ch-status">MONITORING</div></div>
              </div>
              <div className="ch-row">
                <div className="ch-label"><div className="ch-dot" style={{ background: '#00C07F' }}></div><div className="ch-name">Crew B — Concrete</div></div>
                <div className="ch-activity"><div className="ch-wave" ref={el => waveRefs.current['b'] = el}></div><div className="ch-status">MONITORING</div></div>
              </div>
              <div className="ch-row">
                <div className="ch-label"><div className="ch-dot" style={{ background: '#A855F7' }}></div><div className="ch-name">Crane Ops</div></div>
                <div className="ch-activity"><div className="ch-wave" ref={el => waveRefs.current['crane'] = el}></div><div className="ch-status">STANDBY</div></div>
              </div>
              <div className="ch-row">
                <div className="ch-label"><div className="ch-dot" style={{ background: '#F87171' }}></div><div className="ch-name">Safety / OSHA</div></div>
                <div className="ch-activity"><div className="ch-wave" ref={el => waveRefs.current['safe'] = el}></div><div className="ch-status" style={{ color: 'var(--go)' }}>ALWAYS ON</div></div>
              </div>
              <div className="ch-row">
                <div className="ch-label"><div className="ch-dot" style={{ background: '#FCD34D' }}></div><div className="ch-name">Supervisors</div></div>
                <div className="ch-activity"><div className="ch-wave" ref={el => waveRefs.current['sup'] = el}></div><div className="ch-status">ENCRYPTED</div></div>
              </div>
              <div className="ch-row">
                <div className="ch-label"><div className="ch-dot" style={{ background: 'var(--alert)', animation: 'pulse 1.5s infinite' }}></div><div className="ch-name" style={{ color: 'var(--alert)' }}>EMERGENCY</div></div>
                <div className="ch-activity"><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--alert)', letterSpacing: '0.1em', animation: 'blink 1s step-end infinite' }}>ALL-CALL OVERRIDE</div></div>
              </div>
              <div className="diag-footer">
                <div className="dstat"><span>48</span>Units Active</div>
                <div className="dstat"><span>7</span>Channels Live</div>
                <div className="dstat"><span style={{ color: 'var(--go)' }}>99.8%</span>Uptime</div>
                <div className="dstat"><span>IS-Rated</span>All Units</div>
              </div>
            </div>
          </div>
        </div>

        {/* MANIFESTO */}
        <div className="manifesto">
          <div className="man-inner">
            <div className="man-item">
              <div className="man-num">01</div>
              <div className="man-text"><strong>We learn your operation first.</strong>Before anything gets configured, we sit down with you — understand who's on site, what each crew needs to hear, and who needs to talk to who. We don't assume. We ask.</div>
            </div>
            <div className="man-item">
              <div className="man-num">02</div>
              <div className="man-text"><strong>Two days and your crew is running.</strong>We handle everything on site — setup, configuration, testing, and crew briefings. In two days your people know their radios, their channels, and what to do in an emergency. Then we step back.</div>
            </div>
            <div className="man-item">
              <div className="man-num">03</div>
              <div className="man-text"><strong>24/7 on the phone. Always.</strong>We're not on site full-time — but we're always reachable. Something breaks or changes, call us. We troubleshoot remotely, ship spares, or get someone there. Your site doesn't stop because a radio did.</div>
            </div>
          </div>
        </div>

        {/* WHAT WE DO */}
        <div className="sw">
          <div className="eyebrow">What We Do</div>
          <h2 className="sh">From First Call<br />To Final Pickup.</h2>
          <p className="slead">You make one call. We take it from there — figuring out what your site needs, setting it up, and staying available for the life of the project.</p>
          <div className="what-grid">
            <div className="what-card">
              <div className="wnum">01</div>
              <svg className="wicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
              <div className="wtitle">We Learn Your Site</div>
              <div className="wbody">Every job site runs differently. We talk to you — who your crews are, how many people, what roles, who talks to who, and where the risk areas are. We want to understand your operation before we touch a single piece of equipment. That conversation is where the whole system gets built.</div>
            </div>
            <div className="what-card">
              <div className="wnum">02</div>
              <svg className="wicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              <div className="wtitle">We Build Your Channel Plan</div>
              <div className="wbody">Based on what we learn, we build a channel plan around your crews. Each team gets their own channel — isolated so there's no bleed-over noise. Supervisors get visibility across crews. Safety and emergency channels are always accessible to everyone. Some roles get cross-channel access where the work demands it. Everything is intentional.</div>
            </div>
            <div className="what-card">
              <div className="wnum">03</div>
              <svg className="wicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              <div className="wtitle">Two-Day Deployment</div>
              <div className="wbody">We come on site with everything pre-configured and ready to go. Over two days we get all equipment set up and tested, walk every crew through their radios and channels, confirm emergency protocols are understood, and make sure the system is solid before we leave. No fumbling around on day three.</div>
            </div>
            <div className="what-card">
              <div className="wnum">04</div>
              <svg className="wicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.9l.004 2.02h-.004z" /></svg>
              <div className="wtitle">24/7 Phone Support</div>
              <div className="wbody">We're not on your site every day — but we're on the phone any time you need us. Day or night, weekends, holidays. A real person picks up. Whether it's a radio acting up, a new crew coming in that needs to be added, or anything in the middle — call us and we'll sort it out.</div>
            </div>
            <div className="what-card">
              <div className="wnum">05</div>
              <svg className="wicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
              <div className="wtitle">Spares Included — 20%</div>
              <div className="wbody">Every deployment includes a 20% spare float — pre-configured and ready to swap in. Radios get dropped, batteries die faster than expected, and sites have turnover. The spares are there so you never have a worker standing around waiting on a replacement. Swap it out and keep moving.</div>
            </div>
            <div className="what-card">
              <div className="wnum">06</div>
              <svg className="wicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              <div className="wtitle">We Pick It All Up</div>
              <div className="wbody">When the project wraps, we come back and collect everything. Full retrieval — radios, chargers, accessories, any infrastructure we put in. If the project moves to a new phase or a different site, we can redeploy the whole system there. You don't own the headache of equipment management. We do.</div>
            </div>
          </div>
        </div>

        {/* CHANNEL ARCHITECTURE */}
        <div className="arch-bg" id="architecture">
          <div className="sw">
            <div className="eyebrow">Channel Architecture</div>
            <h2 className="sh">Who Talks to Who.<br />And Who Doesn't.</h2>
            <p className="slead">The way channels get set up is the core of what we do. Every crew stays on their own channel — clean, focused, no noise from other teams. The right people get visibility across crews. And when there's an emergency, everyone hears it immediately.</p>
            <div className="arch-layout">
              <div>
                <div className="arch-points">
                  <div className="arch-point">
                    <div className="ap-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div>
                    <div><div className="ap-title">Each Crew Gets Their Own Channel</div><div className="ap-body">Your steel crew stays on their channel. Concrete stays on theirs. Nobody steps on each other's comms. No cross-talk, no confusion, no missed calls because someone else was transmitting. Clean and focused — the way busy sites need to run.</div></div>
                  </div>
                  <div className="arch-point">
                    <div className="ap-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
                    <div><div className="ap-title">Supervisors Can Cross Channels</div><div className="ap-body">Foremen and site supervisors are set up to monitor all active crew channels at once — and step in when they need to. Some roles need that access. A crane coordinator might need to hear both the rigging crew and the signal person. We configure that crossover intentionally, not by accident.</div></div>
                  </div>
                  <div className="arch-point">
                    <div className="ap-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div>
                    <div><div className="ap-title">One Button for Emergencies</div><div className="ap-body">Every single radio on site has an emergency channel — one button and it reaches everyone simultaneously. No hunting through channels, no delay. That's how it has to work when seconds matter. We test this before the first crew ever picks up a radio.</div></div>
                  </div>
                  <div className="arch-point">
                    <div className="ap-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></div>
                    <div><div className="ap-title">Some Things Stay Private</div><div className="ap-body">Management, safety, and coordination channels where sensitive conversations happen are kept separate and secured. Not everything on a job site should be heard by everyone — and we build that in from the start.</div></div>
                  </div>
                  <div className="arch-point">
                    <div className="ap-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div>
                    <div><div className="ap-title">Changes Are Easy</div><div className="ap-body">New crew starting next week? Call us — we'll have their radios configured before they arrive. A crew demobilizing? We sort out the channels and collect the equipment. Things change on job sites. We handle it.</div></div>
                  </div>
                </div>
              </div>
              <div className="arch-panel">
                <div className="arch-panel-head">
                  <div className="aph-title">// Channel Architecture · Example Site</div>
                  <div className="aph-badge">Live Config</div>
                </div>
                {CHANNELS.map((ch, idx) => (
                  <div className="ch-block" key={idx} onClick={() => setOpenCh(openCh === idx ? null : idx)}>
                    <div className="ch-header">
                      <div className="ch-colorbar" style={{ background: ch.color }}></div>
                      <div className="ch-info">
                        <div className="ch-role">{ch.role}</div>
                        <div className="ch-users">{ch.users}</div>
                      </div>
                      <div className="ch-exp">{openCh === idx ? '▴' : '▾'}</div>
                    </div>
                    <div className={`ch-detail${openCh === idx ? ' open' : ''}`}>
                      {ch.details.map((d, di) => (
                        <div className="cdr" key={di}><div className="cdk">{d.k}</div>{d.v}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div id="process">
          <div className="sw">
            <div className="eyebrow">How It Works</div>
            <h2 className="sh">Simple Process.<br />Solid Result.</h2>
            <p className="slead">We keep it straightforward. A conversation, two days on site, and then we're a phone call away for the life of the project.</p>
            <div className="process-track">
              {PROCESS_STEPS.map(step => (
                <div className="pstep" key={step.n}>
                  <div className="pmarker"><div className="pnum">{step.n}</div></div>
                  <div className="pstep-content">
                    <div className="pphase">{step.phase}</div>
                    <div className="ptitle">{step.title}</div>
                    <div className="pbody">{step.body}</div>
                    <div className="deliverables">
                      {step.deliverables.map((d, i) => <div className="deliv" key={i}>{d}</div>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SAFETY */}
        <div className="safety-bg" id="safety">
          <div className="sw">
            <div className="eyebrow">Safety &amp; OSHA Compliance</div>
            <h2 className="sh">Built Safe.<br />No Shortcuts.</h2>
            <p className="slead">Communications isn't an admin function on a job site — it's a safety system. A radio that isn't right for the environment, a channel that's not set up correctly, a crew member who doesn't know the emergency button — these aren't inconveniences. They're how people get hurt.</p>
            <div className="osha-stmt">
              <div className="osha-stmt-lbl">// How We Approach Safety</div>
              <div className="osha-stmt-txt">Every piece of equipment we bring to your site is matched to the environment it's going into — hazardous zone rated where it needs to be, tested and certified before it arrives. Your OSHA documentation comes with the deployment. Emergency comms are tested before the first crew picks up a radio. None of this is optional and none of it is an afterthought.</div>
            </div>
            <div className="safety-split">
              <div>
                <div className="sblock">
                  <div className="sbhead"><div className="sbicon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div><div className="sbtitle">Right Equipment for the Environment</div></div>
                  <div className="sbbody">On oil fields and anywhere with explosive atmospheres, a standard radio is a hazard. We bring equipment rated for the specific zone your crew is working in — intrinsically safe where it has to be. The certifications match the site. No workarounds, no exceptions.</div>
                  <div className="cfr">ATEX Zone 1 &amp; 2 · NEC Class I Div 1 &amp; 2 · IECEx</div>
                </div>
                <div className="sblock" style={{ marginTop: '2px' }}>
                  <div className="sbhead"><div className="sbicon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div><div className="sbtitle">Emergency Channel on Every Radio</div></div>
                  <div className="sbbody">Every radio we deploy has a dedicated emergency channel — one button, reaches the whole site immediately. We test it before deployment, we brief every crew on it, and we make sure it works in every corner of your site. If something goes wrong, your people can reach each other. That's the baseline.</div>
                  <div className="cfr">OSHA 29 CFR 1910.38 · Emergency Action Plan compliance</div>
                </div>
                <div className="sblock" style={{ marginTop: '2px' }}>
                  <div className="sbhead"><div className="sbicon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg></div><div className="sbtitle">Confined Space &amp; Permit Work</div></div>
                  <div className="sbbody">When crews are working in confined spaces or permit-required areas, communication between the person inside and the attendant outside is a safety requirement — not optional. We configure a dedicated channel for that work and confirm the signal gets through before entry is approved.</div>
                  <div className="cfr">OSHA 29 CFR 1910.146 Permit-Required Confined Spaces</div>
                </div>
              </div>
              <div>
                <div className="sblock">
                  <div className="sbhead"><div className="sbicon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81" /><path d="M1 1l22 22" /></svg></div><div className="sbtitle">Crane Operations</div></div>
                  <div className="sbbody">Crane work needs its own channel — clean, dedicated, no noise from other crews. The rigger, the signal person, and the operator need to hear each other clearly every time. We configure and isolate the crane channel from everything else on the site, and we brief the crew on clear/hold/emergency protocol before any lifts.</div>
                  <div className="cfr">OSHA 29 CFR 1926 Subpart CC · ASME B30.5</div>
                </div>
                <div className="sblock" style={{ marginTop: '2px' }}>
                  <div className="sbhead"><div className="sbicon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div><div className="sbtitle">OSHA Documentation Ready to Go</div></div>
                  <div className="sbbody">If an inspector walks on your site, you're covered. Every deployment comes with full documentation — equipment certifications, zone assignments, and compliance records formatted for OSHA review. Your safety team doesn't have to scramble. It's already prepared.</div>
                  <div className="cfr">OSHA 29 CFR 1910.119 PSM · NEC Article 500</div>
                </div>
                <div className="sblock" style={{ marginTop: '2px' }}>
                  <div className="sbhead"><div className="sbicon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div><div className="sbtitle">Radio Checks Before Every Shift</div></div>
                  <div className="sbbody">We establish a simple start-of-shift radio check on every deployment. Every operator confirms their radio is working, their channel is right, and the emergency button works. Takes five minutes. It's the kind of habit that catches problems before they become incidents — and it gives your supervisors a daily confirmation that comms are operational.</div>
                  <div className="cfr">Best Practice · OSHA 1910.38 alignment</div>
                </div>
              </div>
            </div>
            <div className="cert-row">
              {['ATEX Zone 1 & 2', 'IECEx Certified', 'NEC Class I Div 1/2', 'NFPA 70 / NEC 500', 'IP67 / IP68', 'MIL-STD-810G/H', 'FCC Part 90', 'CSA Canada'].map(c => (
                <div className="cert-pill" key={c}>{c}</div>
              ))}
            </div>
          </div>
        </div>

        {/* INDUSTRIES */}
        <div id="industries">
          <div className="sw">
            <div className="eyebrow">Industries We Serve</div>
            <h2 className="sh">Every Site.<br />Every Hazard Class.</h2>
            <p className="slead">Our managed comms deployments are calibrated to the specific regulatory, operational, and safety requirements of your industry — not a generic setup.</p>
            <div className="ind-grid">
              <div className="ind-card">
                <svg className="ind-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="28" width="36" height="14" rx="1" /><path d="M6 28L14 14h20l8 14" /><path d="M20 14V8h8v6" /></svg>
                <div className="ind-name">Construction</div>
                <div className="ind-body">Multi-crew job sites where structural steel, concrete, MEP, and crane operations run simultaneously — often in adjacent zones. Crew isolation and crane-specific channels are critical to preventing signal conflicts during lifts and coordinated pours.</div>
                <div className="ind-channels">
                  {[['#F0A500', 'Site Command'], ['#3B8EFF', 'Trade Crew Channels (per crew)'], ['#A855F7', 'Crane Operations (dedicated)'], ['#F87171', 'Safety / EHS'], ['#E84040', 'Emergency All-Call']].map(([color, label]) => (
                    <div className="ind-ch" key={label}><div className="ind-ch-dot" style={{ background: color }}></div>{label}</div>
                  ))}
                </div>
              </div>
              <div className="ind-card">
                <svg className="ind-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="24" r="10" /><path d="M24 4v8m0 24v8M4 24h8m24 0h8" /><path d="M14 8l4 4m12 20 4 4M8 34l4-4m20-12 4-4" /></svg>
                <div className="ind-name">Oil &amp; Gas</div>
                <div className="ind-body">The highest-stakes environment we serve. Zone 1 and Zone 2 classified areas with H2S, methane, and explosive atmospheres. Every device is ATEX Zone 1 certified with documentation on site before the first shift. No exceptions. No workarounds.</div>
                <div className="ind-channels">
                  {[['#F0A500', 'Wellhead Operations'], ['#3B8EFF', 'Drilling Crew'], ['#00C07F', 'Pipeline / Completion'], ['#F87171', 'H2S / Safety Monitor'], ['#E84040', 'Emergency / Muster']].map(([color, label]) => (
                    <div className="ind-ch" key={label}><div className="ind-ch-dot" style={{ background: color }}></div>{label}</div>
                  ))}
                </div>
              </div>
              <div className="ind-card">
                <svg className="ind-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="40" height="28" rx="2" /><path d="M16 38v4m16-4v4m-20 0h24M4 22h40" /></svg>
                <div className="ind-name">Commercial &amp; Industrial</div>
                <div className="ind-body">Large-format commercial spaces — warehouses, distribution centers, arenas, data centers — where departments must communicate without bleeding into each other. Each department gets an isolated channel with management cross-channel visibility.</div>
                <div className="ind-channels">
                  {[['#F0A500', 'Management / Ops Command'], ['#3B8EFF', 'Department Channels'], ['#FCD34D', 'Security'], ['#E84040', 'Emergency All-Call']].map(([color, label]) => (
                    <div className="ind-ch" key={label}><div className="ind-ch-dot" style={{ background: color }}></div>{label}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="cta-section">
          <div className="sw" style={{ textAlign: 'center' }}>
            <div className="cta-bg-text">CLEARCOMM</div>
            <div className="cta-content">
              <div className="eyebrow" style={{ justifyContent: 'center' }}>Get Started</div>
              <h2 className="cta-title">Tell Us About<br /><span style={{ color: 'var(--signal)' }}>Your Site.</span></h2>
              <p className="cta-body">We'll have a conversation, learn what your site needs, and put together a plan built around your crews. No generic quotes — just a system that actually works for the job you're running.</p>
              <div className="cta-actions">
                <button className="btn-primary" onClick={() => goPage('pricing')}>Request a Deployment Quote</button>
                <button className="btn-outline" onClick={() => scrollToId('architecture')}>See How It's Configured</button>
              </div>
            </div>
          </div>
        </div>

        <footer>
          <div className="footer-left">ClearComm — Managed Site Communications<br />© 2025 All Rights Reserved · ATEX · IECEx · OSHA Compliant</div>
          <ul className="footer-links">
            <li><a onClick={() => scrollToId('architecture')}>Channel Arch</a></li>
            <li><a onClick={() => scrollToId('process')}>How It Works</a></li>
            <li><a onClick={() => scrollToId('safety')}>Safety</a></li>
            <li><a onClick={() => goPage('pricing')}>Get a Quote</a></li>
          </ul>
        </footer>
      </div>

      {/* PRICING PAGE */}
      <div className={`page pricing-pg${page === 'pricing' ? ' active' : ''}`}>
        <div className="pricing-hdr">
          <div className="pricing-hdr-inner">
            <div>
              <div className="pbc">
                <span onClick={() => goPage('home')}>ClearComm</span>
                <span className="pbc-sep">›</span>
                <span>Deployment Quote</span>
              </div>
              <h1 className="ph-title">Let's Talk<br />About Your Site</h1>
              <p className="ph-sub">No rate cards, no standard packages. We scope every deployment based on your site, your crews, and what the work actually requires. Fill this out and someone from our team will call you within 4 hours — not to sell you, to understand what you need.</p>
            </div>
            <div className="trust-list">
              {['No off-the-shelf pricing', 'Response within 4 hours', 'OSHA cert docs included', 'Dedicated deployment specialist', 'No commitment to quote'].map(t => (
                <div className="trust-row" key={t}>
                  <svg className="trust-ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="form-outer">
          <div>
            {/* Section 1 */}
            <div className="form-card">
              <div className="fc-head"><div className="fc-badge">1</div><div className="fc-title">Your Contact Information</div></div>
              <div className="fb">
                <div className="frow">
                  <div className="fg">
                    <label htmlFor="fname">First Name <span className="req">*</span></label>
                    <input id="fname" type="text" placeholder="John" value={form.fname} onChange={e => updateForm('fname', e.target.value)} className={errors.fname ? 'err' : ''} />
                    {errors.fname && <div className="ferr show">Required</div>}
                  </div>
                  <div className="fg">
                    <label htmlFor="lname">Last Name <span className="req">*</span></label>
                    <input id="lname" type="text" placeholder="Smith" value={form.lname} onChange={e => updateForm('lname', e.target.value)} className={errors.lname ? 'err' : ''} />
                    {errors.lname && <div className="ferr show">Required</div>}
                  </div>
                </div>
                <div className="frow">
                  <div className="fg">
                    <label htmlFor="email">Email <span className="req">*</span></label>
                    <input id="email" type="email" placeholder="john@company.com" value={form.email} onChange={e => updateForm('email', e.target.value)} className={errors.email ? 'err' : ''} />
                    {errors.email && <div className="ferr show">Valid email required</div>}
                  </div>
                  <div className="fg">
                    <label htmlFor="phone">Phone <span className="req">*</span></label>
                    <input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => updateForm('phone', e.target.value)} className={errors.phone ? 'err' : ''} />
                    {errors.phone && <div className="ferr show">Required</div>}
                  </div>
                </div>
                <div className="frow">
                  <div className="fg">
                    <label htmlFor="company">Company <span className="req">*</span></label>
                    <input id="company" type="text" placeholder="Acme Construction Ltd." value={form.company} onChange={e => updateForm('company', e.target.value)} className={errors.company ? 'err' : ''} />
                    {errors.company && <div className="ferr show">Required</div>}
                  </div>
                  <div className="fg">
                    <label htmlFor="jobtitle">Your Role / Title</label>
                    <input id="jobtitle" type="text" placeholder="Site Superintendent" value={form.jobtitle} onChange={e => updateForm('jobtitle', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="form-card">
              <div className="fc-head"><div className="fc-badge">2</div><div className="fc-title">Project &amp; Site Details</div></div>
              <div className="fb">
                <div className="frow">
                  <div className="fg">
                    <label htmlFor="industry">Industry / Sector <span className="req">*</span></label>
                    <select id="industry" value={form.industry} onChange={e => updateForm('industry', e.target.value)} className={errors.industry ? 'err' : ''}>
                      <option value="">Select sector...</option>
                      <option>Construction — General</option>
                      <option>Construction — Oil Field / Industrial</option>
                      <option>Oil &amp; Gas — Upstream / Drilling</option>
                      <option>Oil &amp; Gas — Midstream / Pipeline</option>
                      <option>Oil &amp; Gas — Downstream / Refinery</option>
                      <option>Commercial — Warehouse / Distribution</option>
                      <option>Commercial — Hospitality / Events</option>
                      <option>Mining / Aggregate</option>
                      <option>Other Industrial</option>
                    </select>
                    {errors.industry && <div className="ferr show">Required</div>}
                  </div>
                  <div className="fg">
                    <label htmlFor="location">Site Location <span className="req">*</span></label>
                    <input id="location" type="text" placeholder="City, State / Province" value={form.location} onChange={e => updateForm('location', e.target.value)} className={errors.location ? 'err' : ''} />
                    {errors.location && <div className="ferr show">Required</div>}
                  </div>
                </div>
                <div className="frow">
                  <div className="fg">
                    <label htmlFor="startdate">Deployment Start Date <span className="req">*</span></label>
                    <input id="startdate" type="date" value={form.startdate} onChange={e => updateForm('startdate', e.target.value)} className={errors.startdate ? 'err' : ''} />
                    {errors.startdate && <div className="ferr show">Required</div>}
                  </div>
                  <div className="fg">
                    <label htmlFor="duration">Estimated Duration <span className="req">*</span></label>
                    <select id="duration" value={form.duration} onChange={e => updateForm('duration', e.target.value)} className={errors.duration ? 'err' : ''}>
                      <option value="">Select duration...</option>
                      <option>Days (1–7 days)</option>
                      <option>Weeks (1–4 weeks)</option>
                      <option>Months (1–3 months)</option>
                      <option>Extended (3–12 months)</option>
                      <option>Ongoing / Long-term</option>
                    </select>
                    {errors.duration && <div className="ferr show">Required</div>}
                  </div>
                </div>
                <div className="fg">
                  <label>Hazardous Area Classification (select all that apply)</label>
                  <div className="check-grid">
                    {HAZARD_OPTS.map(opt => (
                      <CheckOpt key={opt} label={opt} checked={hazards.has(opt)} onToggle={() => toggleSet(setHazards, opt)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="form-card">
              <div className="fc-head"><div className="fc-badge">3</div><div className="fc-title">Communication Requirements</div></div>
              <div className="fb">
                <div className="fg">
                  <label>Approximate Number of Users / Devices <span className="req">*</span></label>
                  <div className="qty-wrap">
                    {QTY_OPTS.map(q => (
                      <div key={q} className={`qty-chip${selQty === q ? ' on' : ''}`} onClick={() => { setSelQty(q); setErrors(e => ({ ...e, qty: false })) }}>{q}</div>
                    ))}
                  </div>
                  {errors.qty && <div className="ferr show">Please select a device count range</div>}
                </div>
                <div className="fg">
                  <label>Crew / Role Types on Site (select all that apply)</label>
                  <div className="check-grid">
                    {CREW_OPTS.map(opt => (
                      <CheckOpt key={opt} label={opt} checked={crewTypes.has(opt)} onToggle={() => toggleSet(setCrewTypes, opt)} />
                    ))}
                  </div>
                </div>
                <div className="fg">
                  <label>Infrastructure Needs (select all that apply)</label>
                  <div className="check-grid">
                    {INFRA_OPTS.map(opt => (
                      <CheckOpt key={opt} label={opt} checked={infra.has(opt)} onToggle={() => toggleSet(setInfra, opt)} />
                    ))}
                  </div>
                </div>
                <div className="fg frow full">
                  <label>Tell us about your site — crews, scope, challenges, OSHA concerns</label>
                  <textarea placeholder="Describe your operation: what crews are on site, any known hazardous areas, current communication issues, OSHA requirements you need to meet, or anything else we should know before designing your system..." value={form.notes} onChange={e => updateForm('notes', e.target.value)}></textarea>
                </div>
                <div className="submit-wrap">
                  <button className="btn-submit" onClick={submitForm} disabled={submitting}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    {submitting ? 'Submitting...' : 'Submit Deployment Quote Request'}
                  </button>
                  {submitError && (
                    <div className="ferr show" style={{ textAlign: 'center', marginBottom: '10px' }}>
                      Something went wrong. Please try again or call 1-800-CLR-COMM.
                    </div>
                  )}
                  <div className="submit-note">A ClearComm deployment specialist will respond within 4 business hours. Your information is never shared or sold. No commitment required.</div>
                </div>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="sb-card">
              <div className="sb-head">// What Happens Next</div>
              <div className="sb-body">
                {[['Step 1', 'We call you (~4hrs)'], ['Step 2', 'Learn your site & crews'], ['Step 3', 'Build your channel plan'], ['Step 4', '2-day on-site setup'], ['Ongoing', '24/7 phone support']].map(([k, v], i, arr) => (
                  <div className="sb-row" key={k} style={i === arr.length - 1 ? { borderBottom: 'none' } : {}}><span className="sb-key">{k}</span><span className="sb-val">{v}</span></div>
                ))}
                <div style={{ marginTop: '16px' }}><div className="sb-note">We learn your operation before we price anything. No generic quotes.</div></div>
              </div>
            </div>
            <div className="sb-card">
              <div className="sb-head">// Urgent Deployment?</div>
              <div className="sb-body">
                <div className="sb-phone">1-800-CLR-COMM</div>
                <div className="sb-note">24/7 for active site emergencies and same-day deployment requests. Our on-call team can mobilize within hours for critical-path projects.</div>
              </div>
            </div>
            <div className="sb-card">
              <div className="sb-head">// Included With Every Deployment</div>
              <div className="sb-body">
                {[['Equipment', 'All radios & accessories'], ['Spares', '20% spare float, pre-configured'], ['Setup', '2-day on-site deployment'], ['Briefings', 'Crew training, every team'], ['Docs', 'OSHA cert package'], ['Support', '24/7 phone, dedicated contact'], ['Pickup', 'Full retrieval at project end']].map(([k, v], i, arr) => (
                  <div className="sb-row" key={k} style={i === arr.length - 1 ? { borderBottom: 'none' } : {}}><span className="sb-key">{k}</span><span className="sb-val">{v}</span></div>
                ))}
              </div>
            </div>
            <div className="sb-card">
              <div className="sb-head">// Active Certifications</div>
              <div className="sb-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['ATEX II 1G / 2G', 'IECEx Zone 0/1/2', 'NEC Class I Div 1 & 2', 'NFPA 70 / NEC 500', 'FCC Part 90 Licensed', 'CSA Canada'].map(c => (
                  <div className="sb-note" key={c} style={{ display: 'flex', gap: '8px' }}><span style={{ color: 'var(--signal)' }}>✓</span>{c}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer>
          <div className="footer-left">ClearComm — Managed Site Communications<br />© 2025 All Rights Reserved</div>
          <ul className="footer-links">
            <li><a onClick={() => goPage('home')}>Home</a></li>
            <li><a onClick={() => { goPage('home'); setTimeout(() => scrollToId('safety'), 120) }}>Safety</a></li>
            <li><a>Contact</a></li>
          </ul>
        </footer>
      </div>

      {/* SUCCESS OVERLAY */}
      <div className={`success-overlay${showSuccess ? ' show' : ''}`}>
        <div className="success-modal">
          <div className="s-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="s-title">Request Received</div>
          <div className="s-sub">Your deployment quote request is in. A ClearComm deployment specialist will contact you within 4 business hours with a fully scoped proposal for your site.</div>
          <div className="s-ref">{refNum}</div>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setShowSuccess(false); goPage('home') }}>Back to Home</button>
        </div>
      </div>
    </>
  )
}
