import { type ChangeEvent, type FormEvent, useState, useEffect } from "react";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import { useTimer } from "./context/TimerContext";
import { useSession } from "./context/SessionContext";
import { loginUser, registerUser } from "./services/auth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

type AuthMode = "login" | "register";

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

const initialFormState: FormState = {
  email: "",
  password: "",
  confirmPassword: "",
};

function App() {
  const { user, token, login, logout } = useAuth();
  
  // Step 1: Connect to new Contexts for State Management
  // By destructuring from useTimer and useSession, the component subscribes
  // to their real-time state and action modifiers.
  const { isRunning, startTime, elapsedTime, startTimer, stopTimer, resetTimer } = useTimer();
  const { session } = useSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 2: Live-display state logic
  // We manage `displayTime` locally because updating Context every millisecond 
  // would cause the entire component tree to re-evaluate too frequently.
  const [displayTime, setDisplayTime] = useState(elapsedTime);

  useEffect(() => {
    let interval: number;
    // When isRunning is true, continuously update the local state to tick visually
    if (isRunning && startTime) {
      interval = window.setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        setDisplayTime(elapsedTime + diff);
      }, 100);
    } else {
      // When paused, perfectly sync back up to the stored context elapsedTime
      setDisplayTime(elapsedTime);
    }
    // Cleanup interval to prevent memory leaks
    return () => window.clearInterval(interval);
  }, [isRunning, startTime, elapsedTime]);

  // Step 3: Format helper
  // Converts integer milliseconds into standard standard clock view MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
  };

  const handleClear = () => {
    setForm(initialFormState);
    setError("");
    setSuccess("");
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const authResponse = await loginUser({
        email: form.email,
        password: form.password,
      });

      login(authResponse.user, authResponse.token);
      setForm(initialFormState);
      setSuccess("Signed in successfully.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      //call register API and log in on success
      const authResponse = await registerUser({
        email: form.email,
        password: form.password,
      });

      // Automatically log in the user after successful registration
      login(authResponse.user, authResponse.token);
      setForm(initialFormState);
      setSuccess("Account created and signed in.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return (
      <main className="app-shell">
        <section className="auth-layout auth-layout--compact">
          <section className="auth-panel">
            <div className="auth-header">
              <span className="auth-kicker">Focus Sync</span>
              <h1>Signed in</h1>
              <p>{user.email}</p>
            </div>

            {success ? <div className="message success">{success}</div> : null}

            <div className="dashboard-meta">
              <div className="dashboard-card">
                <strong>Email</strong>
                <span>{user.email}</span>
              </div>

              <div className="dashboard-card">
                <strong>Auth Token</strong>
                <span>{token ? "Active" : "Unavailable"}</span>
              </div>

              {/* Step 4: Timer UI Integration */}
              {/* Connects the useTimer actions to UI buttons, dynamically displaying formatTime */}
              <div className="dashboard-card" style={{ gridColumn: '1 / -1', background: '#f8f9fa' }}>
                <strong>Focus Timer</strong>
                <div style={{ fontSize: '2.5rem', margin: '8px 0', fontFamily: 'monospace', fontWeight: 600 }}>
                  {formatTime(displayTime)}
                </div>
                <div className="button-row" style={{ marginTop: 0 }}>
                  {!isRunning ? (
                    <button className="primary-button" onClick={startTimer}>Start Timer</button>
                  ) : (
                    <button className="ghost-button" style={{ borderColor: '#e00', color: '#e00' }} onClick={stopTimer}>Stop Timer</button>
                  )}
                  <button className="ghost-button" onClick={resetTimer} disabled={isRunning || displayTime === 0}>Reset</button>
                </div>
              </div>

              {/* Step 5: Session UI Integration */}
              {/* Only displays if a completed session exists inside SessionContext */}
              {session && (
                <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
                  <strong>Last Recorded Session</strong>
                  <div style={{ marginTop: '8px', fontSize: '0.95rem' }}>
                     <div><strong style={{ display: 'inline', color: '#666' }}>Focus Level:</strong> {session.focusLevel}/10</div>
                     <div><strong style={{ display: 'inline', color: '#666' }}>Mood:</strong> {session.moodAfter}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="button-row">
              <button className="ghost-button" type="button" onClick={logout}>
                Log out
              </button>
            </div>
          </section>
        </section>
      </main>
    );
  }

  if (mode === "register") {
    return (
      <RegisterPage
        form={form}
        error={error}
        success={success}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onSubmit={handleRegisterSubmit}
        onClear={handleClear}
        onSwitchToLogin={() => handleModeChange("login")}
      />
    );
  }

  return (
    <LoginPage
      form={form}
      error={error}
      success={success}
      isSubmitting={isSubmitting}
      onChange={handleChange}
      onSubmit={handleLoginSubmit}
      onClear={handleClear}
      onSwitchToRegister={() => handleModeChange("register")}
    />
  );
}

export default App;
