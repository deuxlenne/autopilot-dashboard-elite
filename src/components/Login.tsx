import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for confirmation link (if enabled). Or try signing in.');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative scanlines">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="card-glow p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="font-orbitron text-3xl neon-text-cyan tracking-widest mb-2">
            NEON
          </h1>
          <p className="text-sm text-cyan-400/70 tracking-[0.3em] uppercase">
            // Task Tracker v1.0
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-cyan-400/80 mb-1 tracking-wider">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded text-sm"
              placeholder="you@domain.com"
            />
          </div>

          <div>
            <label className="block text-xs text-cyan-400/80 mb-1 tracking-wider">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 rounded text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm border border-red-500/40 bg-red-500/10 px-3 py-2 rounded">
              {error}
            </div>
          )}
          {message && (
            <div className="text-cyan-300 text-sm border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 rounded">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neon-btn w-full py-3 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : isSignUp ? 'CREATE ACCOUNT' : 'ACCESS SYSTEM'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            className="text-xs text-purple-400 hover:text-purple-300 tracking-wider"
          >
            {isSignUp ? '← Already have access? Sign in' : 'Need an account? Initialize →'}
          </button>
        </div>
      </div>
    </div>
  );
}
