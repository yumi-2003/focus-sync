const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export interface HistorySession {
  _id: string;
  userId: string;
  startTime: string;
  endTime: string;
  moodBefore: string;
  moodAfter: string;
  focusLevel: number;
  distractions?: string;
  mode: string;
  backgroundImageUrl?: string;
}

export interface CreateSessionPayload {
  startTime: string;
  endTime: string;
  moodBefore: string;
  moodAfter: string;
  focusLevel: number;
  distractions: string;
  mode: string;
  backgroundImage?: File | null;
}

export async function createSession(payload: CreateSessionPayload, token: string): Promise<HistorySession> {
  const form = new FormData();
  form.append("startTime", payload.startTime);
  form.append("endTime", payload.endTime);
  form.append("moodBefore", payload.moodBefore);
  form.append("moodAfter", payload.moodAfter);
  form.append("focusLevel", String(payload.focusLevel));
  form.append("distractions", payload.distractions);
  form.append("mode", payload.mode);
  if (payload.backgroundImage) {
    form.append("backgroundImage", payload.backgroundImage);
  }

  const res = await fetch(`${API}/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ msg: "Failed to save session" }));
    throw new Error(err.msg ?? "Failed to save session");
  }
  return res.json();
}

export async function fetchSessions(token: string): Promise<HistorySession[]> {
  const res = await fetch(`${API}/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}
