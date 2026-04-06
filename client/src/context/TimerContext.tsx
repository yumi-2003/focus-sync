import React, { createContext, useContext, useState } from "react";

// Step 1: Define the shape of our Timer Context State.
// Tracks whether the timer is running, when it started, and the total elapsed time.
interface TimerContextType {
  isRunning: boolean;
  startTime: Date | null;
  elapsedTime: number; // Stored in milliseconds
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

// Step 2: Create the Context itself.
// Initialized with `undefined` to enforce usage within a Provider.
export const TimerContext = createContext<TimerContextType | undefined>(
  undefined,
);

// Step 3: Create the Provider Component.
// This wraps our app (or a specific route) and holds the actual React State for the timer.
export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Step 3a: Initialize State values.
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Step 3b: Define State Modifiers (Actions).

  // Starts the timer by logging the current date as the `startTime` and setting `isRunning` to true.
  const startTimer = () => {
    setIsRunning(true);
    setStartTime(new Date());
  };

  // Stops the timer by calculating the time difference since `startTime`, 
  // adding it to `elapsedTime`, and then setting `isRunning` to false.
  const stopTimer = () => {
    if (startTime) {
      const endTime = new Date();
      const timeDiff = endTime.getTime() - startTime.getTime();
      setElapsedTime((prev) => prev + timeDiff);
      setIsRunning(false);
      setStartTime(null);
    }
  };

  // Resets all state values back to their defaults.
  const resetTimer = () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  // Step 4: Provide State and Actions to the children components.
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

// Step 5: Export a custom hook. 
// Enables deep components to start, stop, or display the timer without prop-drilling.
export const useTimer = () => {
  const context = useContext(TimerContext);

  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }

  return context;
};
