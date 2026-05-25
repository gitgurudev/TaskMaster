# TaskMaster

> Real-time task and project management platform with role-based access control and live updates.

A full-stack web app built with React + Vite + Express + MongoDB + Socket.io. Teams can manage tasks across departments with live notifications and JWT-based authentication.

---

## Features

- **JWT Authentication** — Secure login with token-based sessions
- **Role-Based Access Control** — Admin, Manager, and Member roles with scoped permissions
- **Real-time Updates** — Socket.io powered live task status changes across all connected clients
- **Department Management** — Organise teams into departments with module-level access
- **Task Tracking** — Create, assign, update, and close tasks with full audit trail
- **Dashboard** — Summary view of task counts, team activity, and module progress
- **Responsive UI** — Works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | CSS Modules |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken) |

---

## Project Structure

```
TaskMaster/
├── frontend/          # React + Vite client
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
├── server/            # Express API + Socket.io
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── socket.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repo
git clone https://github.com/gitgurudev/TaskMaster.git
cd TaskMaster

# Install server dependencies
cd server && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Environment Setup

```bash
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET in .env
```

### Run

```bash
# Start backend (from /server)
npm run dev

# Start frontend (from /frontend)
npm run dev
```

---

## Environment Variables

See `.env.example` for required variables.

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `PORT` | Server port (default: 5000) |

---

## Author

**Yash Dharme** — [github.com/gitgurudev](https://github.com/gitgurudev)
