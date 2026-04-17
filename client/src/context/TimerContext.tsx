import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

export type TimerMode = "focus" | "shortBreak" | "longBreak";

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  soundEnabled: boolean;
  soundName: string;
  soundVolume: number;
}

export const SOUND_OPTIONS = [
  { id: "chime", label: "✨ Chime", url: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg" },
  { id: "bell", label: "🔔 Classic Bell", url: "https://actions.google.com/sounds/v1/alarms/mechanical_clock_ringing_short.ogg" },
  { id: "digital", label: "📟 Digital", url: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg" },
  { id: "success", label: "🎉 Achievement", url: "https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg" },
  { id: "zen", label: "🧘 Zen Bowl", url: "https://actions.google.com/sounds/v1/foley/metal_bowl_singing.ogg" },
];

interface TimerContextType {
  mode: TimerMode;
  settings: TimerSettings;
  isRunning: boolean;
  displayMs: number;        // remaining ms for current segment
  sessionStartTime: Date | null;
  elapsedTotal: number;     // total ms actually spent in focus (for saving)
  resetTimer: () => void;
  setMode: (m: TimerMode) => void;
  updateSettings: (s: Partial<TimerSettings>) => void;
  startTimer: () => void;
  stopTimer: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  playTestSound: (name?: string, volume?: number) => void;
  SOUND_OPTIONS: typeof SOUND_OPTIONS;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  soundEnabled: true,
  soundName: "chime",
  soundVolume: 0.5,
};

const STORAGE_KEY = "fs_timer_settings";

function loadSettings(): TimerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) { console.error("Failed to load settings", e); }
  return DEFAULT_SETTINGS;
}

