import React, { createContext, useContext, useState } from "react";
import { type User } from "../types";

const AUTH_STORAGE_KEY = "focus-sync-auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const readStoredAuth = () => {
  if (typeof window === "undefined") {
    return { user: null, token: null };
  }

  const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!saved) {
    return { user: null, token: null };
  }

  try {
    return JSON.parse(saved) as { user: User; token: string };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return { user: null, token: null };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const storedAuth = readStoredAuth();
  const [user, setUser] = useState<User | null>(storedAuth.user);
  const [token, setToken] = useState<string | null>(storedAuth.token);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    // Persist auth data in localStorage for session persistence
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: userData, token: authToken }),
    );
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
