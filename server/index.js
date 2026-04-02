import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import postmark from 'postmark';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Create tables on startup
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id          SERIAL PRIMARY KEY,
      page        TEXT NOT NULL,
      ip          TEXT,
      user_agent  TEXT,
      visited_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id          SERIAL PRIMARY KEY,
      ref_num     TEXT UNIQUE NOT NULL,
      first_name  TEXT,
      last_name   TEXT,
      email       TEXT,
      phone       TEXT,
      company     TEXT,
      industry    TEXT,
      location    TEXT,
      notes       TEXT,
      status      TEXT DEFAULT 'new',
      admin_notes TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS admin_notes TEXT;
    ALTER TABLE inquiries DROP COLUMN IF EXISTS job_title;
    ALTER TABLE inquiries DROP COLUMN IF EXISTS start_date;
    ALTER TABLE inquiries DROP COLUMN IF EXISTS duration;
    ALTER TABLE inquiries DROP COLUMN IF EXISTS qty;
    ALTER TABLE inquiries DROP COLUMN IF EXISTS hazards;
    ALTER TABLE inquiries DROP COLUMN IF EXISTS crew_types;
    ALTER TABLE inquiries DROP COLUMN IF EXISTS infra;

    CREATE TABLE IF NOT EXISTS invoices (
      id            SERIAL PRIMARY KEY,
      inquiry_id    INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      ref_num       TEXT NOT NULL,
      job_id        TEXT,
      job_number    TEXT,
      invoice_date  DATE,
      due_date      DATE,
      daily_rate    NUMERIC(10,2),
      total_days    NUMERIC(6,1),
      cost          NUMERIC(10,2),
      promo         TEXT,
      promo_amount  NUMERIC(10,2),
      paid          BOOLEAN DEFAULT FALSE,
      paid_date     DATE,
      notes         TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS job_id TEXT;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2);
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_days NUMERIC(6,1);

    CREATE TABLE IF NOT EXISTS admin_activity (
      id           SERIAL PRIMARY KEY,
      inquiry_id   INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      ref_num      TEXT NOT NULL,
      action_type  TEXT NOT NULL,
      value        TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id            SERIAL PRIMARY KEY,
      item_type     TEXT NOT NULL,
      custom_type   TEXT,
      model         TEXT,
      serial_number TEXT,
      purchase_date DATE,
      condition     TEXT DEFAULT 'Good',
      notes         TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS equipment_checkouts (
      id            SERIAL PRIMARY KEY,
      equipment_id  INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      person_name   TEXT NOT NULL,
      company       TEXT,
      inquiry_id    INTEGER REFERENCES inquiries(id) ON DELETE SET NULL,
      checkout_date DATE NOT NULL DEFAULT CURRENT_DATE,
      return_date   DATE,
      notes         TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Database tables ready.');
}

initDb().catch(err => console.error('DB init error:', err));

// Postmark client
const mailer = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

const EMAIL_RECIPIENTS = ['chelseaaoconnor1@gmail.com', 'brandon.oconnor54@gmail.com', 'deploy@clearcommsolutions.com'];

function formatInquiryText(d) {
  return `
NEW CLEARCOMM INQUIRY — ${d.refNum}

CONTACT
  Name:     ${d.firstName} ${d.lastName}
  Email:    ${d.email}
  Phone:    ${d.phone}
  Company:  ${d.company}

SITE
  Industry: ${d.industry}
  Location: ${d.location}

NOTES
  ${d.notes || 'None'}
`.trim();
}

async function sendEmailNotification(d) {
  await mailer.sendEmailBatch(
    EMAIL_RECIPIENTS.map(to => ({
      From: 'ClearComm Solutions <deploy@clearcommsolutions.com>',
      To: to,
      Subject: `New Inquiry ${d.refNum} — ${d.company} (${d.firstName} ${d.lastName})`,
      TextBody: formatInquiryText(d),
    }))
  );
}

async function sendConfirmationEmail(d) {
  await mailer.sendEmail({
    From: 'ClearComm Solutions <deploy@clearcommsolutions.com>',
    To: d.email,
    Subject: `We received your inquiry — ${d.refNum}`,
    TextBody: `Hi ${d.firstName},

Thanks for reaching out to ClearComm. We've received your inquiry and will be in touch shortly.

Your reference number is: ${d.refNum}

Here's a summary of what you submitted:

  Company:  ${d.company}
  Industry: ${d.industry}
  Location: ${d.location}

If you have any questions in the meantime, just reply to this email.

— The ClearComm Team
`.trim(),
  });
}


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Log a page visit
app.post('/api/visit', async (req, res) => {
  try {
    const { page } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;
    await pool.query(
      'INSERT INTO visits (page, ip, user_agent) VALUES ($1, $2, $3)',
      [page, ip, userAgent]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Visit insert error:', err.message);
    res.status(500).json({ error: 'Failed to log visit' });
  }
});

// Submit a quote inquiry
app.post('/api/inquiry', async (req, res) => {
  try {
    const {
      refNum, firstName, lastName, email, phone, company,
      industry, location, notes
    } = req.body;

    await pool.query(
      `INSERT INTO inquiries
        (ref_num, first_name, last_name, email, phone, company, industry, location, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [refNum, firstName, lastName, email, phone, company, industry, location, notes]
    );

    const notifData = { refNum, firstName, lastName, email, phone, company, industry, location, notes };

    sendEmailNotification(notifData).catch(err => console.error('Email error:', err.message));
    sendConfirmationEmail(notifData).catch(err => console.error('Confirmation email error:', err.message));

    res.json({ ok: true });
  } catch (err) {
    console.error('Inquiry insert error:', err.message);
    res.status(500).json({ error: 'Failed to save inquiry' });
  }
});

// Admin auth middleware
function requireAdmin(req, res, next) {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.json({ ok: true });
});

app.get('/api/admin/inquiries', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Admin inquiries error:', err.message);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [visitRows, inquiryRows, statusRows, uniqueIpRows, byPageRows, dailyRows, recentRows] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM visits'),
      pool.query('SELECT COUNT(*) AS total FROM inquiries'),
      pool.query("SELECT status, COUNT(*) AS count FROM inquiries GROUP BY status"),
      pool.query('SELECT COUNT(DISTINCT ip) AS total FROM visits'),
      pool.query('SELECT page, COUNT(*) AS count FROM visits GROUP BY page ORDER BY count DESC'),
      pool.query(`
        SELECT DATE_TRUNC('day', visited_at AT TIME ZONE 'America/Chicago') AS day,
               COUNT(*) AS count
        FROM visits
        WHERE visited_at >= NOW() - INTERVAL '14 days'
        GROUP BY day ORDER BY day ASC
      `),
      pool.query('SELECT ip, page, user_agent, visited_at FROM visits ORDER BY visited_at DESC LIMIT 20'),
    ]);
    res.json({
      totalVisits:    parseInt(visitRows.rows[0].total),
      totalInquiries: parseInt(inquiryRows.rows[0].total),
      uniqueIps:      parseInt(uniqueIpRows.rows[0].total),
      byStatus:       statusRows.rows,
      byPage:         byPageRows.rows,
      dailyVisits:    dailyRows.rows,
      recentVisits:   recentRows.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.patch('/api/admin/inquiries/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await pool.query('UPDATE inquiries SET status=$1 WHERE id=$2 RETURNING ref_num', [status, req.params.id]);
    if (rows.length) {
      await pool.query(
        'INSERT INTO admin_activity (inquiry_id, ref_num, action_type, value) VALUES ($1,$2,$3,$4)',
        [req.params.id, rows[0].ref_num, 'status_change', status]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.patch('/api/admin/inquiries/:id/notes', requireAdmin, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const { rows } = await pool.query('UPDATE inquiries SET admin_notes=$1 WHERE id=$2 RETURNING ref_num', [adminNotes, req.params.id]);
    if (rows.length) {
      await pool.query(
        'INSERT INTO admin_activity (inquiry_id, ref_num, action_type, value) VALUES ($1,$2,$3,$4)',
        [req.params.id, rows[0].ref_num, 'note_saved', adminNotes]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

app.get('/api/admin/inquiries/:id/activity', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM admin_activity WHERE inquiry_id=$1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

app.get('/api/admin/invoices', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        i.id, i.status, i.ref_num, i.first_name, i.last_name, i.company,
        i.industry, i.location, i.created_at,
        inv.id          AS inv_id,
        inv.job_id,
        inv.job_number,
        inv.invoice_date,
        inv.due_date,
        inv.daily_rate,
        inv.total_days,
        inv.cost,
        inv.promo,
        inv.promo_amount,
        inv.paid,
        inv.paid_date,
        inv.notes       AS inv_notes
      FROM inquiries i
      INNER JOIN invoices inv ON inv.inquiry_id = i.id
      ORDER BY i.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

app.get('/api/admin/inquiries/:id/invoice', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM invoices WHERE inquiry_id=$1 LIMIT 1', [req.params.id]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

app.post('/api/admin/inquiries/:id/invoice', requireAdmin, async (req, res) => {
  try {
    const { refNum, invoiceDate, dueDate, dailyRate, totalDays, cost, promo, promoAmount, paid, paidDate, notes } = req.body;
    const jobId = 'JB-' + Math.random().toString(36).toUpperCase().slice(2, 8);
    const { rows } = await pool.query(
      `INSERT INTO invoices (inquiry_id, ref_num, job_id, invoice_date, due_date, daily_rate, total_days, cost, promo, promo_amount, paid, paid_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.params.id, refNum, jobId, invoiceDate || null, dueDate || null,
       dailyRate || null, totalDays || null, cost || null,
       promo || null, promoAmount || null, paid === true, paidDate || null, notes || null]
    );
    const generatedJobNumber = 'JOB-' + String(rows[0].id).padStart(4, '0');
    await pool.query('UPDATE invoices SET job_number=$1 WHERE id=$2', [generatedJobNumber, rows[0].id]);
    rows[0].job_number = generatedJobNumber;
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

app.patch('/api/admin/invoices/:id', requireAdmin, async (req, res) => {
  try {
    const { invoiceDate, dueDate, dailyRate, totalDays, cost, promo, promoAmount, paid, paidDate, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE invoices SET invoice_date=$1, due_date=$2, daily_rate=$3, total_days=$4,
       cost=$5, promo=$6, promo_amount=$7, paid=$8, paid_date=$9, notes=$10 WHERE id=$11 RETURNING *`,
      [invoiceDate || null, dueDate || null, dailyRate || null, totalDays || null,
       cost || null, promo || null, promoAmount || null, paid === true, paidDate || null, notes || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

function buildInvoiceHtml({ inq, inv, isReceipt }) {
  const cost     = parseFloat(inv.cost || 0);
  const discount = parseFloat(inv.promo_amount || 0);
  const net      = cost - discount;
  const fmt      = (d) => d ? String(d).slice(0, 10) : '—';
  const money    = (n) => n ? '$' + parseFloat(n).toFixed(2) : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${isReceipt ? 'Receipt' : 'Invoice'} — ClearComm Solutions</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f1;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f0f1;padding:40px 20px;">
<tr><td align="center">

<!-- Card -->
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #d8d8da;">

  <!-- Amber accent bar -->
  <tr><td height="4" bgcolor="#F0A500" style="background-color:#F0A500;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Dark header -->
  <tr><td bgcolor="#0E0E0F" style="background-color:#0E0E0F;padding:32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="bottom">
        <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#F0A500;font-family:Courier New,monospace;margin-bottom:10px;">ClearComm Solutions</div>
        <div style="font-size:40px;font-weight:800;color:#ffffff;letter-spacing:3px;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;line-height:1;">${isReceipt ? 'RECEIPT' : 'INVOICE'}</div>
      </td>
      <td align="right" valign="bottom">
        ${inv.job_id ? `<div style="font-size:20px;font-weight:700;color:#F0A500;font-family:Courier New,monospace;letter-spacing:1px;">${inv.job_id}</div>` : ''}
        ${inv.job_number ? `<div style="font-size:11px;color:#666;font-family:Courier New,monospace;letter-spacing:2px;margin-top:4px;">${inv.job_number}</div>` : ''}
      </td>
    </tr></table>
  </td></tr>

  <!-- Meta bar -->
  <tr><td bgcolor="#1a1a1c" style="background-color:#1a1a1c;padding:14px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td>
        <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;font-family:Courier New,monospace;margin-bottom:4px;">Ref #</div>
        <div style="font-size:12px;color:#bbb;font-family:Courier New,monospace;">${inv.ref_num}</div>
      </td>
      ${inv.invoice_date ? `<td align="center">
        <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;font-family:Courier New,monospace;margin-bottom:4px;">${isReceipt ? 'Paid On' : 'Invoice Date'}</div>
        <div style="font-size:12px;color:#bbb;font-family:Courier New,monospace;">${isReceipt && inv.paid_date ? fmt(inv.paid_date) : fmt(inv.invoice_date)}</div>
      </td>` : ''}
      ${inv.due_date && !isReceipt ? `<td align="right">
        <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;font-family:Courier New,monospace;margin-bottom:4px;">Due Date</div>
        <div style="font-size:12px;color:#E84040;font-family:Courier New,monospace;font-weight:700;">${fmt(inv.due_date)}</div>
      </td>` : ''}
    </tr></table>
  </td></tr>

  <!-- Billed To / Project -->
  <tr><td style="padding:32px 40px 0 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="50%" valign="top">
        <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#aaa;font-family:Courier New,monospace;margin-bottom:10px;">Billed To</div>
        <div style="font-size:18px;font-weight:700;color:#0E0E0F;margin-bottom:3px;">${inq.first_name} ${inq.last_name}</div>
        <div style="font-size:14px;color:#444;margin-bottom:3px;">${inq.company}</div>
        <div style="font-size:13px;color:#777;">${inq.email}</div>
      </td>
      <td width="50%" valign="top" align="right">
        <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#aaa;font-family:Courier New,monospace;margin-bottom:10px;">Project</div>
        <div style="font-size:13px;color:#444;margin-bottom:3px;">${inq.industry}</div>
        <div style="font-size:13px;color:#444;">${inq.location}</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Line items -->
  <tr><td style="padding:24px 40px 0 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #0E0E0F;">
      <tr>
        <td style="padding:10px 0;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#aaa;font-family:Courier New,monospace;border-bottom:1px solid #e5e5e5;">Description</td>
        <td align="center" style="padding:10px 0;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#aaa;font-family:Courier New,monospace;border-bottom:1px solid #e5e5e5;white-space:nowrap;">Days</td>
        <td align="right" style="padding:10px 0;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#aaa;font-family:Courier New,monospace;border-bottom:1px solid #e5e5e5;white-space:nowrap;">Day Rate</td>
        <td align="right" style="padding:10px 0;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#aaa;font-family:Courier New,monospace;border-bottom:1px solid #e5e5e5;white-space:nowrap;">Amount</td>
      </tr>
      <tr>
        <td style="padding:18px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
          <div style="font-size:14px;font-weight:700;color:#0E0E0F;margin-bottom:4px;">Push-to-Talk Communication Services</div>
          <div style="font-size:12px;color:#999;">Radio device rental &amp; field support</div>
        </td>
        <td align="center" style="padding:18px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:14px;color:#444;">${inv.total_days || '—'}</td>
        <td align="right" style="padding:18px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:14px;color:#444;">${money(inv.daily_rate)}</td>
        <td align="right" style="padding:18px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:15px;font-weight:700;color:#0E0E0F;">${money(inv.cost)}</td>
      </tr>
      ${discount > 0 ? `<tr>
        <td colspan="3" align="right" style="padding:12px 8px 12px 0;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;">Discount${inv.promo ? ` — ${inv.promo}` : ''}</td>
        <td align="right" style="padding:12px 0;font-size:13px;color:#E84040;font-weight:600;border-bottom:1px solid #f0f0f0;">&#8722;$${discount.toFixed(2)}</td>
      </tr>` : ''}
    </table>
  </td></tr>

  <!-- Total box -->
  <tr><td style="padding:0 40px 32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>&nbsp;</td>
        <td width="220" bgcolor="#0E0E0F" style="background-color:#0E0E0F;padding:20px 24px;" align="right">
          <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#777;font-family:Courier New,monospace;margin-bottom:8px;">${isReceipt ? 'Total Paid' : 'Total Due'}</div>
          <div style="font-size:30px;font-weight:800;color:#F0A500;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;line-height:1;">$${net.toFixed(2)}</div>
          ${isReceipt ? '<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#00C07F;margin-top:10px;font-family:Courier New,monospace;">&#10003; PAID IN FULL</div>' : ''}
        </td>
      </tr>
    </table>
  </td></tr>

  ${inv.notes ? `<!-- Notes -->
  <tr><td style="padding:0 40px 32px 40px;">
    <div style="background:#fafafa;border-left:3px solid #F0A500;padding:14px 18px;font-size:13px;color:#555;line-height:1.7;">${inv.notes}</div>
  </td></tr>` : ''}

  <!-- Message -->
  <tr><td style="padding:0 40px 32px 40px;border-top:1px solid #ebebeb;">
    <p style="font-size:13px;color:#777;line-height:1.8;margin:24px 0 0;">
      ${isReceipt
        ? `Thank you for your business, ${inq.first_name}. This receipt confirms payment in full for the above services. Please retain this for your records.`
        : `Hi ${inq.first_name}, please find your invoice above. If you have any questions, simply reply to this email or reach us at deploy@clearcommsolutions.com.`
      }
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td bgcolor="#0E0E0F" style="background-color:#0E0E0F;padding:24px 40px;text-align:center;">
    <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#F0A500;font-family:Courier New,monospace;margin-bottom:6px;">ClearComm Solutions</div>
    <div style="font-size:11px;color:#444;">deploy@clearcommsolutions.com</div>
  </td></tr>

</table>
<!-- /Card -->

</td></tr>
</table>
</body>
</html>`;
}

async function fetchInvoiceWithInquiry(invoiceId) {
  const { rows } = await pool.query(`
    SELECT
      i.first_name, i.last_name, i.email, i.company, i.industry, i.location,
      inv.id, inv.ref_num, inv.job_id, inv.job_number, inv.invoice_date, inv.due_date,
      inv.daily_rate, inv.total_days, inv.cost, inv.promo, inv.promo_amount,
      inv.paid, inv.paid_date, inv.notes
    FROM inquiries i
    JOIN invoices inv ON inv.inquiry_id = i.id
    WHERE inv.id = $1
  `, [invoiceId]);
  return rows[0] || null;
}

app.post('/api/admin/invoices/:id/send-invoice', requireAdmin, async (req, res) => {
  try {
    const row = await fetchInvoiceWithInquiry(req.params.id);
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    const inq = { first_name: row.first_name, last_name: row.last_name, email: row.email, company: row.company, industry: row.industry, location: row.location };
    const inv = row;
    const toEmail = req.body.toEmail || row.email;
    await mailer.sendEmail({
      From: 'ClearComm Solutions <deploy@clearcommsolutions.com>',
      To: toEmail,
      Subject: `Invoice ${inv.job_number || inv.ref_num} — ${inq.company}`,
      HtmlBody: buildInvoiceHtml({ inq, inv, isReceipt: false }),
      TextBody: `ClearComm Solutions — Invoice ${inv.job_number || inv.ref_num}\n\nBilled to: ${inq.first_name} ${inq.last_name} (${inq.company})\nTotal Due: $${(parseFloat(inv.cost || 0) - parseFloat(inv.promo_amount || 0)).toFixed(2)}\n\nQuestions? Reply to this email or contact deploy@clearcommsolutions.com`,
    });
    res.json({ ok: true, sentTo: toEmail });
  } catch (err) {
    console.error('Send invoice error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send invoice' });
  }
});

app.post('/api/admin/invoices/:id/send-receipt', requireAdmin, async (req, res) => {
  try {
    const row = await fetchInvoiceWithInquiry(req.params.id);
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    if (!row.paid) return res.status(400).json({ error: 'Invoice is not marked as paid' });
    const inq = { first_name: row.first_name, last_name: row.last_name, email: row.email, company: row.company, industry: row.industry, location: row.location };
    const inv = row;
    const toEmail = req.body.toEmail || row.email;
    await mailer.sendEmail({
      From: 'ClearComm Solutions <deploy@clearcommsolutions.com>',
      To: toEmail,
      Subject: `Receipt — ${inv.job_number || inv.ref_num} — ${inq.company}`,
      HtmlBody: buildInvoiceHtml({ inq, inv, isReceipt: true }),
      TextBody: `ClearComm Solutions — Receipt\n\nThis confirms payment in full for ${inq.first_name} ${inq.last_name} (${inq.company}).\nTotal Paid: $${(parseFloat(inv.cost || 0) - parseFloat(inv.promo_amount || 0)).toFixed(2)}\n\nThank you for your business.`,
    });
    res.json({ ok: true, sentTo: toEmail });
  } catch (err) {
    console.error('Send receipt error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send receipt' });
  }
});

// ── Equipment ─────────────────────────────────────────────────────────────────

app.get('/api/admin/equipment', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        e.*,
        co.id          AS checkout_id,
        co.person_name AS current_person,
        co.company     AS current_company,
        co.checkout_date,
        co.notes       AS checkout_notes
      FROM equipment e
      LEFT JOIN equipment_checkouts co
        ON co.equipment_id = e.id AND co.return_date IS NULL
      ORDER BY e.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Equipment fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

app.post('/api/admin/equipment', requireAdmin, async (req, res) => {
  try {
    const { itemType, customType, model, serialNumber, purchaseDate, condition, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO equipment (item_type, custom_type, model, serial_number, purchase_date, condition, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [itemType, customType || null, model || null, serialNumber || null,
       purchaseDate || null, condition || 'Good', notes || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Equipment create error:', err.message);
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

app.patch('/api/admin/equipment/:id', requireAdmin, async (req, res) => {
  try {
    const { itemType, customType, model, serialNumber, purchaseDate, condition, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE equipment SET item_type=$1, custom_type=$2, model=$3, serial_number=$4,
       purchase_date=$5, condition=$6, notes=$7 WHERE id=$8 RETURNING *`,
      [itemType, customType || null, model || null, serialNumber || null,
       purchaseDate || null, condition || 'Good', notes || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Equipment update error:', err.message);
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

app.delete('/api/admin/equipment/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM equipment WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Equipment delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

app.get('/api/admin/equipment/:id/checkouts', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM equipment_checkouts WHERE equipment_id=$1 ORDER BY checkout_date DESC, created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Checkout history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch checkout history' });
  }
});

app.post('/api/admin/equipment/:id/checkout', requireAdmin, async (req, res) => {
  try {
    const { personName, company, checkoutDate, notes } = req.body;
    // close any open checkout first
    await pool.query(
      `UPDATE equipment_checkouts SET return_date=CURRENT_DATE WHERE equipment_id=$1 AND return_date IS NULL`,
      [req.params.id]
    );
    const { rows } = await pool.query(
      `INSERT INTO equipment_checkouts (equipment_id, person_name, company, checkout_date, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, personName, company || null, checkoutDate || null, notes || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: 'Failed to check out equipment' });
  }
});

app.patch('/api/admin/equipment/checkouts/:id/return', requireAdmin, async (req, res) => {
  try {
    const { returnDate } = req.body;
    const { rows } = await pool.query(
      `UPDATE equipment_checkouts SET return_date=$1 WHERE id=$2 RETURNING *`,
      [returnDate || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Return error:', err.message);
    res.status(500).json({ error: 'Failed to return equipment' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuild));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
