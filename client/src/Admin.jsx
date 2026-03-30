import { useState, useEffect, useCallback } from 'react'

const STATUS_CONFIG = {
  new:      { label: 'New',      color: '#3B8EFF', bg: 'rgba(59,142,255,0.12)',  border: 'rgba(59,142,255,0.35)' },
  active:   { label: 'Active',   color: '#F0A500', bg: 'rgba(240,165,0,0.12)',   border: 'rgba(240,165,0,0.35)'  },
  complete: { label: 'Complete', color: '#00C07F', bg: 'rgba(0,192,127,0.12)',   border: 'rgba(0,192,127,0.35)'  },
}

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.new
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.1em',
      textTransform: 'uppercase', color: c.color, background: c.bg,
      border: `1px solid ${c.border}`, padding: '3px 10px',
    }}>{c.label}</span>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--ink3)', border: '1px solid var(--wire)',
      padding: '24px 28px', flex: 1,
    }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '10px' }}>{label}</div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '48px', color: color || 'var(--signal)', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function InquiryCard({ inquiry, password, onStatusChange }) {
  const [open, setOpen]           = useState(false)
  const [notes, setNotes]         = useState(inquiry.admin_notes || '')
  const [savingNotes, setSaving]  = useState(false)
  const [savedNote, setSavedNote] = useState(false)

  const updateStatus = async (status) => {
    await fetch(`/api/admin/inquiries/${inquiry.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ status }),
    })
    onStatusChange(inquiry.id, status)
  }

  const saveNotes = async () => {
    setSaving(true)
    await fetch(`/api/admin/inquiries/${inquiry.id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ adminNotes: notes }),
    })
    setSaving(false)
    setSavedNote(true)
    setTimeout(() => setSavedNote(false), 2000)
  }

  const d = inquiry
  const created = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid var(--wire)', marginBottom: '4px', transition: 'border-color 0.2s', borderColor: open ? 'var(--sigborder)' : undefined }}>
      {/* Header row */}
      <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <StatusBadge status={d.status || 'new'} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text)', marginBottom: '3px' }}>
            {d.first_name} {d.last_name} — {d.company}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--dim)' }}>{d.industry} · {d.location}</div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--faint)', textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: 'var(--signal)', marginBottom: '2px' }}>{d.ref_num}</div>
          <div>{created}</div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--faint)', marginLeft: '8px' }}>{open ? '▴' : '▾'}</div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop: '1px solid var(--wire)', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <div style={sectionLabel}>Contact</div>
              <Row k="Email"   v={d.email} />
              <Row k="Phone"   v={d.phone} />
              <Row k="Title"   v={d.job_title || '—'} />
            </div>
            <div>
              <div style={sectionLabel}>Project</div>
              <Row k="Start"    v={d.start_date} />
              <Row k="Duration" v={d.duration} />
              <Row k="Devices"  v={d.qty} />
            </div>
            <div>
              <div style={sectionLabel}>Requirements</div>
              <Row k="Hazards"  v={d.hazards?.join(', ') || '—'} />
              <Row k="Crews"    v={d.crew_types?.join(', ') || '—'} />
              <Row k="Infra"    v={d.infra?.join(', ') || '—'} />
            </div>
          </div>

          {d.notes && (
            <div style={{ background: 'var(--ink3)', border: '1px solid var(--wire)', padding: '14px 18px', marginBottom: '20px' }}>
              <div style={sectionLabel}>Client Notes</div>
              <div style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.7 }}>{d.notes}</div>
            </div>
          )}

          {/* Admin notes */}
          <div style={{ marginBottom: '20px' }}>
            <div style={sectionLabel}>Internal Notes</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add internal notes..."
              style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--wire)', color: 'var(--text)', padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: '13px', outline: 'none', resize: 'vertical', minHeight: '80px' }}
              onFocus={e => e.target.style.borderColor = 'var(--signal)'}
              onBlur={e => e.target.style.borderColor = 'var(--wire)'}
            />
            <button onClick={saveNotes} disabled={savingNotes} style={{
              marginTop: '8px', background: 'var(--ink4)', border: '1px solid var(--wire2)',
              color: savedNote ? 'var(--go)' : 'var(--dim)', padding: '7px 16px',
              fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>
              {savedNote ? '✓ Saved' : savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          {/* Status buttons */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: '8px' }}>Set Status:</span>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => updateStatus(key)} style={{
                background: d.status === key ? cfg.bg : 'var(--ink3)',
                border: `1px solid ${d.status === key ? cfg.border : 'var(--wire)'}`,
                color: d.status === key ? cfg.color : 'var(--dim)',
                padding: '7px 16px', fontFamily: "'JetBrains Mono',monospace",
                fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              }}>{cfg.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const sectionLabel = {
  fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'var(--faint)', marginBottom: '10px',
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '12px' }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--faint)', width: '70px', flexShrink: 0 }}>{k}</span>
      <span style={{ color: 'var(--text)' }}>{v}</span>
    </div>
  )
}

