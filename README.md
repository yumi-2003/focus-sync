# Focus Sync

Focus Sync is currently a split frontend/backend starter for a focus-tracking app.
The backend already has authentication routes and MongoDB models, while the frontend
already has React Contexts for auth, sessions, and timer state. The client now includes
a working login/register screen wired to the backend auth routes, while session tracking
and timer UI are the next features to build.

## Current Context Review

### `AuthContext`
- Purpose: keeps the logged-in user in client memory.
- API: `user`, `token`, `login(userData, token)`, `logout()`.
- Good for: showing the current user, gating screens, and storing the user returned by login.
- Current behavior: it also persists to local storage, so refresh keeps the signed-in state.

### `SessionContext`
- Purpose: stores the current or latest session object in client memory.
- API: `session`, `startSession(sessionData)`, `endSession(sessionData)`.
- Good for: keeping focus-session data available across components.
- Limitation: there are no session routes wired on the backend yet, so this is local state only.

### `TimerContext`
- Purpose: tracks whether a timer is running and stores elapsed milliseconds.
- API: `isRunning`, `startTime`, `elapsedTime`, `startTimer()`, `stopTimer()`, `resetTimer()`.
- Good for: a focus timer UI.
- Limitation: `elapsedTime` updates when `stopTimer()` runs; it is not a live ticking timer yet.

## Project Structure

```text
client/
  src/
    context/      React Context providers and hooks
    types/        Shared client-side TypeScript types
    App.tsx       Login/register screen and signed-in summary
server/
  src/
    app.ts        Express server entry point
    routes/       API routes
    controllers/  Route handlers
    models/       Mongoose models
```

## Backend API That Exists Today

Base path: `/api/auth`

- `POST /register`
  - body: `{ "email": "you@example.com", "password": "secret" }`
- `POST /login`
  - body: `{ "email": "you@example.com", "password": "secret" }`
  - response: `{ "token": "...", "user": { "_id": "...", "email": "..." } }`

Important note:
- Register and login now both return the same auth payload shape.
- No protected middleware or session CRUD routes are implemented yet.

## How To Run It

### 1. Start the server

Create `server/.env` with these keys:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

Then run:

```bash
cd server
npm install
npm run dev
```

### 2. Start the client

```bash
cd client
npm install
npm run dev
```

## How To Use The Contexts

The providers are now already mounted in `client/src/main.tsx`, so any component under `App`
can use the hooks directly.

Example auth usage:

```tsx
import { useAuth } from "./context/AuthContext";

function ProfileBadge() {
  const { user, token, login, logout } = useAuth();

  return user ? (
    <button onClick={logout}>{user.email}</button>
  ) : (
    <button
      onClick={() =>
        login(
          { _id: "1", email: "demo@focussync.dev" },
          "demo-token",
        )
      }
    >
      Sign in demo
    </button>
  );
}
```

If the client needs a different backend URL, create `client/.env` with:

```env
VITE_API_URL=http://localhost:5000/api
```

Example timer usage:

```tsx
import { useTimer } from "./context/TimerContext";

function TimerControls() {
  const { isRunning, elapsedTime, startTimer, stopTimer, resetTimer } = useTimer();

  return (
    <>
      <p>{elapsedTime} ms</p>
      <button onClick={isRunning ? stopTimer : startTimer}>
        {isRunning ? "Stop" : "Start"}
      </button>
      <button onClick={resetTimer}>Reset</button>
    </>
  );
}
```

## What To Build Next

If you want to turn this into a working app, the clean next steps are:

1. Replace the signed-in summary in `client/src/App.tsx` with a real timer dashboard.
2. Add session routes on the server for creating and reading focus sessions.
3. Connect `SessionContext` to those server routes instead of keeping session data only in memory.
4. Attach the JWT token to protected API requests once you add authenticated routes.
