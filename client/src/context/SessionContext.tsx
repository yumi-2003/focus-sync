import React, { createContext, useContext, useState } from "react";
import { type Session } from "../types";

// Step 1: Define the shape of our Session Context State.
// This interface dictates the data structure for a focus session (e.g. work session, break).
interface SessionContextType {
  session: Session | null;
  startSession: (sessionData: Session) => void;
  endSession: (sessionData: Session) => void;
}

// Step 2: Create the Context itself. 
// Initializing with `undefined` ensures we throw an error if this is used without a Provider.
export const SessionContext = createContext<SessionContextType | undefined>(
  undefined,
);

// Step 3: Create the Provider Component.
// This wraps parts of the app that need to know what the current focus Session is.
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Step 3a: Initialize State for the current session.
  const [session, setSession] = useState<Session | null>(null);

  // Step 3b: Define State Modifiers (Actions).
  // Starts a new focus session or break.
  const startSession = (sessionData: Session) => {
    setSession(sessionData);
  };

  // Ends the current session (currently just overwrites, but could be extended to clear it or log it).
  const endSession = (sessionData: Session) => {
    setSession(sessionData); // Note: Could be setSession(null) depending on exact design.
  };

  // Step 4: Provide State and Actions down the component tree.
  return (
    <SessionContext.Provider value={{ session, startSession, endSession }}>
      {children}
    </SessionContext.Provider>
  );
};

// Step 5: Export a custom hook. 
// Allows components to easily read and update the session state with `const { session } = useSession()`.
export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
};
