import { type ChangeEvent, type FormEvent, useState, useEffect, useRef } from "react";
import "./App.css";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { useAuth } from "./context/AuthContext";
import { useTimer, type TimerMode } from "./context/TimerContext";
import { loginUser, registerUser } from "./services/auth";
import { createSession, fetchSessions, type HistorySession } from "./services/session";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { type Mood } from "./types";

type AuthMode = "login" | "register";
type AppView = "timer" | "history" | "settings" | "journal";

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

const initialFormState: FormState = { email: "", password: "", confirmPassword: "" };

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊",
  focused: "🎯",
  neutral: "😐",
  tired: "😴",
  stressed: "😤",
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const MODE_COLORS: Record<TimerMode, string> = {
  focus: "#EF9696",
  shortBreak: "#96C5EF",
  longBreak: "#96EFB5",
};

// Completion images provided by user — map to each mode
const COMPLETION_IMAGES: Record<TimerMode, string[]> = {
  focus: [
    "/completion-go-study.jpg",
    "/completion-awesome-cat.jpg",
    "/completion-100-judges.jpg",
    "/completion-good-job-cat.jpg",
    "/completion-gordon-star.jpg",
    "/completion-proud.jpg"
  ],
  shortBreak: ["/completion-i-did-it.jpg"],
  longBreak: ["/completion-graduate-cat.jpg"],
};

function formatTime(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function durationLabel(start: string, end: string) {
  const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000 / 60);
  return `${diff}m`;
}

const SERVER = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:5000";

