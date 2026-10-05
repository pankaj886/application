import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';
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

      const session = await invoke<UserProfile>('start_google_login');

      setSuccessUser(session);
      setLoading(false);

      setTimeout(() => {
        onLoginSuccess(session);
      }, 1000);
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      const errMsg = typeof err === 'string' ? err : err?.message || 'Authentication was cancelled or failed. Please try again.';
      setError(errMsg);
      setLoading(false);
      setSuccessUser(null);
    }
  };

  return (
    <div className="login-pure-wrapper">
      <div className="login-pure-center">
        {successUser ? (
          <div className="login-pure-success">
            {successUser.picture ? (
              <img
                src={successUser.picture}
                alt=""
                className="success-pure-avatar"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="success-pure-avatar-fallback">
                {successUser.name ? successUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <h2 className="success-pure-name">Welcome, {successUser.name}!</h2>
            <p className="success-pure-email">{successUser.email}</p>
          </div>
        ) : loading ? (
          <div className="google-pure-btn google-pure-loading">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Connecting to Google...</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="google-pure-btn"
            title="Sign in with Google"
          >
            <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
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
            <span>Sign in with Google</span>
          </button>
        )}

        {error && <p className="google-pure-error">{error}</p>}
      </div>
    </div>
  );
};

export default LoginView;
