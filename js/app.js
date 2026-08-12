/**
 * App-Gerüst: Zustand laden, Thema setzen, Tabs verwalten, Service Worker.
 */

import { h, icon, clear, toast } from './ui.js';
import * as S from './store.js';
import * as Today from './views/today.js';
import * as Tasks from './views/tasks.js';
import * as CalendarView from './views/calendar.js';
import * as Grades from './views/grades.js';
import * as More from './views/more.js';
import * as Onboarding from './views/onboarding.js';

const TABS = [
  { id: 'today', label: 'Heute', symbol: 'today', view: Today },
  { id: 'tasks', label: 'Aufgaben', symbol: 'tasks', view: Tasks },
  { id: 'calendar', label: 'Kalender', symbol: 'calendar', view: CalendarView },
  { id: 'grades', label: 'Noten', symbol: 'grades', view: Grades },
  { id: 'more', label: 'Mehr', symbol: 'more', view: More },
];

let active = 'today';
const screens = new Map();
const scrollMemory = new Map();

const ctx = {
  go(tabId) {
    if (!TABS.some((t) => t.id === tabId)) return;
    setActive(tabId);
  },
  rerender() {
    renderActive();
  },
  applyTheme,
  openOnboarding(opts) {
    Onboarding.open(ctx, opts);
  },
};

// ── Thema ────────────────────────────────────────────────────────────────────

function applyTheme() {
  const { theme, accent } = S.get().settings;
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.setAttribute('data-accent', accent || 'blue');

  const dark = theme === 'dark'
    || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#000000' : '#f2f2f7');
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function setActive(tabId) {
  if (active === tabId) {
    // Erneuter Tipp auf den aktiven Tab: nach oben scrollen.
    screens.get(tabId)?.querySelector('.scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const prev = screens.get(active);
  if (prev) scrollMemory.set(active, prev.querySelector('.scroll')?.scrollTop || 0);
  TABS.find((t) => t.id === active)?.view.teardown?.();

  active = tabId;
  location.hash = `#${tabId}`;
  renderActive();
  updateTabbar();
}

function updateTabbar() {
  for (const btn of document.querySelectorAll('.tab')) {
    btn.classList.toggle('on', btn.dataset.tab === active);
    btn.setAttribute('aria-current', btn.dataset.tab === active ? 'page' : 'false');
  }
}

function renderActive() {
  const tab = TABS.find((t) => t.id === active) || TABS[0];
  let screen = screens.get(tab.id);
  if (!screen) {
    screen = h('div', { class: 'screen', id: `screen-${tab.id}` });
    screens.set(tab.id, screen);
    document.getElementById('app').append(screen);
  }
  for (const [id, el] of screens) el.classList.toggle('on', id === tab.id);

  const keep = screen.querySelector('.scroll')?.scrollTop ?? scrollMemory.get(tab.id) ?? 0;
  tab.view.render(screen, ctx);
  const scroll = screen.querySelector('.scroll');
  if (scroll) scroll.scrollTop = keep;
}

function buildTabbar() {
  const bar = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Hauptnavigation' });
  for (const t of TABS) {
    bar.append(h('button', {
      class: `tab${t.id === active ? ' on' : ''}`,
      type: 'button',
      role: 'tab',
      dataset: { tab: t.id },
      onclick: () => setActive(t.id),
    }, icon(t.symbol, { weight: 1.9 }), h('span', {}, t.label)));
  }
  return bar;
}

// ── Start ────────────────────────────────────────────────────────────────────

function boot() {
  S.load();
  applyTheme();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (S.get().settings.theme === 'system') applyTheme();
  });

  const fromHash = location.hash.replace('#', '');
  if (TABS.some((t) => t.id === fromHash)) active = fromHash;

  document.getElementById('shell').append(buildTabbar());
  renderActive();
  updateTabbar();

  if (!S.get().onboarded) Onboarding.open(ctx);

  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (TABS.some((t) => t.id === id) && id !== active) setActive(id);
  });

  // Nach längerer Pause kann sich das Datum geändert haben — dann neu zeichnen.
  let hiddenSince = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenSince = Date.now();
      S.flush();
      return;
    }
    if (hiddenSince && Date.now() - hiddenSince > 60_000) renderActive();
    hiddenSince = null;
  });

  window.addEventListener('pagehide', () => S.flush());
  document.addEventListener('ap:storage-error', () => {
    toast('Speicher voll — bitte eine Sicherung erstellen', { warn: true, duration: 5000 });
  });
  document.addEventListener('ap:focus-finished', () => renderActive());

  registerServiceWorker();
  document.getElementById('splash')?.remove();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Ohne Service Worker läuft die App weiterhin, nur nicht offline.
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
