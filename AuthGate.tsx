import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { TeamMember, UserRole } from '@/types';
import { isSupabaseConfigured, subscribeToWorkspaceChanges } from '@/lib/supabaseClient';
import { getSession, onAuthStateChange, signIn, signUp, signOut, requestPasswordReset, setNewPassword, userDisplayName } from '@/lib/auth';
import { loadTeam, saveTeam, KEYS } from '@/lib/storage';
import { useTheme, type Theme } from '@/lib/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';

const inputClass =
  'w-full px-4 py-3 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all';
const brandButton =
  'w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-500/20';

interface AppAuthProps {
  userName?: string;
  userId?: string;
  role?: UserRole;
  team?: TeamMember[];
  onLogout?: () => void;
  onTeamChange?: (team: TeamMember[]) => void;
}

export function AuthGate({ children }: { children: (props: AppAuthProps) => ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const teamBaseRef = useRef<TeamMember[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    getSession().then((s) => setSession(s));
    return onAuthStateChange((s, event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
    });
  }, []);

  // Once we have a session, resolve this person's place on the team:
  // create them (owner if they're the very first ever, otherwise pending
  // staff) if they're new, or just look up their existing membership.
  useEffect(() => {
    if (!session) {
      setLoading(isSupabaseConfigured);
      return;
    }
    let cancelled = false;
    (async () => {
      const currentTeam = await loadTeam();
      if (cancelled) return;
      teamBaseRef.current = currentTeam;

      const existing = currentTeam.find((m) => m.userId === session.user.id);
      if (existing) {
        setTeam(currentTeam);
        setLoading(false);
        return;
      }

      const newMember: TeamMember = {
        id: session.user.id,
        userId: session.user.id,
        email: session.user.email || '',
        name: userDisplayName(session),
        role: currentTeam.length === 0 ? 'owner' : 'staff',
        status: currentTeam.length === 0 ? 'approved' : 'pending',
        joinedAt: new Date().toISOString(),
      };
      const merged = await saveTeam(currentTeam, [...currentTeam, newMember]);
      if (cancelled) return;
      teamBaseRef.current = merged;
      setTeam(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Live updates to team membership — instant approval/role/removal instead
  // of waiting on a manual refresh.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    return subscribeToWorkspaceChanges((key, value) => {
      if (key === KEYS.team) {
        teamBaseRef.current = value as TeamMember[];
        setTeam(value as TeamMember[]);
      }
    });
  }, []);

  const me = session ? team.find((m) => m.userId === session.user.id) : undefined;

  const handleTeamChange = async (next: TeamMember[]) => {
    const merged = await saveTeam(teamBaseRef.current, next);
    teamBaseRef.current = merged;
    setTeam(merged);
  };

  if (!isSupabaseConfigured) {
    return <>{children({})}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-white dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (session && recovering) {
    return <SetNewPasswordScreen theme={theme} toggleTheme={toggleTheme} onDone={() => setRecovering(false)} />;
  }

  if (!session) {
    return <AuthForm theme={theme} toggleTheme={toggleTheme} />;
  }

  if (me && me.status === 'pending') {
    return <PendingApprovalScreen theme={theme} toggleTheme={toggleTheme} onLogout={signOut} />;
  }

  // Removed from the team after initially joining — never treat "no role
  // found" as license to fall through with default access.
  if (!me) {
    return <RemovedScreen theme={theme} toggleTheme={toggleTheme} onLogout={signOut} />;
  }

  return (
    <>
      {children({
        userName: me?.name || userDisplayName(session),
        userId: session.user.id,
        role: me?.role,
        team,
        onLogout: signOut,
        onTeamChange: handleTeamChange,
      })}
    </>
  );
}

function RemovedScreen({ theme, toggleTheme, onLogout }: { theme: Theme; toggleTheme: () => void; onLogout: () => void }) {
  return (
    <AuthShell theme={theme} toggleTheme={toggleTheme}>
      <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2">No longer have access</h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
          Your account isn't part of this workspace anymore. Contact an owner if you believe this is a mistake.
        </p>
        <button onClick={onLogout} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
          Log out
        </button>
      </div>
    </AuthShell>
  );
}

function AuthShell({ theme, toggleTheme, children }: { theme: Theme; toggleTheme: () => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-white dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle
          theme={theme}
          onToggle={toggleTheme}
          className="text-neutral-500 hover:bg-violet-100 hover:text-violet-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
        />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold">Kikuubo Wholesale Tracker</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function PendingApprovalScreen({ theme, toggleTheme, onLogout }: { theme: Theme; toggleTheme: () => void; onLogout: () => void }) {
  return (
    <AuthShell theme={theme} toggleTheme={toggleTheme}>
      <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2">Waiting for approval</h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
          Your account was created, but an owner needs to approve you before you can get in. This page will update
          automatically once you're approved.
        </p>
        <button onClick={onLogout} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
          Log out
        </button>
      </div>
    </AuthShell>
  );
}

function SetNewPasswordScreen({ theme, toggleTheme, onDone }: { theme: Theme; toggleTheme: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const result = await setNewPassword(password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  };

  return (
    <AuthShell theme={theme} toggleTheme={toggleTheme}>
      <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-2xl p-8">
        <h2 className="text-lg font-semibold mb-1">Set a new password</h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
          {error && (
            <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          <button type="submit" disabled={submitting} className={`${brandButton} disabled:opacity-60 disabled:cursor-not-allowed`}>
            {submitting ? 'Saving…' : 'Save Password'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

function AuthForm({ theme, toggleTheme }: { theme: Theme; toggleTheme: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: typeof mode) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!form.email.trim()) {
      setError('Enter your email.');
      return;
    }

    if (mode === 'forgot') {
      setSubmitting(true);
      const result = await requestPasswordReset(form.email.trim());
      setSubmitting(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInfo('Check your email for a link to reset your password.');
      return;
    }

    if (!form.password) {
      setError('Enter your password.');
      return;
    }
    if (mode === 'register' && !form.name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const result =
      mode === 'login' ? await signIn(form.email.trim(), form.password) : await signUp(form.name.trim(), form.email.trim(), form.password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (mode === 'register' && result.needsEmailConfirmation) {
      setInfo('Account created — check your email to confirm it, then log in.');
      setMode('login');
      setForm({ ...form, password: '' });
    }
    // Otherwise onAuthStateChange in the parent picks up the new session automatically.
  };

  return (
    <AuthShell theme={theme} toggleTheme={toggleTheme}>
      <p className="text-center text-neutral-500 dark:text-neutral-400 -mt-4 mb-6">Shared workspace — sign in to continue</p>

      <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-2xl p-8">
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-2 mb-6 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
            <button
              onClick={() => switchMode('login')}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              Create Account
            </button>
          </div>
        )}
        {mode === 'forgot' && <h2 className="text-lg font-semibold mb-4">Reset your password</h2>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
            autoComplete="email"
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          )}

          {mode === 'login' && (
            <button type="button" onClick={() => switchMode('forgot')} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
              Forgot password?
            </button>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 rounded-xl p-3 text-emerald-600 dark:text-emerald-400 text-sm">
              {info}
            </div>
          )}

          <button type="submit" disabled={submitting} className={`${brandButton} disabled:opacity-60 disabled:cursor-not-allowed`}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
          </button>

          {mode === 'forgot' && (
            <button type="button" onClick={() => switchMode('login')} className="w-full text-sm text-neutral-500 dark:text-neutral-400 hover:underline">
              Back to sign in
            </button>
          )}
        </form>
      </div>

      <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-6">
        Everyone approved into this workspace shares the same inventory, sales, and records.
      </p>
    </AuthShell>
  );
}
