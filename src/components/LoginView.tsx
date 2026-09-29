import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<UserProfile | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Invoke Tauri Rust backend loopback OAuth
      const session = await invoke<UserProfile>('start_google_login');

      // Trigger post-login celebration animation
      setSuccessUser(session);
      setLoading(false);

      // Give user 1.8 seconds to enjoy the smooth welcome animation
      setTimeout(() => {
        onLoginSuccess(session);
      }, 1800);
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      const errMsg = typeof err === 'string' ? err : err?.message || 'Authentication was cancelled or failed. Please try again.';
      setError(errMsg);
      setLoading(false);
      setSuccessUser(null);
    }
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-background-glow" />

      <div className="login-card-container">
        {/* Celebration / Success Animation Screen */}
        {successUser ? (
          <div className="login-success-card animate-scale-in">
            <div className="success-avatar-wrapper">
              {successUser.picture ? (
                <img
                  src={successUser.picture}
                  alt={successUser.name}
                  className="success-avatar-img"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="success-avatar-fallback">
                  {successUser.name ? successUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="success-badge-icon">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            <div className="success-text-block">
              <span className="success-badge-tag">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                Google Verified
              </span>
              <h2 className="success-user-name">Welcome, {successUser.name}!</h2>
              <p className="success-user-email">{successUser.email}</p>
            </div>

            <div className="success-loading-bar-track">
              <div className="success-loading-bar-fill" />
            </div>
            <p className="success-status-note">Loading Foreigners Studio Portal...</p>
          </div>
        ) : (
          /* Main Login Screen */
          <div className="login-main-card">
            <div className="login-brand-header">
              <div className="login-logo-halo">
                <img src="/fs_logo.svg" alt="Foreigners Studio" className="login-logo-img" />
              </div>
              <h1 className="login-app-title">Foreigners Studio</h1>
              <p className="login-app-subtitle">Enterprise Passport Automation & Services Portal</p>
            </div>

            <div className="login-body">
              <div className="login-instructions">
                <p>Sign in with your Google account to access all passport applications, tracking, and document services.</p>
              </div>

              {error && (
                <div className="login-error-banner animate-fade-in">
                  <AlertCircle className="login-error-icon" />
                  <span className="login-error-text">{error}</span>
                </div>
              )}

              {loading ? (
                <div className="login-waiting-box animate-pulse">
                  <Loader2 className="login-waiting-spinner animate-spin" />
                  <div className="login-waiting-texts">
                    <p className="login-waiting-title">Signing in via Google...</p>
                    <p className="login-waiting-sub">Please complete the sign-in prompt in your web browser.</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="google-sign-in-button"
                  title="Sign in with your Google Account"
                >
                  <svg className="google-icon-svg" viewBox="0 0 24 24" width="20" height="20">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="google-sign-in-text">Sign in with Google</span>
                  <ArrowRight className="google-arrow-icon" />
                </button>
              )}
            </div>

            <div className="login-card-footer">
              <span className="login-security-tag">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-sky-400" />
                End-to-End Cryptographically Verified
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
