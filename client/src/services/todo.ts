import { type Todo } from "../types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export async function fetchTodos(token: string): Promise<Todo[]> {
  const res = await fetch(`${API}/todos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch todos");
  return res.json();
}

export async function createTodo(text: string, token: string): Promise<Todo> {
  const res = await fetch(`${API}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ msg: "Failed to create todo" }));
    throw new Error(err.msg ?? "Failed to create todo");
  }
  return res.json();
}

export async function updateTodoStatus(id: string, completed: boolean, token: string): Promise<Todo> {
  const res = await fetch(`${API}/todos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ completed }),
  });

  if (!res.ok) throw new Error("Failed to update todo");
  return res.json();
}

export async function deleteTodo(id: string, token: string): Promise<void> {
  const res = await fetch(`${API}/todos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete todo");
}
