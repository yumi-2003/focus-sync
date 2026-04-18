import { type ChangeEvent, type FormEvent, useState } from "react";

interface RegisterPageProps {
  form: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  error: string;
  isSubmitting: boolean;
  fieldErrors: {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onSwitchToLogin: () => void;
}

function RegisterPage({
  form,
  error,
  isSubmitting,
  fieldErrors,
  onChange,
  onSubmit,
  onClear,
  onSwitchToLogin,
}: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
              <span>Username</span>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="Choose a username"
                autoComplete="username"
                required
              />
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </label>

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
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </label>

            <label className="field">
              <span>Password</span>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </label>

            <label className="field">
              <span>Confirm password</span>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={onChange}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && <div className="field-error">{fieldErrors.confirmPassword}</div>}
            </label>

            {error ? <div className="message error">{error}</div> : null}

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
