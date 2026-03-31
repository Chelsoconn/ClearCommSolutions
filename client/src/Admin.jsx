import { useState, useEffect, useCallback, useRef } from 'react'

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

function InquiryCard({ inquiry, password, onStatusChange, onNotesSaved }) {
  const [open, setOpen]           = useState(false)
  const [notes, setNotes]         = useState(inquiry.admin_notes || '')
  const [savingNotes, setSaving]  = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const [activity, setActivity]   = useState(null)

  const loadActivity = async () => {
    const res = await fetch(`/api/admin/inquiries/${inquiry.id}/activity`, {
      headers: { 'x-admin-password': password },
    })
    const data = await res.json()
    setActivity(Array.isArray(data) ? data : [])
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && activity === null) loadActivity()
  }

  const updateStatus = async (status) => {
    if ((inquiry.status || 'new') === status) return
    await fetch(`/api/admin/inquiries/${inquiry.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ status }),
    })
    onStatusChange(inquiry.id, status)
    loadActivity()
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
    setNotes('')
    onNotesSaved(inquiry.id)
    setTimeout(() => setSavedNote(false), 2000)
    loadActivity()
  }

  const d = inquiry
  const created = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid var(--wire)', marginBottom: '4px', transition: 'border-color 0.2s', borderColor: open ? 'var(--sigborder)' : undefined }}>
      {/* Header row */}
      <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={toggle}>
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
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '28px' }}>
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

          {/* Invoice */}
          <InvoicePanel inquiry={inquiry} password={password} />

          {/* Activity log */}
          {activity && activity.length > 0 && (
            <div style={{ borderTop: '1px solid var(--wire)', paddingTop: '20px' }}>
              <div style={sectionLabel}>Activity Log</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activity.map(row => {
                  const ts = new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  const isStatus = row.action_type === 'status_change'
                  const cfg = isStatus ? STATUS_CONFIG[row.value] : null
                  return (
                    <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '12px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--faint)', flexShrink: 0, minWidth: '160px' }}>{ts}</span>
                      {isStatus ? (
                        <span style={{ color: 'var(--dim)' }}>
                          Status set to <span style={{ color: cfg?.color || 'var(--signal)', fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', textTransform: 'uppercase' }}>{row.value}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--dim)' }}>
                          Note saved: <span style={{ color: 'var(--text)', fontStyle: 'italic' }}>"{row.value?.slice(0, 80)}{row.value?.length > 80 ? '…' : ''}"</span>
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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

function InvoicePanel({ inquiry, password }) {
  const [invoice, setInvoice] = useState(undefined)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    jobNumber: '', invoiceDate: '', dueDate: '',
    dailyRate: '', totalDays: '',
    promo: '', promoAmount: '', paid: false, paidDate: '', notes: '',
  })

  useEffect(() => {
    fetch(`/api/admin/inquiries/${inquiry.id}/invoice`, {
      headers: { 'x-admin-password': password },
    }).then(r => r.json()).then(data => {
      setInvoice(data)
      if (data) setForm({
        jobNumber:   data.job_number   || '',
        invoiceDate: data.invoice_date ? data.invoice_date.slice(0, 10) : '',
        dueDate:     data.due_date     ? data.due_date.slice(0, 10) : '',
        dailyRate:   data.daily_rate   || '',
        totalDays:   data.total_days   || '',
        promo:       data.promo        || '',
        promoAmount: data.promo_amount || '',
        paid:        data.paid         || false,
        paidDate:    data.paid_date    ? data.paid_date.slice(0, 10) : '',
        notes:       data.notes        || '',
      })
    })
  }, [inquiry.id, password])

  const computedCost = (form.dailyRate && form.totalDays)
    ? (parseFloat(form.dailyRate) * parseFloat(form.totalDays))
    : null

  const save = async () => {
    setSaving(true)
    const body = {
      refNum:      inquiry.ref_num,
      jobNumber:   form.jobNumber   || null,
      invoiceDate: form.invoiceDate || null,
      dueDate:     form.dueDate     || null,
      dailyRate:   form.dailyRate   ? parseFloat(form.dailyRate)   : null,
      totalDays:   form.totalDays   ? parseFloat(form.totalDays)   : null,
      cost:        computedCost     !== null ? computedCost         : null,
      promo:       form.promo       || null,
      promoAmount: form.promoAmount ? parseFloat(form.promoAmount) : null,
      paid:        form.paid === true,
      paidDate:    form.paidDate    || null,
      notes:       form.notes       || null,
    }
    const url = invoice
      ? `/api/admin/invoices/${invoice.id}`
      : `/api/admin/inquiries/${inquiry.id}/invoice`
    const method = invoice ? 'PATCH' : 'POST'
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify(body),
    })
    const updated = await r.json()
    setInvoice(updated)
    setSaving(false)
    setEditing(false)
  }

  const field = (k, type = 'text', placeholder = '') => (
    <input
      type={type}
      placeholder={placeholder}
      {...(type === 'checkbox'
        ? { checked: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.checked }) )}
        : { value: form[k],   onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) }
      )}
      style={type === 'checkbox'
        ? { accentColor: 'var(--signal)', width: '16px', height: '16px', cursor: 'pointer' }
        : { background: 'var(--ink3)', border: '1px solid var(--wire)', color: 'var(--text)', padding: '7px 10px', fontFamily: "'DM Sans',sans-serif", fontSize: '12px', outline: 'none', width: '100%' }
      }
    />
  )

  const invCost = invoice ? parseFloat(invoice.cost || 0) : 0
  const invDiscount = invoice ? parseFloat(invoice.promo_amount || 0) : 0
  const net = invCost - invDiscount
  const statusColor = invoice?.paid ? '#00C07F' : invoice?.cost ? '#F0A500' : 'var(--faint)'
  const statusLabel = invoice?.paid ? 'Paid' : invoice?.cost ? 'Unpaid' : '—'

  if (invoice === undefined) return null

  return (
    <div style={{ borderTop: '1px solid var(--wire)', paddingTop: '20px', marginTop: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={sectionLabel}>Invoice</div>
          {invoice?.job_id && (
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--signal)', letterSpacing: '0.08em' }}>{invoice.job_id}</span>
          )}
        </div>
        <button onClick={() => setEditing(e => !e)} style={{
          background: 'transparent', border: '1px solid var(--wire)', color: 'var(--dim)',
          padding: '4px 12px', fontFamily: "'JetBrains Mono',monospace", fontSize: '9px',
          letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
        }}>{editing ? 'Cancel' : invoice ? 'Edit' : '+ Create'}</button>
      </div>

      {!editing && invoice && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <Row k="Job #"    v={invoice.job_number || '—'} />
            <Row k="Ref"      v={invoice.ref_num} />
            <Row k="Invoice"  v={invoice.invoice_date ? invoice.invoice_date.slice(0,10) : '—'} />
            <Row k="Due"      v={invoice.due_date ? invoice.due_date.slice(0,10) : '—'} />
          </div>
          <div>
            <Row k="Day Rate" v={invoice.daily_rate ? `$${parseFloat(invoice.daily_rate).toFixed(2)}` : '—'} />
            <Row k="Days"     v={invoice.total_days || '—'} />
            <Row k="Total"    v={invoice.cost ? `$${parseFloat(invoice.cost).toFixed(2)}` : '—'} />
            <Row k="Promo"    v={invoice.promo ? `${invoice.promo}${invoice.promo_amount ? ` (−$${parseFloat(invoice.promo_amount).toFixed(2)})` : ''}` : '—'} />
            <Row k="Net"      v={invoice.cost ? `$${net.toFixed(2)}` : '—'} />
          </div>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--faint)', width: '70px' }}>Status</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{statusLabel}</span>
            </div>
            <Row k="Paid On"  v={invoice.paid_date ? invoice.paid_date.slice(0,10) : '—'} />
            {invoice.notes && <Row k="Notes" v={invoice.notes} />}
          </div>
        </div>
      )}

      {!editing && !invoice && (
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '11px', color: 'var(--faint)' }}>No invoice created yet.</div>
      )}

      {editing && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Job #</div>
              {field('jobNumber', 'text', 'e.g. 001')}
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Invoice Date</div>
              {field('invoiceDate', 'date')}
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Due Date</div>
              {field('dueDate', 'date')}
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Daily Rate ($)</div>
              {field('dailyRate', 'number', '0.00')}
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Total Days</div>
              {field('totalDays', 'number', '0')}
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Total Cost</div>
              <div style={{ padding: '7px 10px', background: 'var(--ink4)', border: '1px solid var(--wire)', fontFamily: "'JetBrains Mono',monospace", fontSize: '12px', color: computedCost !== null ? 'var(--signal)' : 'var(--faint)' }}>
                {computedCost !== null ? `$${computedCost.toFixed(2)}` : '—'}
              </div>
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Promo Code</div>
              {field('promo', 'text', 'Optional')}
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Discount ($)</div>
              {field('promoAmount', 'number', '0.00')}
            </div>
            <div>
              <div style={{ ...sectionLabel, marginBottom: '6px' }}>Paid Date</div>
              {field('paidDate', 'date')}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            {field('paid', 'checkbox')}
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: form.paid ? '#00C07F' : 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Mark as Paid
            </span>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ ...sectionLabel, marginBottom: '6px' }}>Notes</div>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Invoice notes..."
              style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--wire)', color: 'var(--text)', padding: '9px 12px', fontFamily: "'DM Sans',sans-serif", fontSize: '12px', outline: 'none', resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          <button onClick={save} disabled={saving} style={{
            background: 'var(--signal)', color: '#000', border: 'none',
            padding: '9px 24px', fontFamily: "'JetBrains Mono',monospace",
            fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
            fontWeight: 600, cursor: 'pointer',
          }}>{saving ? 'Saving...' : 'Save Invoice'}</button>
        </div>
      )}
    </div>
  )
}

function CompanyGroup({ company, jobs, password, onStatusChange, onNotesSaved, emailFlags }) {
  const [open, setOpen] = useState(false)
  const statuses = ['new', 'active', 'complete']
  const counts = Object.fromEntries(statuses.map(s => [s, jobs.filter(j => (j.status || 'new') === s).length]))
  const emails = [...new Set(jobs.map(j => j.email).filter(Boolean))]
  const flaggedEmails = emails.filter(e => emailFlags.has(e))

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid var(--wire)', marginBottom: '4px' }}>
      <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: 'var(--text)', letterSpacing: '0.04em' }}>{company}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--faint)', background: 'var(--ink3)', border: '1px solid var(--wire)', padding: '2px 8px' }}>
              {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            </span>
            {flaggedEmails.length > 0 && (
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', color: '#F0A500', background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.35)', padding: '2px 8px', letterSpacing: '0.08em' }}>
                ⚑ shared contact
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {statuses.map(s => counts[s] > 0 && (
              <span key={s} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', letterSpacing: '0.08em', color: STATUS_CONFIG[s].color }}>
                {counts[s]} {s}
              </span>
            ))}
            <span style={{ color: 'var(--wire)', fontSize: '10px' }}>·</span>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '12px', color: 'var(--faint)' }}>
              {emails.join(', ')}
            </span>
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--faint)' }}>{open ? '▴' : '▾'}</div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--wire)', padding: '4px 16px 16px' }}>
          {jobs.map(inquiry => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} password={password} onStatusChange={onStatusChange} onNotesSaved={onNotesSaved} />
          ))}
        </div>
      )}
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
  const [view, setView]             = useState('inquiries')
  const [listMode, setListMode]     = useState('list')

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

  const handleNotesSaved = (id) => {
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, admin_notes: '' } : i))
  }

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => (i.status || 'new') === filter)

  const byStatus = (s) => inquiries.filter(i => (i.status || 'new') === s).length

  // Build company groups from filtered inquiries
  const companyGroups = (() => {
    const map = {}
    filtered.forEach(inq => {
      const key = (inq.company || 'Unknown').toLowerCase().trim()
      if (!map[key]) map[key] = { name: inq.company || 'Unknown', jobs: [] }
      map[key].jobs.push(inq)
    })
    return Object.values(map).sort((a, b) =>
      new Date(b.jobs[0].created_at) - new Date(a.jobs[0].created_at)
    )
  })()

  // Find emails that appear across more than one company
  const emailFlags = (() => {
    const emailToCompanies = {}
    inquiries.forEach(inq => {
      if (!inq.email) return
      const co = (inq.company || '').toLowerCase().trim()
      if (!emailToCompanies[inq.email]) emailToCompanies[inq.email] = new Set()
      emailToCompanies[inq.email].add(co)
    })
    return new Set(Object.entries(emailToCompanies).filter(([, s]) => s.size > 1).map(([e]) => e))
  })()

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
      <div style={{ background: 'var(--ink2)', borderBottom: '1px solid var(--wire)', padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--signal)', marginBottom: '4px' }}>// Admin Dashboard</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', color: 'var(--text)', lineHeight: 1 }}>ClearComm</div>
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[['inquiries', 'Inquiries'], ['analytics', 'Analytics']].map(([key, label]) => (
              <button key={key} onClick={() => setView(key)} style={{
                background: view === key ? 'var(--signal)' : 'transparent',
                color: view === key ? '#000' : 'var(--dim)',
                border: '1px solid var(--wire)', padding: '9px 22px',
                fontFamily: "'JetBrains Mono',monospace", fontSize: '10px',
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => load(password)} style={{ background: 'var(--ink3)', border: '1px solid var(--wire)', color: 'var(--dim)', padding: '9px 18px', fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>↻ Refresh</button>
          <button onClick={onExit} style={{ background: 'transparent', border: '1px solid var(--wire)', color: 'var(--dim)', padding: '9px 18px', fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>← Site</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 48px' }}>

        {view === 'inquiries' && (
          <>
            {/* Inquiry summary cards */}
            {stats && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
                <StatCard label="Total Inquiries" value={stats.totalInquiries} />
                <StatCard label="New"      value={byStatus('new')}      color="#3B8EFF" />
                <StatCard label="Active"   value={byStatus('active')}   color="#F0A500" />
                <StatCard label="Complete" value={byStatus('complete')} color="#00C07F" />
              </div>
            )}

            {/* Filter + mode row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
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
              <div style={{ display: 'flex', gap: '2px' }}>
                {[['list', 'List'], ['company', 'By Company']].map(([m, label]) => (
                  <button key={m} onClick={() => setListMode(m)} style={{
                    background: listMode === m ? 'var(--ink4)' : 'transparent',
                    color: listMode === m ? 'var(--signal)' : 'var(--faint)',
                    border: `1px solid ${listMode === m ? 'var(--sigborder)' : 'var(--wire)'}`,
                    padding: '8px 16px', fontFamily: "'JetBrains Mono',monospace",
                    fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '12px', color: 'var(--dim)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '12px', color: 'var(--faint)', padding: '60px 0', textAlign: 'center', border: '1px solid var(--wire)' }}>
                No inquiries{filter !== 'all' ? ` with status "${filter}"` : ''} yet.
              </div>
            ) : listMode === 'list' ? (
              filtered.map(inquiry => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} password={password} onStatusChange={handleStatusChange} onNotesSaved={handleNotesSaved} />
              ))
            ) : (
              companyGroups.map(group => (
                <CompanyGroup key={group.name} company={group.name} jobs={group.jobs} password={password} onStatusChange={handleStatusChange} onNotesSaved={handleNotesSaved} emailFlags={emailFlags} />
              ))
            )}
          </>
        )}

        {view === 'analytics' && stats && (
          <>
            {/* Visit stat cards */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <StatCard label="Total Visits" value={stats.totalVisits} />
              <StatCard label="Unique IPs"   value={stats.uniqueIps}   />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
              {/* Visits by page */}
              <div style={{ background: 'var(--ink3)', border: '1px solid var(--wire)', padding: '24px 28px' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: '16px' }}>Visits by Page</div>
                {stats.byPage.map(row => {
                  const pct = Math.round((row.count / stats.totalVisits) * 100)
                  return (
                    <div key={row.page} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.page}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '11px', color: 'var(--signal)' }}>{row.count} <span style={{ color: 'var(--faint)' }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: '3px', background: 'var(--wire)', borderRadius: '1px' }}>
                        <div style={{ height: '3px', width: `${pct}%`, background: 'var(--signal)', borderRadius: '1px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Daily visits — last 14 days */}
              <div style={{ background: 'var(--ink3)', border: '1px solid var(--wire)', padding: '24px 28px' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: '16px' }}>Daily Visits — Last 14 Days</div>
                {stats.dailyVisits.length === 0 ? (
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '11px', color: 'var(--faint)' }}>No data yet.</div>
                ) : (() => {
                  const max = Math.max(...stats.dailyVisits.map(r => parseInt(r.count)))
                  return stats.dailyVisits.map(row => {
                    const pct = Math.round((parseInt(row.count) / max) * 100)
                    const label = new Date(row.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                    return (
                      <div key={row.day} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--dim)' }}>{label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: 'var(--signal)' }}>{row.count}</span>
                        </div>
                        <div style={{ height: '3px', background: 'var(--wire)', borderRadius: '1px' }}>
                          <div style={{ height: '3px', width: `${pct}%`, background: 'var(--signal)', borderRadius: '1px' }} />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Recent visits table */}
            <div style={{ background: 'var(--ink3)', border: '1px solid var(--wire)', padding: '24px 28px' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: '16px' }}>Recent Visits</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono',monospace", fontSize: '11px' }}>
                  <thead>
                    <tr>
                      {['Time', 'Page', 'IP', 'Browser'].map(h => (
                        <th key={h} style={{ textAlign: 'left', color: 'var(--faint)', fontWeight: 400, paddingBottom: '10px', paddingRight: '24px', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '9px', borderBottom: '1px solid var(--wire)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentVisits.map((v, i) => {
                      const ts = new Date(v.visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      const ua = v.user_agent || '—'
                      const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : ua.includes('curl') ? 'curl' : ua.slice(0, 40)
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--wire)' }}>
                          <td style={{ padding: '8px 24px 8px 0', color: 'var(--faint)' }}>{ts}</td>
                          <td style={{ padding: '8px 24px 8px 0', color: 'var(--signal)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{v.page}</td>
                          <td style={{ padding: '8px 24px 8px 0', color: 'var(--dim)' }}>{v.ip || '—'}</td>
                          <td style={{ padding: '8px 0', color: 'var(--faint)' }}>{browser}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
