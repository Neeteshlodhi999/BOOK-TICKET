# Book Ticket

A browser-based support workspace for a small customer service team. This portfolio starter includes an overview dashboard, ticket filtering, ticket creation, ticket details, editable status and assignee, and conversation replies.

## Run locally

Open `index.html` in a modern browser. No package installation or build step is required. Data is stored in the browser's local storage under `book-ticket-tickets`.

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
- Persist ticket changes in browser local storage
- Responsive layout for desktop and smaller screens

## Files

- `index.html` — accessible page structure and dialogs
- `styles.css` — responsive interface styles
- `app.js` — sample data, ticket interactions, and local persistence

## Next steps

Connect the interface to a REST API and PostgreSQL, then add authentication, audit history, service-level deadlines, and deployment.
