# Book Ticket

A support workspace for a small customer service team. It includes an overview dashboard, ticket filtering, ticket creation, ticket details, editable status and assignee, and conversation replies. Express serves the interface and REST API; PostgreSQL stores tickets and replies.

## Run locally

### Browser demo

Open `index.html` directly in a modern browser. The app uses local storage when the API is unavailable.

### API and PostgreSQL

Requirements: Node.js 22 or newer and PostgreSQL.

1. Create a PostgreSQL database named `book_ticket`.
2. Apply the schema and sample tickets from the project root:

   ```sh
   psql -d book_ticket -f db/schema.sql
   psql -d book_ticket -f db/seed.sql
   ```

3. Copy `.env.example` to `.env` and set `DATABASE_URL` for your database.
4. Install dependencies and start the server:

   ```sh
   npm install
   npm run dev
   ```

5. Open <http://localhost:3000>. The footer shows whether the API is connected.

To reset the seeded sample data, open the browser developer console and run:

```js
localStorage.removeItem('book-ticket-tickets');
location.reload();
```

## Features

- Search tickets and filter by status, assignment, priority, and category
- Create tickets with a subject, requester, priority, and description
- Open ticket details and update status or assignee
- Add conversation replies
- Persist data in PostgreSQL through the API, with local storage fallback when running the static demo
- Responsive layout for desktop and smaller screens

## Files

- `index.html` — accessible page structure and dialogs
- `styles.css` — responsive interface styles
- `app.js` — sample data, ticket interactions, and local persistence
- `server/server.js` — Express REST API and static file server
- `db/schema.sql` — PostgreSQL ticket and comment tables
- `db/seed.sql` — sample support tickets
- `.env.example` — local server configuration template

## Next steps

Add authentication and role-based access, audit history, service-level deadlines, and deployment.
