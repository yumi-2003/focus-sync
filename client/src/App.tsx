import { type ChangeEvent, type FormEvent, useState, useEffect, useRef } from "react";
import "./App.css";
import toast, { Toaster } from "react-hot-toast";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { useTimer, type TimerMode } from "./context/TimerContext";
import { loginUser, registerUser } from "./services/auth";
import { createSession, fetchSessions } from "./services/session";
import { fetchTodos, createTodo, updateTodoStatus, deleteTodo } from "./services/todo";
import { fetchExpenses, createExpense, deleteExpense } from "./services/expense";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { type Mood, type Todo, type Expense } from "./types";

type AuthMode = "login" | "register";
type AppView = "timer" | "history" | "settings" | "journal" | "tasks" | "money" | "profile";

interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const initialFormState: FormState = { username: "", email: "", password: "", confirmPassword: "" };

// ── Currency catalogue ─────────────────────────────────────────────
export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$",   name: "US Dollar" },
  { code: "EUR", symbol: "€",   name: "Euro" },
  { code: "GBP", symbol: "£",   name: "British Pound" },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen" },
  { code: "CNY", symbol: "¥",   name: "Chinese Yuan" },
  { code: "KRW", symbol: "₩",   name: "South Korean Won" },
  { code: "MMK", symbol: "K",   name: "Myanmar Kyat" },
  { code: "THB", symbol: "฿",   name: "Thai Baht" },
  { code: "SGD", symbol: "S$",  name: "Singapore Dollar" },
  { code: "MYR", symbol: "RM",  name: "Malaysian Ringgit" },
  { code: "INR", symbol: "₹",   name: "Indian Rupee" },
  { code: "IDR", symbol: "Rp",  name: "Indonesian Rupiah" },
  { code: "PHP", symbol: "₱",   name: "Philippine Peso" },
  { code: "VND", symbol: "₫",   name: "Vietnamese Dong" },
  { code: "KHR", symbol: "៛",   name: "Cambodian Riel" },
  { code: "LAK", symbol: "₭",   name: "Lao Kip" },
  { code: "BND", symbol: "B$",  name: "Brunei Dollar" },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar" },
  { code: "BDT", symbol: "৳",   name: "Bangladeshi Taka" },
  { code: "PKR", symbol: "₨",   name: "Pakistani Rupee" },
  { code: "LKR", symbol: "Rs",  name: "Sri Lankan Rupee" },
  { code: "NPR", symbol: "Rs",  name: "Nepalese Rupee" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼",  name: "Saudi Riyal" },
  { code: "TRY", symbol: "₺",   name: "Turkish Lira" },
  { code: "RUB", symbol: "₽",   name: "Russian Ruble" },
  { code: "BRL", symbol: "R$",  name: "Brazilian Real" },
  { code: "MXN", symbol: "$",   name: "Mexican Peso" },
  { code: "ZAR", symbol: "R",   name: "South African Rand" },
  { code: "NGN", symbol: "₦",   name: "Nigerian Naira" },
  { code: "CUSTOM", symbol: "?", name: "Custom Currency" },
];

const DEFAULT_CURRENCY = CURRENCIES[0]; // USD

function loadCurrency(): CurrencyOption {
  try {
    const raw = localStorage.getItem("fs_currency");
    if (!raw) return DEFAULT_CURRENCY;
    const parsed = JSON.parse(raw) as CurrencyOption;
    if (parsed.code && parsed.symbol && parsed.name) return parsed;
  } catch { /* ignore */ }
  return DEFAULT_CURRENCY;
}

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

const JOURNAL_SUGGESTED_PROMPT =
  "What felt meaningful today, what challenged me, and what is one gentle intention I want to carry into tomorrow?";

const JOURNAL_QUOTES = [
  {
    text: "There is no greater agony than bearing an untold story inside you.",
    author: "Maya Angelou",
  },
  {
    text: "Fill your paper with the breathings of your heart.",
    author: "William Wordsworth",
  },
  {
    text: "Journal writing is a voyage to the interior.",
    author: "Christina Baldwin",
  },
  {
    text: "Write hard and clear about what hurts.",
    author: "Ernest Hemingway",
  },
];

