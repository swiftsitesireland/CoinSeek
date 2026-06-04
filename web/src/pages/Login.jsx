import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { login, resetPassword } from '../services/authService'

const RATE_KEY = 'login_attempts'
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function getRateState() {
  try {
    return JSON.parse(localStorage.getItem(RATE_KEY) || 'null')
  } catch { return null }
}

function isRateLimited() {
  const state = getRateState()
  if (!state) return false
  if (Date.now() > state.resetAt) { localStorage.removeItem(RATE_KEY); return false }
  return state.count >= MAX_ATTEMPTS
}

function recordAttempt() {
  const now = Date.now()
  const state = getRateState()
  if (!state || now > state.resetAt) {
    localStorage.setItem(RATE_KEY, JSON.stringify({ count: 1, resetAt: now + WINDOW_MS }))
  } else {
    localStorage.setItem(RATE_KEY, JSON.stringify({ ...state, count: state.count + 1 }))
  }
}

function getErrorMessage(err) {
  const msg = err.message?.toLowerCase() ?? ''
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) return 'Invalid email or password'
  if (msg.includes('email not confirmed')) return 'Please verify your email before logging in'
  if (msg.includes('too many')) return 'Too many attempts. Please try again later'
  return err.message || 'Login failed. Please try again'
}

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  function validate() {
    const errs = {}
    const email = formData.email.trim()
    if (!email) errs.email = 'Email is required'
    else if (email.length > 254) errs.email = 'Email is too long'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email address'
    if (!formData.password) errs.password = 'Password is required'
    else if (formData.password.length > 128) errs.password = 'Password is too long'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isRateLimited()) {
      setError('Too many login attempts. Please wait 15 minutes and try again.')
      return
    }
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setLoading(true)
    setError('')
    try {
      recordAttempt()
      await login(formData.email.trim(), formData.password)
      localStorage.removeItem(RATE_KEY)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    if (!forgotEmail) return
    setForgotLoading(true)
    try {
      await resetPassword(forgotEmail)
      toast.success('Password reset email sent! Check your inbox.')
      setShowForgot(false)
      setForgotEmail('')
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🪙</div>
          <h1>CoinSeek</h1>
          <p>Your coin collection, organized</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>Welcome back</h2>

          {error && (
            <div className="error-banner">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="you@example.com"
              value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              autoComplete="email"
              maxLength={254}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              value={formData.password}
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
              autoComplete="current-password"
              maxLength={128}
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div className="checkbox-group" style={{ margin: 0 }}>
              <input type="checkbox" id="remember" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
              <label htmlFor="remember">Remember me</label>
            </div>
            <button type="button" className="btn btn-ghost" style={{ fontSize: '0.875rem' }} onClick={() => setShowForgot(true)}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Create one</Link>
        </div>
      </div>

      {showForgot && (
        <div className="forgot-overlay" onClick={() => setShowForgot(false)}>
          <div className="auth-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Reset Password</h2>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email" className="form-input"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowForgot(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={forgotLoading}>
                  {forgotLoading ? <><div className="spinner" /> Sending...</> : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
