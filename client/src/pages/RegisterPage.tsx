import { type ChangeEvent, type FormEvent } from "react";

interface RegisterPageProps {
  form: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  error: string;
  success: string;
  isSubmitting: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onSwitchToLogin: () => void;
}

function RegisterPage({
  form,
  error,
  success,
  isSubmitting,
  onChange,
  onSubmit,
  onClear,
  onSwitchToLogin,
}: RegisterPageProps) {
  return (
    <section className="auth-panel">
          <div className="auth-header">
            <span className="auth-kicker">Focus Sync</span>
            <h1>Register</h1>
            <p>Create an account to continue.</p>
          </div>

          <div className="mode-switch" aria-label="Authentication mode">
            <button
              type="button"
              onClick={onSwitchToLogin}
              disabled={isSubmitting}
            >
              Login
            </button>
            <button type="button" className="active" disabled={isSubmitting}>
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
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={onChange}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </label>

            {error ? <div className="message error">{error}</div> : null}
            {success ? <div className="message success">{success}</div> : null}

            <div className="button-row">
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
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

export default RegisterPage;