export default function Admin({ onExit }) {
  const [authed, setAuthed]         = useState(false)
  const [password, setPassword]     = useState('')
  const [loginErr, setLoginErr]     = useState(false)
  const [inquiries, setInquiries]   = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [filter, setFilter]         = useState('all')

  const load = useCallback(async (pass) => {
    setLoading(true)
    const [iq, st] = await Promise.all([
      fetch('/api/admin/inquiries', { headers: { 'x-admin-password': pass } }).then(r => r.json()),
      fetch('/api/admin/stats',     { headers: { 'x-admin-password': pass } }).then(r => r.json()),
    ])
    setInquiries(Array.isArray(iq) ? iq : [])
    setStats(st.error ? null : st)
    setLoading(false)
  }, [])

  const login = async () => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setAuthed(true)
      setLoginErr(false)
      load(password)
    } else {
      setLoginErr(true)
    }
  }

  const handleStatusChange = (id, status) => {
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => (i.status || 'new') === filter)

  const byStatus = (s) => inquiries.filter(i => (i.status || 'new') === s).length

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', paddingTop: '68px' }}>
        <div style={{ background: 'var(--ink2)', border: '1px solid var(--sigborder)', padding: '48px', width: '100%', maxWidth: '400px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--signal)' }} />
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--signal)', marginBottom: '24px' }}>// Admin Access</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '36px', color: 'var(--text)', marginBottom: '28px', lineHeight: 1 }}>ClearComm<br />Dashboard</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--faint)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginErr(false) }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter admin password"
              style={{ background: 'var(--ink3)', border: `1px solid ${loginErr ? 'var(--alert)' : 'var(--wire)'}`, color: 'var(--text)', padding: '12px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: '14px', outline: 'none', width: '100%' }}
            />
            {loginErr && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--alert)' }}>Incorrect password</div>}
          </div>
          <button onClick={login} style={{
            marginTop: '20px', width: '100%', background: 'var(--signal)', color: '#000', border: 'none',
            padding: '14px', fontFamily: "'JetBrains Mono',monospace", fontSize: '11px',
            letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}>Enter Dashboard</button>
          <button onClick={onExit} style={{
            marginTop: '10px', width: '100%', background: 'transparent', color: 'var(--dim)',
            border: '1px solid var(--wire)', padding: '10px', fontFamily: "'JetBrains Mono',monospace",
            fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
          }}>← Back to Site</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '68px', paddingBottom: '40px' }}>
      {/* Dashboard header */}
      <div style={{ background: 'var(--ink2)', borderBottom: '1px solid var(--wire)', padding: '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--signal)', marginBottom: '6px' }}>// Admin Dashboard</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '36px', color: 'var(--text)', lineHeight: 1 }}>Inquiries</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => load(password)} style={{ background: 'var(--ink3)', border: '1px solid var(--wire)', color: 'var(--dim)', padding: '9px 18px', fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>↻ Refresh</button>
          <button onClick={onExit} style={{ background: 'transparent', border: '1px solid var(--wire)', color: 'var(--dim)', padding: '9px 18px', fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>← Site</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 48px' }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '40px' }}>
            <StatCard label="Total Visits"    value={stats.totalVisits}     />
            <StatCard label="Total Inquiries" value={stats.totalInquiries}  />
            <StatCard label="New"      value={byStatus('new')}      color="#3B8EFF" />
            <StatCard label="Active"   value={byStatus('active')}   color="#F0A500" />
            <StatCard label="Complete" value={byStatus('complete')} color="#00C07F" />
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '20px' }}>
          {['all', 'new', 'active', 'complete'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'var(--signal)' : 'var(--ink3)',
              color: filter === f ? '#000' : 'var(--dim)',
              border: '1px solid var(--wire)', padding: '8px 20px',
              fontFamily: "'JetBrains Mono',monospace", fontSize: '10px',
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
              {f === 'all' ? `All (${inquiries.length})` : `${f} (${byStatus(f)})`}
            </button>
          ))}
        </div>

        {/* Inquiry list */}
        {loading ? (
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '12px', color: 'var(--dim)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '12px', color: 'var(--faint)', padding: '60px 0', textAlign: 'center', border: '1px solid var(--wire)' }}>
            No inquiries{filter !== 'all' ? ` with status "${filter}"` : ''} yet.
          </div>
        ) : (
          filtered.map(inquiry => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} password={password} onStatusChange={handleStatusChange} />
          ))
        )}
      </div>
    </div>
  )
}
