import { type ChangeEvent, type FormEvent, useState, useEffect } from "react";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import { useTimer } from "./context/TimerContext";
import { useSession } from "./context/SessionContext";
import { loginUser, registerUser } from "./services/auth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { type Mood } from "./types";

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
  const { user, login, logout } = useAuth();
  
  const { isRunning, startTime, elapsedTime, startTimer, stopTimer, resetTimer } = useTimer();
  const { session, endSession } = useSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default starting time to 30:00 for the lofi timer aesthetic
  const thirtyMinutesMs = 30 * 60 * 1000;
  const [displayTime, setDisplayTime] = useState(thirtyMinutesMs);

  // Mood tracking UI state
  const [showEndModal, setShowEndModal] = useState(false);
  const [moodBefore, setMoodBefore] = useState<Mood>("neutral");
  const [moodAfter, setMoodAfter] = useState<Mood>("focused");
  const [focusLevel, setFocusLevel] = useState<number>(5);
  const [distractions, setDistractions] = useState("");

  useEffect(() => {
    let interval: number;
    if (isRunning && startTime) {
      interval = window.setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        // Countdown logic:
        const remaining = Math.max(0, thirtyMinutesMs - (elapsedTime + diff));
        setDisplayTime(remaining);
      }, 100);
    } else {
      const remaining = Math.max(0, thirtyMinutesMs - elapsedTime);
      setDisplayTime(remaining);
    }
    return () => window.clearInterval(interval);
  }, [isRunning, startTime, elapsedTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
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
      const authResponse = await registerUser({
        email: form.email,
        password: form.password,
      });

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

  const handleTimerClick = () => {
    if (isRunning) {
      stopTimer();
      setShowEndModal(true);
    } else {
      startTimer();
    }
  };

  const handleSaveSession = () => {
    if (user && startTime) {
      endSession({
        user,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        moodBefore,
        moodAfter,
        focusLevel,
        distractions
      });
    }
    setShowEndModal(false);
    resetTimer();
    setMoodBefore("neutral");
    setMoodAfter("focused");
    setFocusLevel(5);
    setDistractions("");
  };

  const handleDiscardSession = () => {
    setShowEndModal(false);
    resetTimer();
  };

  if (user) {
    return (
      <main className="app-shell">
        <section className="main-content">
          <div className="app-header">
            <h1>LOFI TIMER</h1>
          </div>
          
          <div className="timer-display" onClick={handleTimerClick} title={isRunning ? "Click to stop" : "Click to start"}>
             <h2>{formatTime(displayTime)}</h2>
          </div>

          <div className="illustration-container">
             <img src="/lofi-illustration.png" alt="Lofi character reading" />
          </div>
        </section>

        <footer className="app-footer">
          <span style={{ cursor: 'pointer' }} onClick={logout} title="Click to logout">MILLI LOFI TIMER</span>
        </footer>

        {/* End Session Modal */}
        {showEndModal && (
          <div className="modal-overlay">
            <div className="modal-content auth-panel">
              <h2 style={{ marginBottom: '8px', fontSize: '1.6rem', color: 'var(--text-timer)' }}>Session Complete</h2>
              <p style={{ color: 'var(--text-footer)', marginBottom: '24px', fontSize: '0.95rem' }}>Log your mood to track how focus sessions affect your well-being.</p>
              
              <div className="auth-form">
                <div className="field">
                  <span>Mood before session</span>
                  <select value={moodBefore} onChange={(e) => setMoodBefore(e.target.value as Mood)} style={{ WebkitAppearance: 'none', appearance: 'none', padding: '12px', borderRadius: '12px', border: '2px solid var(--bg-footer)', outline: 'none' }}>
                    <option value="happy">Happy</option>
                    <option value="focused">Focused</option>
                    <option value="neutral">Neutral</option>
                    <option value="tired">Tired</option>
                    <option value="stressed">Stressed</option>
                  </select>
                </div>

                <div className="field">
                  <span>Mood right now</span>
                  <select value={moodAfter} onChange={(e) => setMoodAfter(e.target.value as Mood)} style={{ WebkitAppearance: 'none', appearance: 'none', padding: '12px', borderRadius: '12px', border: '2px solid var(--bg-footer)', outline: 'none' }}>
                    <option value="happy">Happy</option>
                    <option value="focused">Focused</option>
                    <option value="neutral">Neutral</option>
                    <option value="tired">Tired</option>
                    <option value="stressed">Stressed</option>
                  </select>
                </div>

                <div className="field">
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Focus Level ({focusLevel}/10)</span>
                  </span>
                  <input type="range" min="1" max="10" value={focusLevel} onChange={(e) => setFocusLevel(Number(e.target.value))} style={{cursor:'pointer'}} />
                </div>

                <div className="field">
                  <span>Any distractions? (Optional)</span>
                  <input type="text" placeholder="e.g. Phone calls, social media..." value={distractions} onChange={(e) => setDistractions(e.target.value)} />
                </div>

                <div className="button-row" style={{ marginTop: '16px' }}>
                  <button className="primary-button" style={{ flex: 1 }} onClick={handleSaveSession}>Save Session</button>
                  <button className="ghost-button" onClick={handleDiscardSession}>Discard</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (mode === "register") {
    return (
      <div className="app-shell" style={{ justifyContent: 'center' }}>
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
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center' }}>
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
    </div>
  );
}

export default App;
