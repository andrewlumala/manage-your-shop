import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// null when not configured — every call site checks this before using it,
// so the app degrades to local-only storage rather than crashing.
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, anonKey!) : null;

export const WORKSPACE_TABLE = 'workspace_data';

// Subscribes to changes made by OTHER devices/tabs sharing this workspace.
// Returns an unsubscribe function. No-op (returns a no-op cleanup) when
// Supabase isn't configured.
export function subscribeToWorkspaceChanges(onChange: (key: string, value: unknown) => void): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('workspace-data-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: WORKSPACE_TABLE },
      (payload) => {
        const row = (payload.new ?? payload.old) as { key?: string; value?: unknown } | null;
        if (row?.key) onChange(row.key, row.value);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
