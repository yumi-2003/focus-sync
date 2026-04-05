import React, { createContext, useContext, useState } from "react";

interface TimerContextType {
  isRunning: boolean;
  startTime: Date | null;
  elapsedTime: number;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

export const TimerContext = createContext<TimerContextType | undefined>(
  undefined,
);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimer = () => {
    setIsRunning(true);
    setStartTime(new Date());
  };

  const stopTimer = () => {
    if (startTime) {
      const endTime = new Date();
      const timeDiff = endTime.getTime() - startTime.getTime();
      setElapsedTime((prev) => prev + timeDiff);
      setIsRunning(false);
      setStartTime(null);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  return (
    <TimerContext.Provider
      value={{
        isRunning,
        startTime,
        elapsedTime,
        startTimer,
        stopTimer,
        resetTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);

  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }

  return context;
};
