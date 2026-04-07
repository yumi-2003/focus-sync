import { type ChangeEvent, type FormEvent } from "react";

interface LoginPageProps {
  form: {
    email: string;
    password: string;
  };
  error: string;
  success: string;
  isSubmitting: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onSwitchToRegister: () => void;
}

function LoginPage({
  form,
  error,
  success,
  isSubmitting,
  onChange,
  onSubmit,
  onClear,
  onSwitchToRegister,
}: LoginPageProps) {
  return (
    <section className="auth-panel">
          <div className="auth-header">
            <span className="auth-kicker">Focus Sync</span>
            <h1>Login</h1>
            <p>Enter your email and password.</p>
          </div>

          <div className="mode-switch" aria-label="Authentication mode">
            <button type="button" className="active" disabled={isSubmitting}>
              Login
            </button>
            <button
              type="button"
              onClick={onSwitchToRegister}
              disabled={isSubmitting}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? <div className="message error">{error}</div> : null}
            {success ? <div className="message success">{success}</div> : null}

            <div className="button-row">
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={onClear}
                disabled={isSubmitting}
              >
                Clear
              </button>
            </div>
          </form>
    </section>
  );
}

export default LoginPage;
