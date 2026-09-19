import { useEffect, useState } from 'react';
import type { Tab } from '@/types';

const VALID_TABS: Tab[] = ['dashboard', 'inventory', 'sales', 'debtors', 'expenses', 'notes', 'settings'];

function tabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '') as Tab;
  return VALID_TABS.includes(hash) ? hash : 'dashboard';
}

export function useHashTab(): [Tab, (tab: Tab) => void] {
  const [tab, setTabState] = useState<Tab>(tabFromHash());

  useEffect(() => {
    const onHashChange = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setTab = (next: Tab) => {
    setTabState(next);
    if (window.location.hash !== `#${next}`) {
      window.location.hash = next;
    }
  };

  return [tab, setTab];
}
