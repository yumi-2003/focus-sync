import { type ChangeEvent, type FormEvent, useState } from "react";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import { loginUser, registerUser } from "./services/auth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

type AuthMode = "login" | "register";

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

const initialFormState: FormState = {
  email: "",
  password: "",
  confirmPassword: "",
};

function App() {
  const { user, token, login, logout } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
  };

  const handleClear = () => {
    setForm(initialFormState);
    setError("");
    setSuccess("");
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const authResponse = await loginUser({
        email: form.email,
        password: form.password,
      });

      login(authResponse.user, authResponse.token);
      setForm(initialFormState);
      setSuccess("Signed in successfully.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      //call register API and log in on success
      const authResponse = await registerUser({
        email: form.email,
        password: form.password,
      });

      // Automatically log in the user after successful registration
      login(authResponse.user, authResponse.token);
      setForm(initialFormState);
      setSuccess("Account created and signed in.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return (
      <main className="app-shell">
        <section className="auth-layout auth-layout--compact">
          <section className="auth-panel">
            <div className="auth-header">
              <span className="auth-kicker">Focus Sync</span>
              <h1>Signed in</h1>
              <p>{user.email}</p>
            </div>

            {success ? <div className="message success">{success}</div> : null}

            <div className="dashboard-meta">
              <div className="dashboard-card">
                <strong>Email</strong>
                <span>{user.email}</span>
              </div>

              <div className="dashboard-card">
                <strong>Session</strong>
                <span>{token ? "Active" : "Unavailable"}</span>
              </div>
            </div>

            <div className="button-row">
              <button className="ghost-button" type="button" onClick={logout}>
                Log out
              </button>
            </div>
          </section>
        </section>
      </main>
    );
  }

  if (mode === "register") {
    return (
      <RegisterPage
        form={form}
        error={error}
        success={success}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onSubmit={handleRegisterSubmit}
        onClear={handleClear}
        onSwitchToLogin={() => handleModeChange("login")}
      />
    );
  }

  return (
    <LoginPage
      form={form}
      error={error}
      success={success}
      isSubmitting={isSubmitting}
      onChange={handleChange}
      onSubmit={handleLoginSubmit}
      onClear={handleClear}
      onSwitchToRegister={() => handleModeChange("register")}
    />
  );
}

export default App;
