import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

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
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Database tables ready.');
}

initDb().catch(err => console.error('DB init error:', err));

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
    res.json({ ok: true });
  } catch (err) {
    console.error('Inquiry insert error:', err.message);
    res.status(500).json({ error: 'Failed to save inquiry' });
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
