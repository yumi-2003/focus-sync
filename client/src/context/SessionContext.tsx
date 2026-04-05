//create session context provider for session
import React, { createContext, useState } from "react";
import { type Session } from "../types";

interface SessionContextType {
  session: Session | null;
  startSession: (sessionData: Session) => void;
  endSession: (sessionData: Session) => void;
}

export const SessionContext = createContext<SessionContextType>({
  session: null,
  startSession: () => {},
  endSession: () => {},
});

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
    <SessionContext value={{ session, startSession, endSession }}>
      {children}
    </SessionContext>
  );
};
