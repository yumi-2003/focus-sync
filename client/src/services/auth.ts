import { type User } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export interface AuthResponse {
  token: string;
  user: User;
}

interface Credentials {
  email: string;
  password: string;
}

const sendAuthRequest = async (
  path: string,
  credentials: Credentials,
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg ?? "Authentication failed");
  }

  return data as AuthResponse;
};

export const registerUser = (credentials: Credentials) =>
  sendAuthRequest("/auth/register", credentials);

export const loginUser = (credentials: Credentials) =>
  sendAuthRequest("/auth/login", credentials);
