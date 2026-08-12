/**
 * Fokus-Timer (Pomodoro).
 *
 * Gerechnet wird immer über Zeitstempel, nicht über einen Zähler. Dadurch
 * läuft der Timer korrekt weiter, wenn iOS die Seite im Hintergrund einfriert
 * oder das Display ausgeht.
 */

import * as S from './store.js';

const MODES = {
  work: { id: 'work', label: 'Fokus', next: 'break' },
  short: { id: 'short', label: 'Kurze Pause', next: 'work' },
  long: { id: 'long', label: 'Lange Pause', next: 'work' },
};

let tickHandle = null;
const listeners = new Set();

export function onTick(fn) {
  listeners.add(fn);
  ensureTicker();
  return () => {
    listeners.delete(fn);
    if (!listeners.size) stopTicker();
  };
}

function ensureTicker() {
  if (tickHandle) return;
  tickHandle = setInterval(() => {
    const t = S.get().focus.timer;
    if (t && !t.pausedAt && remaining() <= 0) finish();
    for (const l of listeners) l();
  }, 500);
}

function stopTicker() {
  clearInterval(tickHandle);
  tickHandle = null;
}

export function config() {
  return S.get().focus.config;
}

export function timer() {
  return S.get().focus.timer;
}

export function modeLabel(mode) {
  return (MODES[mode] || MODES.work).label;
}

export function duration(mode) {
  const c = config();
  if (mode === 'short') return c.short * 60;
  if (mode === 'long') return c.long * 60;
  return c.work * 60;
}

/** Verbleibende Sekunden. */
export function remaining() {
  const t = timer();
  if (!t) return duration('work');
  const elapsed = t.pausedAt
    ? t.elapsedBeforePause
    : t.elapsedBeforePause + (Date.now() - t.resumedAt) / 1000;
  return Math.max(0, t.duration - elapsed);
}

export function progress() {
  const t = timer();
  const total = t ? t.duration : duration('work');
  return total > 0 ? 1 - remaining() / total : 0;
}

export function isRunning() {
  const t = timer();
  return !!t && !t.pausedAt;
}

export function start(mode = 'work', taskId = null) {
  S.update((s) => {
    s.focus.timer = {
      mode,
      duration: duration(mode),
      elapsedBeforePause: 0,
      resumedAt: Date.now(),
      pausedAt: null,
      startedAt: new Date().toISOString(),
      taskId,
      cycle: s.focus.timer?.cycle || 0,
    };
  });
  ensureTicker();
}

export function pause() {
  S.update((s) => {
    const t = s.focus.timer;
    if (!t || t.pausedAt) return;
    t.elapsedBeforePause += (Date.now() - t.resumedAt) / 1000;
    t.pausedAt = Date.now();
  });
}

export function resume() {
  S.update((s) => {
    const t = s.focus.timer;
    if (!t || !t.pausedAt) return;
    t.pausedAt = null;
    t.resumedAt = Date.now();
  });
  ensureTicker();
}

export function stop() {
  S.update((s) => { s.focus.timer = null; });
}

export function toggle() {
  if (!timer()) start('work');
  else if (isRunning()) pause();
  else resume();
}

/** Läuft die Einheit ab: protokollieren und die nächste vorschlagen. */
function finish() {
  const t = timer();
  if (!t) return;
  const wasWork = t.mode === 'work';

  S.update((s) => {
    if (wasWork) {
      s.focus.sessions.push({
        id: S.uid('f_'),
        date: S.today(),
        minutes: Math.round(t.duration / 60),
        taskId: t.taskId || null,
        at: new Date().toISOString(),
      });
      // Nur die letzten 400 Einheiten behalten — reicht für alle Statistiken.
      if (s.focus.sessions.length > 400) s.focus.sessions = s.focus.sessions.slice(-400);
    }
    const cycle = wasWork ? (t.cycle || 0) + 1 : (t.cycle || 0);
    const nextMode = wasWork
      ? (cycle % s.focus.config.cycle === 0 ? 'long' : 'short')
      : 'work';
    s.focus.timer = {
      mode: nextMode,
      duration: nextMode === 'short' ? s.focus.config.short * 60
        : nextMode === 'long' ? s.focus.config.long * 60
          : s.focus.config.work * 60,
      elapsedBeforePause: 0,
      resumedAt: Date.now(),
      pausedAt: Date.now(),
      startedAt: new Date().toISOString(),
      taskId: t.taskId,
      cycle,
    };
  });

  notify(wasWork ? 'Fokuszeit vorbei — Pause verdient.' : 'Pause vorbei — weiter geht’s.');
  document.dispatchEvent(new CustomEvent('ap:focus-finished', { detail: { wasWork } }));
}

function notify(message) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Anti Procrastinator', { body: message, silent: false });
      return;
    }
  } catch { /* Benachrichtigungen sind optional */ }
  try { navigator.vibrate?.([180, 90, 180]); } catch { /* nicht überall verfügbar */ }
}

export function requestNotifications() {
  if (!('Notification' in window)) return Promise.resolve('unsupported');
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Fokusminuten je Tag der letzten `days` Tage. */
export function history(days = 7) {
  const sessions = S.get().focus.sessions;
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = S.isoDate(d);
    out.push({
      date: iso,
      minutes: sessions.filter((s) => s.date === iso).reduce((sum, s) => sum + s.minutes, 0),
    });
  }
  return out;
}

export function todayMinutes() {
  const iso = S.today();
  return S.get().focus.sessions.filter((s) => s.date === iso).reduce((sum, s) => sum + s.minutes, 0);
}

export { MODES };
