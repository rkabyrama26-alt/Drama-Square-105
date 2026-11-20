import React from 'react';
import {
  BellRing,
  Bookmark,
  Compass,
  Globe,
  History,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react';
import type { AppLocale } from '../shared/types.ts';
import { getCopy } from '../utils/i18n.ts';

export type ActiveView =
  | 'discover'
  | 'subscriptions'
  | 'search'
  | 'watch'
  | 'channel'
  | 'saved'
  | 'history';

interface SidebarProps {
  locale: AppLocale;
  theme: 'light' | 'dark';
  activeView: ActiveView;
  subscriptionsCount: number;
  savedCount: number;
  historyCount: number;
  recentSearches: string[];
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSelectView: (view: ActiveView) => void;
  onQuickSearch: (query: string) => void;
  onToggleLocale: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  locale,
  theme,
  activeView,
  subscriptionsCount,
  savedCount,
  historyCount,
  recentSearches,
  isOpenMobile,
  onCloseMobile,
  onSelectView,
  onQuickSearch,
  onToggleLocale,
  onToggleTheme,
}: SidebarProps) {
  const t = getCopy(locale);

  const navItems: Array<{
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'discover', label: t.navDiscover, icon: Compass },
    { id: 'subscriptions', label: t.navSubscriptions, icon: BellRing, count: subscriptionsCount },
    { id: 'search', label: t.navSearch, icon: Search },
    { id: 'saved', label: t.navSaved, icon: Bookmark, count: savedCount },
    { id: 'history', label: t.navHistory, icon: History, count: historyCount },
  ];

  const navContent = (
    <div className="flex h-full flex-col justify-between gap-6 p-4">
      <div className="space-y-6">
        <nav aria-label="Main navigation" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-red-600 ${
                  active
                    ? 'bg-red-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`tabular-nums text-xs ${
                      active ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {recentSearches.length > 0 && (
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h2 className="mb-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {locale === 'ar' ? 'عمليات بحث سابقة' : 'Recent Searches'}
            </h2>
            <div className="space-y-1">
              {recentSearches.slice(0, 5).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    onQuickSearch(q);
                    onCloseMobile();
                  }}
                  className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-start text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Language & Theme / Color controls inside the 3-lines menu */}
      <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t.appearanceLabel}
        </p>

        <button
          type="button"
          onClick={onToggleLocale}
          aria-label={t.toggleLang}
          className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className="flex items-center gap-2.5">
            <Globe className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>{t.languageLabel}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={t.toggleTheme}
          className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className="flex items-center gap-2.5">
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 shrink-0 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 shrink-0 text-slate-500" />
            )}
            <span>{theme === 'dark' ? t.lightModeLabel : t.darkModeLabel}</span>
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-e border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-950">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">{navContent}</div>
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label={t.closeSidebar}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
          />
          <aside className="relative z-10 flex h-full w-72 max-w-[82vw] flex-col bg-white pt-[env(safe-area-inset-top)] shadow-xl dark:bg-slate-950">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              <div className="flex items-center">
                <img
                  src="https://i.ibb.co/dJV9QBJ8/Picsart-26-05-17-15-01-36-647.webp"
                  alt={t.brand}
                  className="h-8 w-auto max-w-[130px] object-contain [filter:drop-shadow(0_0_5px_rgba(0,0,0,0.95))_drop-shadow(0_2px_8px_rgba(0,0,0,0.75))] dark:[filter:drop-shadow(0_0_8px_rgba(255,255,255,0.65))]"
                />
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label={t.closeSidebar}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navContent}</div>
          </aside>
        </div>
      )}
    </>
  );
}
