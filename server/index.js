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
      job_title   TEXT,
      industry    TEXT,
      location    TEXT,
      start_date  TEXT,
      duration    TEXT,
      qty         TEXT,
      hazards     TEXT[],
      crew_types  TEXT[],
      infra       TEXT[],
      notes       TEXT,
      status      TEXT DEFAULT 'new',
      admin_notes TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS admin_notes TEXT;

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
  Title:    ${d.jobTitle || '—'}

PROJECT
  Industry:   ${d.industry}
  Location:   ${d.location}
  Start Date: ${d.startDate}
  Duration:   ${d.duration}

REQUIREMENTS
  Device Count:  ${d.qty}
  Hazard Class:  ${d.hazards?.length ? d.hazards.join(', ') : 'None selected'}
  Crew Types:    ${d.crewTypes?.length ? d.crewTypes.join(', ') : 'None selected'}
  Infrastructure:${d.infra?.length ? d.infra.join(', ') : 'None selected'}

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

  Company:    ${d.company}
  Location:   ${d.location}
  Start Date: ${d.startDate}
  Duration:   ${d.duration}
  Devices:    ${d.qty}

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
      refNum, firstName, lastName, email, phone, company, jobTitle,
      industry, location, startDate, duration, qty, hazards, crewTypes, infra, notes
    } = req.body;

    await pool.query(
      `INSERT INTO inquiries
        (ref_num, first_name, last_name, email, phone, company, job_title,
         industry, location, start_date, duration, qty, hazards, crew_types, infra, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [refNum, firstName, lastName, email, phone, company, jobTitle,
       industry, location, startDate, duration, qty, hazards, crewTypes, infra, notes]
    );

    // Fire notifications in parallel — don't block the response
    const notifData = { refNum, firstName, lastName, email, phone, company, jobTitle,
      industry, location, startDate, duration, qty, hazards, crewTypes, infra, notes };

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
        i.industry, i.location, i.start_date, i.created_at,
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
      LEFT JOIN invoices inv ON inv.inquiry_id = i.id
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
    const { refNum, jobNumber, invoiceDate, dueDate, dailyRate, totalDays, cost, promo, promoAmount, paid, paidDate, notes } = req.body;
    const jobId = 'JB-' + Math.random().toString(36).toUpperCase().slice(2, 8);
    const { rows } = await pool.query(
      `INSERT INTO invoices (inquiry_id, ref_num, job_id, invoice_date, due_date, daily_rate, total_days, cost, promo, promo_amount, paid, paid_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.params.id, refNum, jobId, invoiceDate || null, dueDate || null,
       dailyRate || null, totalDays || null, cost || null,
       promo || null, promoAmount || null, paid === true, paidDate || null, notes || null]
    );
    const jobNumber = 'JOB-' + String(rows[0].id).padStart(4, '0');
    await pool.query('UPDATE invoices SET job_number=$1 WHERE id=$2', [jobNumber, rows[0].id]);
    rows[0].job_number = jobNumber;
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
