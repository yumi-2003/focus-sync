import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

export type TimerMode = "focus" | "shortBreak" | "longBreak";

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

interface TimerContextType {
  mode: TimerMode;
  settings: TimerSettings;
  isRunning: boolean;
  displayMs: number;        // remaining ms for current segment
  sessionStartTime: Date | null;
  elapsedTotal: number;     // total ms actually spent in focus (for saving)
  setMode: (m: TimerMode) => void;
  updateSettings: (s: Partial<TimerSettings>) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<TimerMode>("focus");
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [displayMs, setDisplayMs] = useState(DEFAULT_SETTINGS.focusMinutes * 60 * 1000);

  // Use a ref for the start time of the current running interval so the tick
  // closure always sees the latest value without causing re-renders.
  const intervalStartRef = useRef<number | null>(null);
  const elapsedAtStartRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  const durationMs = useCallback((m: TimerMode, s: TimerSettings) => {
    if (m === "focus") return s.focusMinutes * 60 * 1000;
    if (m === "shortBreak") return s.shortBreakMinutes * 60 * 1000;
    return s.longBreakMinutes * 60 * 1000;
  }, []);

  const tick = useCallback(() => {
    if (intervalStartRef.current === null) return;
    const elapsed = Date.now() - intervalStartRef.current + elapsedAtStartRef.current;
    const total = durationMs(mode, settings);
    const remaining = Math.max(0, total - elapsed);
    setDisplayMs(remaining);
    if (remaining === 0) {
      // auto-stop
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setIsRunning(false);
      intervalStartRef.current = null;
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
    clearTick();
    setIsRunning(false);
    intervalStartRef.current = null;
    elapsedAtStartRef.current = 0;
    setModeState(m);
    setDisplayMs(durationMs(m, settings));
  };

  const updateSettings = (partial: Partial<TimerSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    // Reset display to new duration for current mode
    clearTick();
    setIsRunning(false);
    intervalStartRef.current = null;
    elapsedAtStartRef.current = 0;
    setDisplayMs(durationMs(mode, next));
  };

  return (
    <TimerContext.Provider value={{
      mode, settings, isRunning, displayMs, sessionStartTime, elapsedTotal,
      setMode, updateSettings, startTimer, stopTimer, resetTimer,
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
