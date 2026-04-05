import React, { createContext, useContext, useState } from "react";
import { type Session } from "../types";

interface SessionContextType {
  session: Session | null;
  startSession: (sessionData: Session) => void;
  endSession: (sessionData: Session) => void;
}

export const SessionContext = createContext<SessionContextType | undefined>(
  undefined,
);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);

  const startSession = (sessionData: Session) => {
    setSession(sessionData);
  };

  const endSession = (sessionData: Session) => {
    setSession(sessionData);
  };

  return (
    <SessionContext.Provider value={{ session, startSession, endSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
};
