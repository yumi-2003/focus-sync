# Focus Sync

Focus Sync is currently a split frontend/backend starter for a focus-tracking app.
The backend already has authentication routes and MongoDB models, while the frontend
already has React Contexts for auth, sessions, and timer state. The main thing to know
right now is that the client UI is still the default Vite starter, so the contexts exist
but are not yet used by the visible screen.

## Current Context Review

### `AuthContext`
- Purpose: keeps the logged-in user in client memory.
- API: `user`, `login(userData)`, `logout()`.
- Good for: showing the current user, gating screens, and storing the user returned by login.
- Limitation: it is memory-only right now, so refresh clears it unless you later add local storage.

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
    App.tsx       Still the default Vite starter screen
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
  - response: `{ "token": "..." }`

Important note:
- Registration currently returns the created user document directly.
- Login returns only a JWT token, not the full user object.
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
  const { user, login, logout } = useAuth();

  return user ? (
    <button onClick={logout}>{user.email}</button>
  ) : (
    <button onClick={() => login({ _id: "1", email: "demo@focussync.dev" })}>
      Sign in demo
    </button>
  );
}
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

1. Replace the Vite starter UI in `client/src/App.tsx` with real auth and timer screens.
2. Add a client API service layer for `/api/auth/register` and `/api/auth/login`.
3. Save the JWT token on the client and restore user state on refresh.
4. Add session routes on the server for creating and reading focus sessions.
5. Connect `SessionContext` to those server routes instead of keeping session data only in memory.
