import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export interface AuthResult {
  error?: string;
  needsEmailConfirmation?: boolean;
}

export async function signUp(fullName: string, email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { error: 'Not connected to a backend.' };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };
  // If your Supabase project has "Confirm email" turned on, signUp succeeds
  // but doesn't return a live session until the user clicks the email link.
  return { needsEmailConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { error: 'Not connected to a backend.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { error: 'Not connected to a backend.' };
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  return error ? { error: error.message } : {};
}

export async function setNewPassword(password: string): Promise<AuthResult> {
  if (!supabase) return { error: 'Not connected to a backend.' };
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { error: error.message } : {};
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Fires immediately with the current session, then again on every
// login/logout/token-refresh/password-recovery. Returns an unsubscribe
// function. The event string lets callers specifically detect
// 'PASSWORD_RECOVERY', which fires when someone lands via a reset-password
// email link rather than a normal login.
export function onAuthStateChange(callback: (session: Session | null, event: string) => void): () => void {
  if (!supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => callback(session, event));
  return () => subscription.unsubscribe();
}

export function userDisplayName(session: Session | null): string {
  return (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email || '';
}
