import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { signup, checkUsernameAvailable } from '../services/authService'

function getPasswordStrength(password) {
  const checks = {
    length:    password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^a-zA-Z0-9]/.test(password),
  }
  return { checks, score: Object.values(checks).filter(Boolean).length }
}

const STRENGTH_CLASS = ['', 'active-weak', 'active-fair', 'active-good', 'active-strong', 'active-strong']

function getErrorMessage(err) {
  const msg = err.message?.toLowerCase() ?? ''
  if (msg.includes('already registered') || msg.includes('email already')) return 'This email is already registered'
  if (msg.includes('duplicate') && msg.includes('username')) return 'Username already taken'
  if (msg.includes('password')) return 'Password does not meet requirements'
  return err.message || 'Sign up failed. Please try again'
}

export default function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken'

  const { checks, score } = getPasswordStrength(formData.password)

  async function handleUsernameBlur() {
    const username = formData.username.trim()
    if (!username || username.length < 3) return
    setUsernameStatus('checking')
    try {
      const available = await checkUsernameAvailable(username)
      setUsernameStatus(available ? 'available' : 'taken')
    } catch {
      setUsernameStatus(null)
    }
  }

  function validate() {
    const errs = {}
    if (!formData.email) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email address'

    if (!formData.username) errs.username = 'Username is required'
    else if (formData.username.length < 3) errs.username = 'At least 3 characters required'
    else if (formData.username.length > 30) errs.username = 'Must be under 30 characters'
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) errs.username = 'Letters, numbers, and underscores only'
    else if (usernameStatus === 'taken') errs.username = 'Username already taken'

    if (!formData.password) errs.password = 'Password is required'
    else if (score < 3) errs.password = 'Password is too weak — meet at least 3 requirements'

    if (!formData.confirmPassword) errs.confirmPassword = 'Please confirm your password'
    else if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match'

    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setLoading(true)
    setError('')
    try {
      await signup(formData.email, formData.password, formData.username.trim())
      toast.success('Account created! Check your email to verify, then log in.')
      navigate('/login')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🪙</div>
          <h1>CoinSeek</h1>
          <p>Start your collection today</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>Create account</h2>

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
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username" type="text"
              className={`form-input ${errors.username ? 'error' : usernameStatus === 'available' ? 'success' : ''}`}
              placeholder="collector123"
              value={formData.username}
              onChange={e => { setFormData(p => ({ ...p, username: e.target.value })); setUsernameStatus(null) }}
              onBlur={handleUsernameBlur}
              autoComplete="username"
            />
            {usernameStatus === 'checking' && <div className="field-success">Checking availability…</div>}
            {usernameStatus === 'available' && !errors.username && <div className="field-success">✓ Username available</div>}
            {usernameStatus === 'taken' && !errors.username && <div className="field-error">Username already taken</div>}
            {errors.username && <div className="field-error">{errors.username}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Create a strong password"
              value={formData.password}
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
              autoComplete="new-password"
            />
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`strength-bar ${i <= score ? STRENGTH_CLASS[score] : ''}`} />
                  ))}
                </div>
                <div className="strength-requirements">
                  <div className={`req-item ${checks.length    ? 'met' : ''}`}>{checks.length    ? '✓' : '○'} 8+ characters</div>
                  <div className={`req-item ${checks.uppercase ? 'met' : ''}`}>{checks.uppercase ? '✓' : '○'} Uppercase letter</div>
                  <div className={`req-item ${checks.lowercase ? 'met' : ''}`}>{checks.lowercase ? '✓' : '○'} Lowercase letter</div>
                  <div className={`req-item ${checks.number   ? 'met' : ''}`}>{checks.number   ? '✓' : '○'} Number</div>
                  <div className={`req-item ${checks.special  ? 'met' : ''}`}>{checks.special  ? '✓' : '○'} Special character</div>
                </div>
              </div>
            )}
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword" type="password"
              className={`form-input ${errors.confirmPassword ? 'error' : formData.confirmPassword && formData.password === formData.confirmPassword ? 'success' : ''}`}
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
              autoComplete="new-password"
            />
            {!errors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div className="field-success">✓ Passwords match</div>
            )}
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" /> Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
