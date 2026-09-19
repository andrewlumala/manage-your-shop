import { useRef, useState } from 'react';
import type { AppSettings, TeamMember, UserRole } from '@/types';
import { CURRENCIES } from '@/lib/currency';
import { TeamPanel } from '@/components/TeamPanel';

const inputClass =
  'w-full px-4 py-2.5 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500';

export function SettingsPanel({
  settings,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
  onClearData,
  rateLoading,
  rateStale,
  rate,
  isSupabaseConfigured,
  isOwner,
  currentUserId,
  team,
  onTeamChange,
}: {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (raw: string) => void;
  onClearData: () => void;
  rateLoading: boolean;
  rateStale: boolean;
  rate: number;
  isSupabaseConfigured: boolean;
  isOwner: boolean;
  currentUserId?: string;
  team?: TeamMember[];
  onTeamChange?: (team: TeamMember[]) => void;
}) {
  const [businessForm, setBusinessForm] = useState(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const businessDirty = businessForm.businessName !== settings.businessName || businessForm.currency !== settings.currency;

  const handleSaveBusiness = () => {
    if (!businessForm.businessName.trim()) return;
    onSaveSettings({ businessName: businessForm.businessName.trim(), currency: businessForm.currency });
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onImportBackup(reader.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const setRole = (member: TeamMember, role: UserRole) => {
    if (!team || !onTeamChange) return;
    onTeamChange(team.map((m) => (m.id === member.id ? { ...m, role } : m)));
  };
  const approveMember = (member: TeamMember) => {
    if (!team || !onTeamChange) return;
    onTeamChange(team.map((m) => (m.id === member.id ? { ...m, status: 'approved' } : m)));
  };
  const removeMember = (member: TeamMember) => {
    if (!team || !onTeamChange) return;
    onTeamChange(team.filter((m) => m.id !== member.id));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Sync Status */}
      <div className={`rounded-xl p-6 border ${isSupabaseConfigured ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {isSupabaseConfigured ? 'Synced across devices' : 'Working locally only'}
          </h3>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2">
          {isSupabaseConfigured
            ? 'This data lives in a shared workspace — anyone approved into it sees the same inventory, sales, and balances in real time, including from a phone.'
            : 'This data lives only in this browser. Other devices — including a phone used by staff — won\u2019t see it. Connect a shared backend in the deployment settings to enable cross-device sync.'}
        </p>
      </div>

      {!isOwner && (
        <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-6">
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            Business settings, backups, and team management are managed by the owner. Ask them if something here needs
            to change.
          </p>
        </div>
      )}

      {isOwner && (
        <>
          {/* Business & Currency */}
          <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Business</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-5">
              Prices are entered in Ugandan Shillings (UGX) — your base currency. Display currency converts amounts
              shown throughout the app using live exchange rates.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={businessForm.businessName}
                  onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Display Currency</label>
                <select
                  value={businessForm.currency}
                  onChange={(e) => setBusinessForm({ ...businessForm, currency: e.target.value })}
                  className={inputClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {settings.currency !== 'UGX' && (
              <div className="mt-4 text-sm">
                {rateLoading && <p className="text-neutral-400 dark:text-neutral-500">Fetching the current UGX → {settings.currency} rate…</p>}
                {!rateLoading && rateStale && (
                  <p className="text-amber-600 dark:text-amber-400">
                    Couldn't reach the exchange rate service — amounts are shown unconverted (in UGX) until it's back.
                  </p>
                )}
                {!rateLoading && !rateStale && (
                  <p className="text-neutral-400 dark:text-neutral-500">
                    Live rate: 1 UGX ≈ {rate.toFixed(6)} {settings.currency}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleSaveBusiness}
              disabled={!businessDirty || !businessForm.businessName.trim()}
              className="mt-5 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>

          {isSupabaseConfigured && team && onTeamChange && currentUserId && (
            <TeamPanel team={team} currentUserId={currentUserId} onApprove={approveMember} onSetRole={setRole} onRemove={removeMember} />
          )}

          {/* Data Backup */}
          <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Data Backup</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-5">
              {isSupabaseConfigured
                ? 'Your data syncs to a shared backend, but exporting a backup is still worth doing occasionally in case that connection is ever lost or misconfigured.'
                : 'Your data lives only in this browser. Export a backup regularly, or before switching devices.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onExportBackup}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-violet-700 transition-all"
              >
                Export Backup (JSON)
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white font-medium rounded-xl transition-all"
              >
                Import Backup
              </button>
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChosen} />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border border-red-200 dark:bg-red-500/5 dark:border-red-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-5">Permanently erase all inventory, sales, and notes.</p>
            <button
              onClick={onClearData}
              className="px-5 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30 font-medium rounded-xl transition-all"
            >
              Clear All Data
            </button>
          </div>
        </>
      )}
    </div>
  );
}