// why use createContext here?
// createContext is used to create a context
// context is a way to share data between components without prop drilling
export const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<TimerMode>("focus");
  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [displayMs, setDisplayMs] = useState(DEFAULT_SETTINGS.focusMinutes * 60 * 1000);

  // Use a ref for the start time of the current running interval so the tick
  // closure always sees the latest value without causing re-renders.
  const intervalStartRef = useRef<number | null>(null);
  const elapsedAtStartRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  //why use callback here?
  // usecallback is used to memoize the function so that it is not recreated on every render
  // this is important because the function is used in the useEffect hook
  // if we don't use useCallback, the useEffect hook will run on every render
  // and the timer will not work properly
  const durationMs = useCallback((m: TimerMode, s: TimerSettings) => {
    if (m === "focus") return s.focusMinutes * 60 * 1000;
    if (m === "shortBreak") return s.shortBreakMinutes * 60 * 1000;
    return s.longBreakMinutes * 60 * 1000;
  }, []);

  // what tick is for - 
  // tick is a function that is called every 200ms
  // it is used to update the remaining time
  // it is called every 200ms because the interval is set to 200ms
  // this is done to make the timer more accurate and responsive 
  // if we don't use tick, the timer will not update the remaining time
  // if we don't use useCallback, the tick function will be recreated on every render
  // and the interval will be cleared and set again on every render
  // this will cause the timer to not work properly
  // if we don't use intervalStartRef.current, the timer will not work properly
  // it will reset the timer to 0 every time the component re-renders
  // if we don't use elapsedAtStartRef.current, the timer will not work properly
  // it will reset the timer to 0 every time the component re-renders
  // if we don't use tickRef.current, the timer will not work properly
  // it will reset the timer to 0 every time the component re-renders
  const tick = useCallback(() => {
    if (intervalStartRef.current === null) return;
    // why use elapsedAtStartRef.current?
    // elapsedAtStartRef.current is used to store the elapsed time at the start of the interval
    // this is important because the interval is not reset when the component re-renders
    // if we don't use elapsedAtStartRef.current, the timer will not work properly
    // it will reset the timer to 0 every time the component re-renders
    const elapsed = Date.now() - intervalStartRef.current + elapsedAtStartRef.current; 
    // how elapsed time works - 
    // Date.now() - intervalStartRef.current gives the time elapsed since the interval started
    // elapsedAtStartRef.current is the time elapsed before the interval started
    // so the total elapsed time is the sum of the two
    const total = durationMs(mode, settings);
    // why total - elasped?
    // total is the total time for the current mode
    // elapsed is the time elapsed since the interval started
    // so the remaining time is the total time minus the elapsed time
    const remaining = Math.max(0, total - elapsed);
    setDisplayMs(remaining);
    if (remaining === 0) {
      // auto-stop
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setIsRunning(false);
      intervalStartRef.current = null;
      
      // Notify the user
      playChime();
      showNotification();
    }

  }, [mode, settings, durationMs]);

  // Keep interval callback fresh
  const tickRef = useRef(tick);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  const clearTick = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTimer = () => {
    if (isRunning) return;
    if (!sessionStartTime) setSessionStartTime(new Date());
    intervalStartRef.current = Date.now();
    elapsedAtStartRef.current = durationMs(mode, settings) - displayMs;
    intervalRef.current = window.setInterval(() => tickRef.current(), 200);
    setIsRunning(true);
  };

  const stopTimer = () => {
    if (!isRunning) return;
    clearTick();
    // Record how many ms were consumed in this interval
    if (intervalStartRef.current !== null) {
      const consumed = Date.now() - intervalStartRef.current;
      if (mode === "focus") setElapsedTotal(p => p + consumed);
      intervalStartRef.current = null;
    }
    setIsRunning(false);
  };

  const resetTimer = () => {
    clearTick();
    setIsRunning(false);
    setSessionStartTime(null);
    setElapsedTotal(0);
    intervalStartRef.current = null;
    elapsedAtStartRef.current = 0;
    setDisplayMs(durationMs(mode, settings));
  };

  const setMode = (m: TimerMode) => {
    // If the timer was running, record the time spent in the current mode before switching
    if (isRunning && intervalStartRef.current !== null) {
      const consumed = Date.now() - intervalStartRef.current;
      if (mode === "focus") setElapsedTotal(p => p + consumed);
    }
    
    clearTick();
    setIsRunning(false);
    intervalStartRef.current = null;
    elapsedAtStartRef.current = 0;
    setModeState(m);
    setDisplayMs(durationMs(m, settings));
  };


  const playChime = () => {
    if (!settings.soundEnabled) return;
    const sound = SOUND_OPTIONS.find(s => s.id === settings.soundName) || SOUND_OPTIONS[0];
    const audio = new Audio(sound.url);
    audio.volume = settings.soundVolume;
    audio.play().catch(() => {}); 
  };

  const playTestSound = (name?: string, volume?: number) => {
    const soundName = name || settings.soundName;
    const soundVol = volume !== undefined ? volume : settings.soundVolume;
    const sound = SOUND_OPTIONS.find(s => s.id === soundName) || SOUND_OPTIONS[0];
    const audio = new Audio(sound.url);
    audio.volume = soundVol;
    audio.play().catch(() => {});
  };

  const showNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("Focus Sync", {
        body: mode === "focus" ? "Session complete! Time for a break. ☕" : "Break's over! Ready to focus? 🎯",
        icon: "/favicon.svg"
      });
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  };

  const updateSettings = (partial: Partial<TimerSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Reset display to new duration for current mode if relevant duration changed
    if (partial.focusMinutes !== undefined || partial.shortBreakMinutes !== undefined || partial.longBreakMinutes !== undefined) {
      clearTick();
      setIsRunning(false);
      intervalStartRef.current = null;
      elapsedAtStartRef.current = 0;
      setDisplayMs(durationMs(mode, next));
    }
  };

  return (
    <TimerContext.Provider value={{
      mode, settings, isRunning, displayMs, sessionStartTime, elapsedTotal,
      setMode, updateSettings, startTimer, stopTimer, resetTimer,
      requestNotificationPermission, playTestSound, SOUND_OPTIONS
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within a TimerProvider");
  return ctx;
};
