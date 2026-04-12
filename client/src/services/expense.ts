import { type Expense } from "../types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export async function fetchExpenses(token: string): Promise<Expense[]> {
  const res = await fetch(`${API}/expenses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(
  payload: { description: string; amount: number; category: string; date?: string },
  token: string
): Promise<Expense> {
  const res = await fetch(`${API}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ msg: "Failed to create expense" }));
    throw new Error(err.msg ?? "Failed to create expense");
  }
  return res.json();
}

export async function deleteExpense(id: string, token: string): Promise<void> {
  const res = await fetch(`${API}/expenses/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete expense");
}