export default function App() {
  const { user, token, login, logout } = useAuth();
  const { mode, settings, isRunning, displayMs, sessionStartTime, elapsedTotal,
    setMode, updateSettings, startTimer, stopTimer, resetTimer, requestNotificationPermission } = useTimer();

  // --- Auth state ---
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- App view ---
  const [view, setView] = useState<AppView>("timer");

  // --- Completion modal ---
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedMode, setCompletedMode] = useState<TimerMode>("focus");
  const [completedImage, setCompletedImage] = useState<string>("");
  const [showEndModal, setShowEndModal] = useState(false);

  // --- Mood / session form ---
  const [moodBefore, setMoodBefore] = useState<Mood>("neutral");
  const [moodAfter, setMoodAfter] = useState<Mood>("focused");
  const [focusLevel, setFocusLevel] = useState(5);
  const [distractions, setDistractions] = useState("");
  const [journal, setJournal] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [isSavingStandalone, setIsSavingStandalone] = useState(false);
  const [standaloneText, setStandaloneText] = useState("");
  const [standaloneMood, setStandaloneMood] = useState<Mood>("neutral");
  const [standaloneBgImageFile, setStandaloneBgImageFile] = useState<File | null>(null);
  const [standaloneBgPreviewUrl, setStandaloneBgPreviewUrl] = useState<string | null>(null);
  const [showStandaloneEmoji, setShowStandaloneEmoji] = useState(false);
  const standaloneFileRef = useRef<HTMLInputElement>(null);

  // --- History ---
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- Settings ---
  const [draftSettings, setDraftSettings] = useState(settings);

  // Auto-stop detection
  const prevRunning = useRef(isRunning);
  useEffect(() => {
    if (prevRunning.current && !isRunning && displayMs === 0) {
      // Timer ran to zero naturally
      setCompletedMode(mode);
      const images = COMPLETION_IMAGES[mode];
      setCompletedImage(images[Math.floor(Math.random() * images.length)]);
      setShowCompletion(true);
    }
    prevRunning.current = isRunning;
  }, [isRunning, displayMs, mode]);

  // Preload history when user logs in
  useEffect(() => {
    if (user && token) loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Sync draft settings when settings change externally
  useEffect(() => { setDraftSettings(settings); }, [settings]);

  const loadHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const data = await fetchSessions(token);
      setHistory(data);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Auth handlers ──────────────────────────────────────────────────
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(c => ({ ...c, [name]: value }));
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setAuthError(""); setAuthSuccess(""); setIsSubmitting(true);
    try {
      const r = await loginUser({ email: form.email, password: form.password });
      login(r.user, r.token);
      setForm(initialFormState);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setIsSubmitting(false); }
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setAuthError(""); setAuthSuccess("");
    if (form.password !== form.confirmPassword) { setAuthError("Passwords do not match."); return; }
    setIsSubmitting(true);
    try {
      const r = await registerUser({ email: form.email, password: form.password });
      login(r.user, r.token);
      setForm(initialFormState);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setIsSubmitting(false); }
  };

  // ── Timer handlers ─────────────────────────────────────────────────
  const handleTimerClick = () => {
    if (isRunning) {
      stopTimer();
      setShowEndModal(true);
    } else {
      startTimer();
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setJournal(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const onStandaloneEmojiClick = (emojiData: EmojiClickData) => {
    setStandaloneText(prev => prev + emojiData.emoji);
    setShowStandaloneEmoji(false);
  };

  const handleStandaloneFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setStandaloneBgImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setStandaloneBgPreviewUrl(url);
    } else {
      setStandaloneBgPreviewUrl(null);
    }
  };

  const handleSaveStandalone = async () => {
    if (!token || !standaloneText.trim()) return;
    setIsSavingStandalone(true);
    try {
      const now = new Date().toISOString();
      const saved = await createSession({
        startTime: now,
        endTime: now,
        moodBefore: standaloneMood,
        moodAfter: standaloneMood,
        focusLevel: 5,
        distractions: "",
        journal: standaloneText,
        mode: "Journal",
        backgroundImage: standaloneBgImageFile,
      }, token);
      setHistory(prev => [saved, ...prev]);
      // Reset
      setStandaloneText("");
      setStandaloneMood("neutral");
      setStandaloneBgImageFile(null);
      setStandaloneBgPreviewUrl(null);
      if (standaloneFileRef.current) standaloneFileRef.current.value = "";
      alert("Journal entry saved! ✨");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save journal.");
    } finally {
      setIsSavingStandalone(false);
    }
  };

  // ── Completion modal handlers ──────────────────────────────────────
  const handleCompletionContinue = () => {
    setShowCompletion(false);
    // If it was a focus session, open the session log modal
    if (completedMode === "focus") setShowEndModal(true);
    else resetTimer(); // breaks just reset
  };

  // ── File upload ────────────────────────────────────────────────────
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setBgImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setBgPreviewUrl(url);
    } else {
      setBgPreviewUrl(null);
    }
  };

  // ── Save session ───────────────────────────────────────────────────
  const handleSaveSession = async () => {
    if (!token) return;
    setSavingSession(true); setSaveError("");
    try {
      const startIso = sessionStartTime?.toISOString() ?? new Date().toISOString();
      const endIso = new Date().toISOString();
      const saved = await createSession({
        startTime: startIso,
        endTime: endIso,
        moodBefore,
        moodAfter,
        focusLevel,
        distractions,
        journal,
        mode: MODE_LABELS[mode],
        backgroundImage: bgImageFile,
      }, token);
      setHistory(prev => [saved, ...prev]);
      closeEndModal();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save session.");
    } finally { setSavingSession(false); }
  };

  const closeEndModal = () => {
    setShowEndModal(false);
    resetTimer();
    setMoodBefore("neutral"); setMoodAfter("focused"); setFocusLevel(5);
    setDistractions(""); setJournal(""); setShowEmojiPicker(false);
    setBgImageFile(null); setBgPreviewUrl(null);
    setSaveError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Settings save ──────────────────────────────────────────────────
  const handleSaveSettings = () => {
    updateSettings(draftSettings);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) alert("Notifications enabled! 🔔");
    else alert("Notification permission denied or not supported.");
  };

  // ══════════════════════════════════════════════════════════════════
  //  NOT LOGGED IN — show auth pages
  // ══════════════════════════════════════════════════════════════════
  if (!user) {
    if (authMode === "register") return (
      <div className="app-shell auth-shell">
        <RegisterPage form={form} error={authError} success={authSuccess}
          isSubmitting={isSubmitting} onChange={handleChange}
          onSubmit={handleRegisterSubmit} onClear={() => { setForm(initialFormState); setAuthError(""); }}
          onSwitchToLogin={() => { setAuthMode("login"); setAuthError(""); }} />
      </div>
    );
    return (
      <div className="app-shell auth-shell">
        <LoginPage form={form} error={authError} success={authSuccess}
          isSubmitting={isSubmitting} onChange={handleChange}
          onSubmit={handleLoginSubmit} onClear={() => { setForm(initialFormState); setAuthError(""); }}
          onSwitchToRegister={() => { setAuthMode("register"); setAuthError(""); }} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  //  LOGGED IN
  // ══════════════════════════════════════════════════════════════════
  const modeColor = MODE_COLORS[mode];

  return (
    <main className="app-shell" style={{ "--mode-color": modeColor } as React.CSSProperties}>

      {/* ── Completion Overlay ─────────────────────────────────────── */}
      {showCompletion && (
        <div className="completion-overlay">
          <div className="completion-card">
            <img
              src={completedImage}
              alt="session complete"
              className="completion-img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <h2>{completedMode === "focus" ? "🎉 Session Complete!" : "☕ Break Over!"}</h2>
            <p>{completedMode === "focus"
              ? "Great work! Log your mood and see your progress."
              : "Ready to focus again?"}</p>
            <button className="primary-button" onClick={handleCompletionContinue}>
              {completedMode === "focus" ? "Log Session" : "Back to Focus"}
            </button>
            <button className="ghost-button" style={{ marginTop: 8 }} onClick={() => { setShowCompletion(false); resetTimer(); }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── End Session / Log Modal ────────────────────────────────── */}
      {showEndModal && (
        <div className="modal-overlay">
          <div className="modal-content session-modal">
            <h2>Log Your Session</h2>
            <p className="modal-sub">Track how this focus session affected your well-being.</p>

            {saveError && <div className="message error">{saveError}</div>}

            {/* Background image upload */}
            <div className="field">
              <span>Session Background Image <span className="optional">optional</span></span>
              <div
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
                style={bgPreviewUrl ? { backgroundImage: `url(${bgPreviewUrl})` } : {}}
              >
                {!bgPreviewUrl && (
                  <div className="upload-placeholder">
                    <span className="upload-icon">🖼️</span>
                    <span>Click to upload image</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
              </div>
              {bgPreviewUrl && (
                <button className="ghost-button remove-img" onClick={() => { setBgImageFile(null); setBgPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                  Remove image
                </button>
              )}
            </div>

            {/* Mood selectors */}
            <div className="mood-row">
              <div className="field">
                <span>Mood before</span>
                <div className="mood-picker">
                  {(["happy", "focused", "neutral", "tired", "stressed"] as Mood[]).map(m => (
                    <button key={m} className={`mood-btn ${moodBefore === m ? "active" : ""}`}
                      onClick={() => setMoodBefore(m)} title={m}>
                      {MOOD_EMOJIS[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span>Mood after</span>
                <div className="mood-picker">
                  {(["happy", "focused", "neutral", "tired", "stressed"] as Mood[]).map(m => (
                    <button key={m} className={`mood-btn ${moodAfter === m ? "active" : ""}`}
                      onClick={() => setMoodAfter(m)} title={m}>
                      {MOOD_EMOJIS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="field">
              <span>Focus Level <strong>{focusLevel}/10</strong></span>
              <input type="range" min="1" max="10" value={focusLevel}
                onChange={e => setFocusLevel(Number(e.target.value))} className="focus-slider" />
            </div>

            <div className="field">
              <span>Distractions <span className="optional">optional</span></span>
              <input type="text" placeholder="e.g. phone notifications, noise…"
                value={distractions} onChange={e => setDistractions(e.target.value)} />
            </div>

            <div className="field">
              <div className="label-row">
                <span>Journal / Notes <span className="optional">optional</span></span>
                <button 
                  className="emoji-toggle" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  type="button"
                >
                  😊
                </button>
              </div>
              <div className="journal-container">
                <textarea
                  placeholder="How did it go? What did you accomplish?"
                  value={journal}
                  onChange={e => setJournal(e.target.value)}
                  rows={3}
                />
                {showEmojiPicker && (
                  <div className="emoji-picker-popover">
                    <div className="emoji-picker-backdrop" onClick={() => setShowEmojiPicker(false)} />
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="primary-button" onClick={handleSaveSession} disabled={savingSession}>
                {savingSession ? "Saving…" : "Save Session"}
              </button>
              <button className="ghost-button" onClick={closeEndModal} disabled={savingSession}>Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <nav className="top-nav">
        <span className="nav-logo">LOFI TIMER</span>
        <div className="nav-links">
          <button className={view === "timer" ? "nav-btn active" : "nav-btn"} onClick={() => setView("timer")}>⏱ Timer</button>
          <button className={view === "journal" ? "nav-btn active" : "nav-btn"} onClick={() => setView("journal")}>✍️ Journal</button>
          <button className={view === "history" ? "nav-btn active" : "nav-btn"} onClick={() => { setView("history"); loadHistory(); }}>📚 History</button>
          <button className={view === "settings" ? "nav-btn active" : "nav-btn"} onClick={() => setView("settings")}>⚙️ Settings</button>
          <button className="nav-btn logout-btn" onClick={logout} title="Logout">👋</button>
        </div>
      </nav>

      {/* ════════════════ TIMER VIEW ════════════════ */}
      {view === "timer" && (
        <section className="main-content">
          {/* Mode toggle */}
          <div className="mode-tabs">
            {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map(m => (
              <button
                key={m}
                className={`mode-tab ${mode === m ? "active" : ""}`}
                onClick={() => setMode(m)}
                disabled={isRunning}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Timer */}
          <div
            className={`timer-display ${isRunning ? "running" : ""}`}
            onClick={handleTimerClick}
            title={isRunning ? "Click to stop" : "Click to start"}
          >
            <h2>{formatTime(displayMs)}</h2>
            <p className="timer-hint">{isRunning ? "tap to stop" : "tap to start"}</p>
          </div>

          {/* Reset & skip */}
          <div className="timer-controls">
            <button className="ctrl-btn" onClick={resetTimer} disabled={isRunning} title="Reset">↺ Reset</button>
            <button className="ctrl-btn" onClick={() => { stopTimer(); setShowEndModal(true); }} disabled={!isRunning} title="Skip & Log">⏭ Skip &amp; Log</button>
          </div>

          {/* Illustration */}
          <div className="illustration-container">
            <img src="/lofi-illustration.png" alt="Lofi character" />
          </div>
        </section>
      )}

      {/* ════════════════ JOURNAL VIEW ════════════════ */}
      {view === "journal" && (
        <section className="journal-view">
          <h2 className="section-title">✍️ Daily Journal</h2>
          <div className="journal-card">
            <p className="journal-sub">How are you feeling today? Write your heart out.</p>

            <div className="field">
              <span>Current Mood</span>
              <div className="mood-picker">
                {(["happy", "focused", "neutral", "tired", "stressed"] as Mood[]).map(m => (
                  <button key={m} className={`mood-btn ${standaloneMood === m ? "active" : ""}`}
                    onClick={() => setStandaloneMood(m)} title={m}>
                    {MOOD_EMOJIS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="label-row">
                <span>Your Thoughts</span>
                <button 
                  className="emoji-toggle" 
                  onClick={() => setShowStandaloneEmoji(!showStandaloneEmoji)}
                  type="button"
                >
                  😊
                </button>
              </div>
              <div className="journal-container">
                <textarea
                  className="standalone-textarea"
                  placeholder="Today I felt..."
                  value={standaloneText}
                  onChange={e => setStandaloneText(e.target.value)}
                  rows={10}
                />
                {showStandaloneEmoji && (
                  <div className="emoji-picker-popover standalone-picker">
                    <div className="emoji-picker-backdrop" onClick={() => setShowStandaloneEmoji(false)} />
                    <EmojiPicker onEmojiClick={onStandaloneEmojiClick} />
                  </div>
                )}
              </div>
            </div>

            <div className="field">
              <span>Background Image <span className="optional">optional</span></span>
              <div
                className="upload-zone standalone-upload"
                onClick={() => standaloneFileRef.current?.click()}
                style={standaloneBgPreviewUrl ? { backgroundImage: `url(${standaloneBgPreviewUrl})` } : {}}
              >
                {!standaloneBgPreviewUrl && (
                  <div className="upload-placeholder">
                    <span className="upload-icon">🖼️</span>
                    <span>Click to set journal background</span>
                  </div>
                )}
                <input
                  ref={standaloneFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleStandaloneFileSelect}
                />
              </div>
              {standaloneBgPreviewUrl && (
                <button className="ghost-button remove-img" onClick={() => { setStandaloneBgImageFile(null); setStandaloneBgPreviewUrl(null); if (standaloneFileRef.current) standaloneFileRef.current.value = ""; }}>
                  Remove image
                </button>
              )}
            </div>

            <button 
              className="primary-button save-journal-btn" 
              onClick={handleSaveStandalone}
              disabled={isSavingStandalone || !standaloneText.trim()}
            >
              {isSavingStandalone ? "Saving..." : "Save Daily Entry"}
            </button>
          </div>
        </section>
      )}

      {/* ════════════════ HISTORY VIEW ════════════════ */}
      {view === "history" && (
        <section className="history-view">
          <h2 className="section-title">📚 Session History</h2>
          {historyLoading && <p className="history-empty">Loading…</p>}
          {!historyLoading && history.length === 0 && (
            <div className="history-empty">
              <p>No sessions yet!</p>
              <p>Complete your first focus session to see it here.</p>
            </div>
          )}
          <div className="history-grid">
            {history.map(s => (
              <div
                key={s._id}
                className="history-card"
                style={s.backgroundImageUrl
                  ? { backgroundImage: `url(${SERVER}${s.backgroundImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : {}}
              >
                <div className="history-card-inner">
                  <div className="history-badge">{s.mode}</div>
                  <div className="history-time">{formatDate(s.endTime)}</div>
                  <div className="history-duration">⏱ {durationLabel(s.startTime, s.endTime)}</div>
                  <div className="history-mood">
                    {MOOD_EMOJIS[s.moodBefore]} → {MOOD_EMOJIS[s.moodAfter]}
                  </div>
                  <div className="history-focus">Focus: {s.focusLevel}/10</div>
                  {s.distractions && <div className="history-distractions">🔔 {s.distractions}</div>}
                  {s.journal && <div className="history-journal">📝 {s.journal}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════════════════ SETTINGS VIEW ════════════════ */}
      {view === "settings" && (
        <section className="settings-view">
          <h2 className="section-title">⚙️ Timer Settings</h2>
          <div className="settings-card">
            <p className="settings-info">Customize your Pomodoro durations (in minutes).</p>

            <div className="settings-fields">
              <div className="settings-field">
                <label htmlFor="focus-dur">🎯 Focus</label>
                <div className="number-row">
                  <button className="num-btn" onClick={() => setDraftSettings(s => ({ ...s, focusMinutes: Math.max(1, s.focusMinutes - 1) }))}>−</button>
                  <input id="focus-dur" type="number" min="1" max="120"
                    value={draftSettings.focusMinutes}
                    onChange={e => setDraftSettings(s => ({ ...s, focusMinutes: Number(e.target.value) }))} />
                  <button className="num-btn" onClick={() => setDraftSettings(s => ({ ...s, focusMinutes: Math.min(120, s.focusMinutes + 1) }))}>+</button>
                </div>
                <span className="settings-unit">min</span>
              </div>

              <div className="settings-field">
                <label htmlFor="short-dur">☕ Short Break</label>
                <div className="number-row">
                  <button className="num-btn" onClick={() => setDraftSettings(s => ({ ...s, shortBreakMinutes: Math.max(1, s.shortBreakMinutes - 1) }))}>−</button>
                  <input id="short-dur" type="number" min="1" max="60"
                    value={draftSettings.shortBreakMinutes}
                    onChange={e => setDraftSettings(s => ({ ...s, shortBreakMinutes: Number(e.target.value) }))} />
                  <button className="num-btn" onClick={() => setDraftSettings(s => ({ ...s, shortBreakMinutes: Math.min(60, s.shortBreakMinutes + 1) }))}>+</button>
                </div>
                <span className="settings-unit">min</span>
              </div>

              <div className="settings-field">
                <label htmlFor="long-dur">🌿 Long Break</label>
                <div className="number-row">
                  <button className="num-btn" onClick={() => setDraftSettings(s => ({ ...s, longBreakMinutes: Math.max(1, s.longBreakMinutes - 1) }))}>−</button>
                  <input id="long-dur" type="number" min="1" max="120"
                    value={draftSettings.longBreakMinutes}
                    onChange={e => setDraftSettings(s => ({ ...s, longBreakMinutes: Number(e.target.value) }))} />
                  <button className="num-btn" onClick={() => setDraftSettings(s => ({ ...s, longBreakMinutes: Math.min(120, s.longBreakMinutes + 1) }))}>+</button>
                </div>
                <span className="settings-unit">min</span>
              </div>
            </div>

            <div className="button-group" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
              <button className="primary-button" onClick={handleSaveSettings}>
                Apply Settings
              </button>
              <button className="ghost-button" onClick={handleEnableNotifications}>
                🔔 Enable Desktop Notifications
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <span>MILLI LOFI TIMER</span>
      </footer>
    </main>
  );
}
