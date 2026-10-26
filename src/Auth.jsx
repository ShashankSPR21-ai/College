import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './Auth.css'

export default function Auth({ mode, onClose }) {
  const [isSignup, setIsSignup] = useState(mode === 'signup')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    setLoading(true)
    setMessage('')
    setError('')

    try {
      if (isSignup) {
        if (password.length < 8) {
          throw new Error('Password must contain at least 8 characters.')
        }

        const { error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: window.location.origin,
          },
        })

        if (signupError) {
          throw signupError
        }

        setMessage(
          'Registration submitted! Check your email for the verification link before logging in.',
        )
      } else {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })

        if (loginError) {
          throw loginError
        }

        setMessage('Login successful! Welcome to CourseCompass.')

        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset() {
    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }

    setLoading(true)

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })

      if (resetError) {
        throw resetError
      }

      setMessage(
        'If the account exists, a password reset email will be sent.',
      )
    } catch (err) {
      setError(err.message || 'Unable to send the reset email.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setIsSignup((previousMode) => !previousMode)
    setMessage('')
    setError('')
    setPassword('')
  }

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="auth-close"
          onClick={onClose}
          aria-label="Close authentication window"
        >
          ×
        </button>

        <div className="auth-logo">C</div>

        <span className="auth-eyebrow">WELCOME TO COURSECOMPASS</span>

        <h2 id="auth-title">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h2>

        <p className="auth-subtitle">
          {isSignup
            ? 'Start exploring courses and planning your future.'
            : 'Sign in to continue your journey.'}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              Full name

              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email address

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              placeholder={
                isSignup
                  ? 'At least 8 characters'
                  : 'Enter your password'
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={isSignup ? 8 : undefined}
              required
            />
          </label>

          {!isSignup && (
            <button
              type="button"
              className="reset-password"
              onClick={handlePasswordReset}
              disabled={loading}
            >
              Forgot password?
            </button>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-success" role="status">
              {message}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : isSignup
                ? 'Create account'
                : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}

          <button type="button" onClick={switchMode}>
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </section>
    </div>
  )
}