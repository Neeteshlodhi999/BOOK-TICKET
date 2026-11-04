import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, '..');
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 10 }) : null;
const validStatuses = new Set(['Open', 'Pending', 'Closed']);
const validPriorities = new Set(['Urgent', 'High', 'Normal', 'Low']);
const validAssignees = new Set(['Jordan Lee', 'Alex Morgan', 'Sam Kim']);

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

function requireDatabase(_request, response, next) {
  if (!pool) return response.status(503).json({ error: 'Database is not configured. Add DATABASE_URL to .env.' });
  next();
}

function formattedTime(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(value);
}

function toComment(row) {
  return { id: row.id, author: row.author, initials: row.initials, text: row.body, time: formattedTime(row.created_at) };
}

function toTicket(row, comments = []) {
  return {
    id: row.ticket_key,
    subject: row.subject,
    requester: row.requester,
    initials: row.requester_initials,
    color: row.requester_color,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    category: row.category,
    icon: row.icon,
    iconColor: row.icon_color,
    updated: formattedTime(row.updated_at),
    comments
  };
}

async function getTicketByKey(ticketKey) {
  const result = await pool.query('SELECT * FROM tickets WHERE ticket_key = $1', [ticketKey]);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  const comments = await pool.query('SELECT id, author, initials, body, created_at FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at, id', [row.id]);
  return toTicket(row, comments.rows.map(toComment));
}

app.get('/api/health', requireDatabase, async (_request, response) => {
  await pool.query('SELECT 1');
  response.json({ status: 'ok', database: 'connected' });
});

app.get('/api/tickets', requireDatabase, async (_request, response) => {
  const tickets = await pool.query('SELECT * FROM tickets ORDER BY updated_at DESC, id DESC');
  if (!tickets.rowCount) return response.json([]);

  const ids = tickets.rows.map(ticket => ticket.id);
  const commentResult = await pool.query(
    'SELECT id, ticket_id, author, initials, body, created_at FROM ticket_comments WHERE ticket_id = ANY($1::bigint[]) ORDER BY created_at, id',
    [ids]
  );
  const commentsByTicket = new Map();
  for (const row of commentResult.rows) {
    const key = String(row.ticket_id);
    if (!commentsByTicket.has(key)) commentsByTicket.set(key, []);
    commentsByTicket.get(key).push(toComment(row));
  }
  response.json(tickets.rows.map(ticket => toTicket(ticket, commentsByTicket.get(String(ticket.id)) || [])));
});

app.post('/api/tickets', requireDatabase, async (request, response) => {
  const { subject, requester, description = '', priority = 'Normal' } = request.body || {};
  if (typeof subject !== 'string' || !subject.trim() || typeof requester !== 'string' || !requester.trim()) {
    return response.status(400).json({ error: 'Subject and requester are required.' });
  }
  if (!validPriorities.has(priority)) return response.status(400).json({ error: 'Priority is not valid.' });

  const name = requester.trim();
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const result = await pool.query(
    `INSERT INTO tickets (ticket_key, subject, requester, requester_initials, requester_color, description, status, priority, assignee, category, icon, icon_color)
     VALUES ('RL-' || nextval('ticket_number_seq')::text, $1, $2, $3, 'blue', $4, 'Open', $5, 'Jordan Lee', 'account', '✉', 'violet-bg')
     RETURNING *`,
    [subject.trim(), name, initials || 'CU', typeof description === 'string' ? description.trim() : '', priority]
  );
  response.status(201).json(toTicket(result.rows[0]));
});

app.patch('/api/tickets/:ticketKey', requireDatabase, async (request, response) => {
  const { status, assignee } = request.body || {};
  if (status === undefined && assignee === undefined) return response.status(400).json({ error: 'Provide a status or assignee to update.' });
  if (status !== undefined && !validStatuses.has(status)) return response.status(400).json({ error: 'Status is not valid.' });
  if (assignee !== undefined && !validAssignees.has(assignee)) return response.status(400).json({ error: 'Assignee is not valid.' });

  const result = await pool.query(
    `UPDATE tickets SET
       status = COALESCE($2, status),
       assignee = COALESCE($3, assignee),
       updated_at = now()
     WHERE ticket_key = $1
     RETURNING *`,
    [request.params.ticketKey, status ?? null, assignee ?? null]
  );
  if (!result.rowCount) return response.status(404).json({ error: 'Ticket was not found.' });
  response.json(await getTicketByKey(request.params.ticketKey));
});

app.post('/api/tickets/:ticketKey/comments', requireDatabase, async (request, response) => {
  const text = request.body?.text;
  if (typeof text !== 'string' || !text.trim()) return response.status(400).json({ error: 'Reply text is required.' });
  if (text.length > 5000) return response.status(400).json({ error: 'Replies must be 5,000 characters or fewer.' });

  const ticket = await pool.query('SELECT id FROM tickets WHERE ticket_key = $1', [request.params.ticketKey]);
  if (!ticket.rowCount) return response.status(404).json({ error: 'Ticket was not found.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO ticket_comments (ticket_id, author, initials, body) VALUES ($1, $2, $3, $4) RETURNING id, author, initials, body, created_at',
      [ticket.rows[0].id, 'Jamie Davis', 'JD', text.trim()]
    );
    await client.query('UPDATE tickets SET updated_at = now() WHERE id = $1', [ticket.rows[0].id]);
    await client.query('COMMIT');
    response.status(201).json(toComment(result.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.use('/api', (_request, response) => response.status(404).json({ error: 'API route was not found.' }));
app.use(express.static(projectDir));
app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'The server could not complete that request.' });
});

const server = app.listen(port, () => {
  console.log(`Book Ticket is running at http://localhost:${port}`);
  if (!pool) console.warn('DATABASE_URL is missing. API requests will be unavailable until .env is configured.');
});

async function shutdown() {
  server.close(async () => {
    if (pool) await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