// MODE_COLORS moved to CSS variables (--focus-color, --short-color, --long-color)

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
  const { theme, toggleTheme } = useTheme();
  const { mode, settings, isRunning, displayMs, sessionStartTime,
    setMode, updateSettings, startTimer, stopTimer, resetTimer, requestNotificationPermission, 
    playTestSound, SOUND_OPTIONS } = useTimer();

  // --- Auth state ---
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
  const [journalQuoteIndex, setJournalQuoteIndex] = useState(() => new Date().getDate() % JOURNAL_QUOTES.length);
  const standaloneFileRef = useRef<HTMLInputElement>(null);

  // --- History ---
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- Todos ---
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todosLoading, setTodosLoading] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [isAddingTodo, setIsAddingTodo] = useState(false);

  // --- Expenses ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [newExpenseDesc, setNewExpenseDesc] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState("General");
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // --- Currency ---
  const [currency, setCurrency] = useState<CurrencyOption>(loadCurrency);
  const [customCurrencyCode, setCustomCurrencyCode] = useState("");
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState("");
  const [currencySaved, setCurrencySaved] = useState(false);

  const activeCurrencySymbol = currency.symbol;

  const handleCurrencySelect = (code: string) => {
    if (code === "CUSTOM") {
      // switch to custom mode, keep existing custom values
      const customEntry: CurrencyOption = {
        code: "CUSTOM",
        symbol: customCurrencySymbol || "?",
        name: "Custom Currency",
      };
      setCurrency(customEntry);
    } else {
      const found = CURRENCIES.find(c => c.code === code) ?? DEFAULT_CURRENCY;
      setCurrency(found);
      localStorage.setItem("fs_currency", JSON.stringify(found));
      setCurrencySaved(true);
      setTimeout(() => setCurrencySaved(false), 2000);
    }
  };

  const handleSaveCustomCurrency = () => {
    if (!customCurrencyCode.trim() || !customCurrencySymbol.trim()) return;
    const customEntry: CurrencyOption = {
      code: customCurrencyCode.trim().toUpperCase(),
      symbol: customCurrencySymbol.trim(),
      name: `Custom (${customCurrencyCode.trim().toUpperCase()})`,
    };
    setCurrency(customEntry);
    localStorage.setItem("fs_currency", JSON.stringify(customEntry));
    setCurrencySaved(true);
    setTimeout(() => setCurrencySaved(false), 2000);
  };

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

  // Preload history and todos when user logs in
  useEffect(() => {
    if (user && token) {
      loadHistory();
      loadTodos();
      loadExpenses();
    }
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

  const loadTodos = async () => {
    if (!token) return;
    setTodosLoading(true);
    try {
      const data = await fetchTodos(token);
      setTodos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setTodosLoading(false);
    }
  };

  const loadExpenses = async () => {
    if (!token) return;
    setExpensesLoading(true);
    try {
      const data = await fetchExpenses(token);
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseDesc.trim()) {
      toast.error("Please enter an expense description");
      return;
    }
    const amt = parseFloat(newExpenseAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }
    if (!token) return;

    setIsAddingExpense(true);
    try {
      const saved = await createExpense(
        { description: newExpenseDesc, amount: amt, category: newExpenseCategory },
        token
      );
      setExpenses(prev => [saved, ...prev]);
      setNewExpenseDesc("");
      setNewExpenseAmount("");
      setNewExpenseCategory("General");
    } catch (err) {
      toast.error("Failed to add expense");
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!token) return;
    const confirmed = await confirmToast("Delete this expense?");
    if (!confirmed) return;
    const old = [...expenses];
    setExpenses(prev => prev.filter(e => e._id !== id));
    try {
      await deleteExpense(id, token);
    } catch (err) {
      setExpenses(old);
      toast.error("Failed to delete expense");
    }
  };

  const handleAddTodo = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) {
      toast.error("Task text cannot be empty");
      return;
    }
    if (newTodo.length > 100) {
      toast.error("Task is too long (max 100 characters)");
      return;
    }
    if (!token) return;

    setIsAddingTodo(true);
    try {
      const saved = await createTodo(newTodo, token);
      setTodos(prev => [saved, ...prev]);
      setNewTodo("");
    } catch (err) {
      toast.error("Failed to add task");
    } finally {
      setIsAddingTodo(false);
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    if (!token) return;
    // Optimistic update
    setTodos(prev => prev.map(t => t._id === id ? { ...t, completed: !completed } : t));
    try {
      await updateTodoStatus(id, !completed, token);
    } catch (err) {
      // Revert if failed
      setTodos(prev => prev.map(t => t._id === id ? { ...t, completed } : t));
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!token) return;
    const confirmed = await confirmToast("Are you sure you want to delete this task?");
    if (!confirmed) return;
    const oldTodos = [...todos];
    setTodos(prev => prev.filter(t => t._id !== id));
    try {
      await deleteTodo(id, token);
    } catch (err) {
      setTodos(oldTodos);
      toast.error("Failed to delete task");
    }
  };

  // ── Auth handlers ──────────────────────────────────────────────────
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(c => ({ ...c, [name]: value }));
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setAuthError(""); setFieldErrors({}); setIsSubmitting(true);
    
    // Quick frontend check
    if (!form.email.includes("@")) {
      setFieldErrors({ email: "Please enter a valid email" });
      setIsSubmitting(false);
      return;
    }

    try {
      const r = await loginUser({ email: form.email, password: form.password });
      login(r.user, r.token);
      setForm(initialFormState);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.toLowerCase().includes("email")) setFieldErrors({ email: msg });
      else if (msg.toLowerCase().includes("password")) setFieldErrors({ password: msg });
      else setAuthError(msg);
    } finally { setIsSubmitting(false); }
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setAuthError(""); setFieldErrors({});
    
    // Frontend validation
    const errors: Record<string, string> = {};
    if (form.username.length < 3) errors.username = "Username too short (min 3)";
    if (!form.email.includes("@")) errors.email = "Invalid email format";
    if (form.password.length < 6) errors.password = "Password too short (min 6)";
    if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const r = await registerUser({ username: form.username, email: form.email, password: form.password });
      login(r.user, r.token);
      setForm(initialFormState);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.toLowerCase().includes("username")) setFieldErrors({ username: msg });
      else if (msg.toLowerCase().includes("email")) setFieldErrors({ email: msg });
      else if (msg.toLowerCase().includes("password")) setFieldErrors({ password: msg });
      else setAuthError(msg);
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

  const handleUseSuggestedPrompt = () => {
    setStandaloneText(prev =>
      prev.trim()
        ? `${prev.trimEnd()}\n\n${JOURNAL_SUGGESTED_PROMPT}\n`
        : `${JOURNAL_SUGGESTED_PROMPT}\n\n`
    );
  };

  const handleNextJournalQuote = () => {
    setJournalQuoteIndex(prev => (prev + 1) % JOURNAL_QUOTES.length);
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
      toast.success("Journal entry saved! ✨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save journal.");
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
    const { focusMinutes, shortBreakMinutes, longBreakMinutes } = draftSettings;
    if (focusMinutes < 1 || focusMinutes > 120 || 
        shortBreakMinutes < 1 || shortBreakMinutes > 60 || 
        longBreakMinutes < 1 || longBreakMinutes > 120) {
      toast.error("Durations must be within valid ranges (1-120 min focus/long, 1-60 min short)");
      return;
    }
    updateSettings(draftSettings);
    toast.success("Settings applied! ✨");
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) toast.success("Notifications enabled! 🔔");
    else toast.error("Notification permission denied or not supported.");
  };

  const confirmToast = (message: string) => {
    return new Promise<boolean>((resolve) => {
      toast((t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '200px' }}>
          <p style={{ margin: 0 }}>{message}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="primary-button" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
            >
              Confirm
            </button>
            <button 
              className="ghost-button" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
              onClick={() => { toast.dismiss(t.id); resolve(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      ), { duration: Infinity });
    });
  };

  // ══════════════════════════════════════════════════════════════════
  //  NOT LOGGED IN — show auth pages
  // ══════════════════════════════════════════════════════════════════
  if (!user) {
    if (authMode === "register") return (
      <div className="app-shell auth-shell">
        <RegisterPage form={form} error={authError}
          isSubmitting={isSubmitting} fieldErrors={fieldErrors} onChange={handleChange}
          onSubmit={handleRegisterSubmit} onClear={() => { setForm(initialFormState); setAuthError(""); setFieldErrors({}); }}
          onSwitchToLogin={() => { setAuthMode("login"); setAuthError(""); setFieldErrors({}); }} />
      </div>
    );
    return (
      <div className="app-shell auth-shell">
        <LoginPage form={form} error={authError}
          isSubmitting={isSubmitting} fieldErrors={fieldErrors} onChange={handleChange}
          onSubmit={handleLoginSubmit} onClear={() => { setForm(initialFormState); setAuthError(""); setFieldErrors({}); }}
          onSwitchToRegister={() => { setAuthMode("register"); setAuthError(""); setFieldErrors({}); }} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // LOGGED IN
  // ══════════════════════════════════════════════════════════════════
  const modeClass = (view === "timer") ? `mode-${mode}` : "mode-focus";

  return (
    <main className={`app-shell ${modeClass}`}>

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
                    <EmojiPicker onEmojiClick={onEmojiClick} theme={theme as any} />
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
          <button className={view === "tasks" ? "nav-btn active" : "nav-btn"} onClick={() => { setView("tasks"); loadTodos(); }}>✅ Tasks</button>
          <button className={view === "journal" ? "nav-btn active" : "nav-btn"} onClick={() => setView("journal")}>✍️ Journal</button>
          <button className={view === "money" ? "nav-btn active" : "nav-btn"} onClick={() => { setView("money"); loadExpenses(); }}>💸 Money</button>
          <button className={view === "history" ? "nav-btn active" : "nav-btn"} onClick={() => { setView("history"); loadHistory(); }}>📚 History</button>
          <button className={view === "profile" ? "nav-btn active" : "nav-btn"} onClick={() => setView("profile")}>👤 Profile</button>
          <button className={view === "settings" ? "nav-btn active" : "nav-btn"} onClick={() => setView("settings")}>⚙️ Settings</button>
          <button className="nav-btn" onClick={toggleTheme} title="Toggle Theme">{theme === "light" ? "🌙" : "☀️"}</button>
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

      {/* ════════════════ TASKS VIEW ════════════════ */}
      {view === "tasks" && (
        <section className="tasks-view">
          <h2 className="section-title">✅ Daily Tasks</h2>
          
          <div className="tasks-card">
            <p className="tasks-sub">What do you want to focus on today?</p>
            
            <form className="add-task-form" onSubmit={handleAddTodo}>
              <input 
                type="text" 
                placeholder="Add a new task..." 
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                disabled={isAddingTodo}
              />
              <button type="submit" className="primary-button" disabled={isAddingTodo || !newTodo.trim()}>
                {isAddingTodo ? "..." : "+ Add"}
              </button>
            </form>

            <div className="tasks-list">
              {todosLoading && <p className="history-empty">Loading tasks...</p>}
              {!todosLoading && todos.length === 0 && (
                <div className="history-empty">
                  <p>No tasks yet!</p>
                  <p>Add a task to stay organized and focused.</p>
                </div>
              )}
              {todos.map(t => (
                <div key={t._id} className={`todo-item ${t.completed ? "completed" : ""}`}>
                  <label className="todo-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={t.completed} 
                      onChange={() => handleToggleTodo(t._id, t.completed)}
                    />
                    <span className="todo-text">{t.text}</span>
                  </label>
                  <button className="delete-task-btn" onClick={() => handleDeleteTodo(t._id)} title="Delete task">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ JOURNAL VIEW ════════════════ */}
      {view === "journal" && (
        <section className="journal-view">
          <h2 className="section-title">✍️ Daily Journal</h2>
          <div className="journal-card">
            <p className="journal-sub">How are you feeling today? Write your heart out.</p>

            <div className="journal-prompt-card">
              <div>
                <p className="journal-prompt-label">Suggested Prompt</p>
                <p className="journal-prompt-text">{JOURNAL_SUGGESTED_PROMPT}</p>
              </div>
              <button
                className="ghost-button journal-prompt-btn"
                type="button"
                onClick={handleUseSuggestedPrompt}
              >
                Use Prompt
              </button>
            </div>

            <div className="journal-quote-card">
              <div>
                <p className="journal-prompt-label">Reflection Quote</p>
                <p className="journal-quote-text">"{JOURNAL_QUOTES[journalQuoteIndex].text}"</p>
                <p className="journal-quote-author">- {JOURNAL_QUOTES[journalQuoteIndex].author}</p>
              </div>
              <button
                className="ghost-button journal-prompt-btn"
                type="button"
                onClick={handleNextJournalQuote}
              >
                Another Quote
              </button>
            </div>

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
                    <EmojiPicker onEmojiClick={onStandaloneEmojiClick} theme={theme as any} />
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

      {/* ════════════════ MONEY VIEW ════════════════ */}
      {view === "money" && (
        <section className="money-view">
          <h2 className="section-title">💸 Spent Money Tracker</h2>

          {/* Summary card */}
          <div className="money-summary-card">
            <div className="money-summary-label">Total Spent</div>
            <div className="money-total">
              {activeCurrencySymbol}{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="money-count">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""} · {currency.code}
            </div>
          </div>

          {/* Add expense form */}
          <div className="money-card">
            <p className="money-sub">Record a new expense</p>
            <form className="add-expense-form" onSubmit={handleAddExpense}>
              <div className="expense-form-row">
                <input
                  type="text"
                  placeholder="Description (e.g. Coffee)"
                  value={newExpenseDesc}
                  onChange={e => setNewExpenseDesc(e.target.value)}
                  disabled={isAddingExpense}
                  className="expense-input-desc"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  value={newExpenseAmount}
                  onChange={e => setNewExpenseAmount(e.target.value)}
                  disabled={isAddingExpense}
                  className="expense-input-amount"
                />
              </div>
              <div className="expense-form-row">
                <select
                  value={newExpenseCategory}
                  onChange={e => setNewExpenseCategory(e.target.value)}
                  disabled={isAddingExpense}
                  className="expense-select"
                >
                  <option value="General">🗂 General</option>
                  <option value="Food">🍔 Food</option>
                  <option value="Transport">🚌 Transport</option>
                  <option value="Entertainment">🎮 Entertainment</option>
                  <option value="Shopping">🛍 Shopping</option>
                  <option value="Health">💊 Health</option>
                  <option value="Education">📚 Education</option>
                  <option value="Subscriptions">📱 Subscriptions</option>
                  <option value="Other">📦 Other</option>
                </select>
                <button
                  type="submit"
                  className="primary-button expense-add-btn"
                  disabled={isAddingExpense || !newExpenseDesc.trim() || !newExpenseAmount}
                >
                  {isAddingExpense ? "…" : "+ Add"}
                </button>
              </div>
            </form>
          </div>

          {/* Expense list */}
          <div className="expense-list">
            {expensesLoading && <p className="history-empty">Loading expenses…</p>}
            {!expensesLoading && expenses.length === 0 && (
              <div className="history-empty">
                <p>No expenses yet!</p>
                <p>Start tracking where your money goes.</p>
              </div>
            )}
            {expenses.map(exp => (
              <div key={exp._id} className="expense-item">
                <div className="expense-category-badge">{exp.category}</div>
                <div className="expense-details">
                  <span className="expense-desc">{exp.description}</span>
                  <span className="expense-date">
                    {new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="expense-right">
                  <span className="expense-amount">{activeCurrencySymbol}{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <button
                    className="delete-task-btn"
                    onClick={() => handleDeleteExpense(exp._id)}
                    title="Delete expense"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════════════════ PROFILE VIEW ════════════════ */}
      {view === "profile" && (
        <section className="profile-view">
          <h2 className="section-title">👤 User Profile</h2>
          
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {user.username ? user.username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <h3>{user.username || "Anonymous"}</h3>
                <p className="profile-email">{user.email}</p>
              </div>
            </div>
            <div className="profile-details">
              <div className="profile-stat">
                <span className="stat-label">Tasks</span>
                <span className="stat-value">{todos.length}</span>
              </div>
              <div className="profile-stat">
                <span className="stat-label">Expenses</span>
                <span className="stat-value">{expenses.length}</span>
              </div>
              <div className="profile-stat">
                <span className="stat-label">Sessions</span>
                <span className="stat-value">{history.length}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ SETTINGS VIEW ════════════════ */}
      {view === "settings" && (
        <section className="settings-view">
          <h2 className="section-title">⚙️ Settings</h2>

          {/* Timer card */}
          <div className="settings-card">
            <p className="settings-sub-title">⏱ Timer Durations</p>
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

          {/* Currency card */}
          <div className="settings-card currency-card">
            <p className="settings-sub-title">💱 Currency</p>
            <p className="settings-info">
              Choose the currency shown in the Money Tracker.
              Currently: <strong>{currency.code}</strong> ({currency.symbol})
            </p>

            {/* Grid of currency chips */}
            <div className="currency-grid">
              {CURRENCIES.filter(c => c.code !== "CUSTOM").map(c => (
                <button
                  key={c.code}
                  id={`currency-${c.code}`}
                  className={`currency-chip ${currency.code === c.code ? "active" : ""}`}
                  onClick={() => handleCurrencySelect(c.code)}
                  title={c.name}
                >
                  <span className="chip-symbol">{c.symbol}</span>
                  <span className="chip-code">{c.code}</span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="currency-divider">
              <span>or enter a custom currency</span>
            </div>

            {/* Custom currency inputs */}
            <div className="custom-currency-row">
              <input
                id="custom-currency-code"
                type="text"
                className="custom-currency-input"
                placeholder="Code (e.g. MMK)"
                maxLength={6}
                value={customCurrencyCode}
                onChange={e => setCustomCurrencyCode(e.target.value.toUpperCase())}
                onFocus={() => setCurrency(prev => ({ ...prev, code: "CUSTOM" }))}
              />
              <input
                id="custom-currency-symbol"
                type="text"
                className="custom-currency-input"
                placeholder="Symbol (e.g. K)"
                maxLength={5}
                value={customCurrencySymbol}
                onChange={e => setCustomCurrencySymbol(e.target.value)}
                onFocus={() => setCurrency(prev => ({ ...prev, code: "CUSTOM" }))}
              />
              <button
                id="save-custom-currency-btn"
                className="primary-button currency-save-btn"
                onClick={handleSaveCustomCurrency}
                disabled={!customCurrencyCode.trim() || !customCurrencySymbol.trim()}
              >
                Save
              </button>
            </div>

            {currencySaved && (
              <div className="currency-saved-toast">✅ Currency saved!</div>
            )}
          </div>

          {/* Sound settings card */}
          <div className="settings-card sound-card">
            <p className="settings-sub-title">🔊 Sound Alerts</p>
            <p className="settings-info">Choose your notification sound and volume.</p>

            <div className="settings-fields">
              <div className="settings-field toggle-field">
                <label>Enable Sounds</label>
                <button 
                  className={`toggle-btn ${draftSettings.soundEnabled ? "active" : ""}`}
                  onClick={() => setDraftSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                >
                  <div className="toggle-thumb" />
                </button>
              </div>

              <div className="settings-field">
                <label>Alert Sound</label>
                <select 
                  className="sound-select"
                  value={draftSettings.soundName}
                  onChange={e => setDraftSettings(s => ({ ...s, soundName: e.target.value }))}
                >
                  {SOUND_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="settings-field volume-field">
                <label>Volume</label>
                <div className="volume-row">
                  <span className="volume-icon">🔈</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={draftSettings.soundVolume}
                    onChange={e => setDraftSettings(s => ({ ...s, soundVolume: Number(e.target.value) }))}
                    className="volume-slider focus-slider"
                  />
                  <span className="volume-icon">🔊</span>
                </div>
              </div>
            </div>

            <button 
              className="ghost-button test-sound-btn" 
              onClick={() => playTestSound(draftSettings.soundName, draftSettings.soundVolume)}
            >
              🎵 Test Sound
            </button>
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <span>MILLI LOFI TIMER</span>
      </footer>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-timer)',
            border: '2px solid var(--bg-footer)',
            borderRadius: '16px',
            fontFamily: 'inherit',
            fontWeight: 600,
          },
          className: "custom-toast",
          success: {
            iconTheme: {
              primary: '#96EFB5',
              secondary: 'var(--bg-card)',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF9696',
              secondary: 'var(--bg-card)',
            },
          },
        }}
      />
    </main>
  );
}
