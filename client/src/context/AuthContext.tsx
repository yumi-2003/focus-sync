import React, { createContext, useContext, useState } from "react";
import { type User } from "../types";

const AUTH_STORAGE_KEY = "focus-sync-auth";

// Step 1: Define the shape of our Context State.
// This interface dictates what data and functions will be available 
// to any component that consumes this context.
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

// Step 2: Create the Context itself. 
// We initialize it with `undefined` to enforce that it must be used within a Provider.
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// Helper function: Hydrate state from localStorage to persist sessions across page reloads.
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

// Step 3: Create the Provider Component.
// This component encapsulates the state and the state-updating logic.
// It will wrap our application in `main.tsx`.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Step 3a: Initialize State. We read from localStorage first.
  const storedAuth = readStoredAuth();
  const [user, setUser] = useState<User | null>(storedAuth.user);
  const [token, setToken] = useState<string | null>(storedAuth.token);

  // Step 3b: Define State Modifiers (Actions).
  // These functions update the state and handle side-effects like updating localStorage.
  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    // Persist auth data in localStorage for session persistence across refreshes
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

  // Step 4: Provide State and Actions to children.
  // The `value` prop makes `user`, `token`, `login`, and `logout` available globally.
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Step 5: Export a custom hook for easy consumption.
// Instead of importing both `useContext` and `AuthContext` in every component,
// you simply call `useAuth()`.
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
