/**
 * Heute — der Einstieg. Zeigt in dieser Reihenfolge, was gerade zählt:
 * anstehende Prüfungen, fällige Aufgaben, Fokus, Termine, Wetter, Impuls.
 */

import {
  h, icon, group, row, button, formatDate, relativeDate, pluralDays, toast,
} from '../ui.js';
import { page, navButton, fill } from '../page.js';
import * as S from '../store.js';
import * as G from '../grades.js';
import * as F from '../focus.js';
import * as W from '../weather.js';
import { quoteOfTheDay } from '../data/quotes.js';
import { WEIGHT_PROFILES } from '../data/school.js';
import { gradePill } from './grades.js';
import { compose as composeTask } from './tasks.js';

let unsubTick = null;
let weatherState = { loading: false, data: null, error: null };

export function render(screen, ctx) {
  const st = S.get();
  const now = new Date();

  const p = page({
    title: greeting(st.settings.name),
    subtitle: formatDate(S.today(), 'long'),
    right: navButton('', () => ctx.go('more'), { icon: 'gear', label: 'Einstellungen' }),
  });
  fill(screen, p.root);

  const blocks = [];

  const exams = upcomingExams(6);
  if (exams.length) blocks.push(examBlock(exams, ctx));

  blocks.push(taskBlock(st, ctx));
  blocks.push(focusBlock(ctx));

  const events = todaysEvents(st);
  if (events.length) blocks.push(eventBlock(events, ctx));

  blocks.push(studyBlock(st, ctx));

  if (st.settings.weather.enabled) blocks.push(weatherBlock(st, ctx));
  if (st.settings.showQuote) blocks.push(quoteBlock());

  fill(p.content, ...blocks);

  // Der Fokusblock aktualisiert sich sekündlich, ohne die Seite neu zu bauen.
  unsubTick?.();
  unsubTick = null;
  const timeEl = screen.querySelector('[data-focus-time]');
  if (timeEl && F.timer()) {
    unsubTick = F.onTick(() => {
      if (!timeEl.isConnected) { unsubTick?.(); unsubTick = null; return; }
      timeEl.textContent = F.formatClock(F.remaining());
    });
  }
}

export function teardown() {
  unsubTick?.();
  unsubTick = null;
}

function greeting(name) {
  const hour = new Date().getHours();
  const base = hour < 5 ? 'Gute Nacht' : hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
  return name ? `${base}, ${name}` : base;
}

// ── Prüfungen ────────────────────────────────────────────────────────────────

function upcomingExams(limit) {
  const today = S.today();
  return S.examEntries()
    .filter((e) => !e.done && e.date >= today)
    .slice(0, limit);
}

function examBlock(exams, ctx) {
  const next = exams[0];
  const days = S.daysUntil(next.date);

  const hero = h('div', { class: 'card card-tap', onclick: () => ctx.go('grades') },
    h('div', { class: 'card-head' },
      h('h3', {}, 'Nächste Prüfung'),
      h('span', { class: 'card-more' }, `${exams.length} anstehend`)),
    h('div', { class: 'inline', style: { gap: '16px' } },
      h('div', {},
        h('div', { class: 'countdown', style: { color: days <= 3 ? 'var(--red)' : 'var(--label)' } },
          days === 0 ? 'Heute' : days === 1 ? 'Morgen' : pluralDays(days)),
        h('div', { style: { fontSize: '13px', color: 'var(--label-2)', marginTop: '4px' } },
          formatDate(next.date, 'weekday') + (next.time ? `, ${next.time}` : ''))),
      h('div', { class: 'spacer' }),
      h('div', { style: { textAlign: 'right', minWidth: '0', flex: '1' } },
        h('div', { style: { fontSize: '17px', fontWeight: '600', letterSpacing: '-0.02em' } }, next.title),
        h('div', { style: { fontSize: '13px', color: 'var(--label-2)', marginTop: '2px' } },
          [next.subtitle, next.room].filter(Boolean).join(' · ')))));

  const rest = exams.slice(1, 4);
  return h('div', {}, hero,
    rest.length
      ? group('Danach', ...rest.map((e) => row({
        title: e.title,
        subtitle: [e.subtitle, e.room].filter(Boolean).join(' · '),
        detail: relativeDate(e.date),
        onclick: () => ctx.go('grades'),
        chevron: true,
      })))
      : null);
}

// ── Aufgaben ─────────────────────────────────────────────────────────────────

function taskBlock(st, ctx) {
  const today = S.today();
  const due = st.tasks.filter((t) => !t.done && t.due && t.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due));
  const openTotal = st.tasks.filter((t) => !t.done).length;

  if (!due.length) {
    return group('Aufgaben',
      row({
        title: openTotal ? 'Heute ist nichts fällig' : 'Keine offenen Aufgaben',
        subtitle: openTotal ? `${openTotal} offen insgesamt` : 'Alles abgehakt.',
        leading: h('div', { class: 'tile tile-green' }, icon('check', { weight: 2.4 })),
        chevron: true,
        onclick: () => ctx.go('tasks'),
      }),
      row({
        title: 'Aufgabe hinzufügen',
        leading: h('div', { class: 'tile tile-tint' }, icon('plus', { weight: 2.4 })),
        tint: true,
        onclick: () => composeTask(null, ctx, { due: today }),
      }));
  }

  return group(`Heute fällig · ${due.length}`,
    ...due.slice(0, 5).map((t) => {
      const overdue = t.due < today;
      const tick = h('button', {
        class: 'tick',
        type: 'button',
        'aria-label': 'Als erledigt markieren',
        onclick: (e) => {
          e.stopPropagation();
          S.update(() => { t.done = true; t.doneAt = new Date().toISOString(); });
          ctx.rerender();
          toast('Erledigt');
        },
      }, icon('check', { weight: 2.6 }));
      return row({
        title: t.title,
        subtitle: overdue ? `Überfällig seit ${relativeDate(t.due)}` : (t.time || 'Heute'),
        leading: tick,
        onclick: () => composeTask(t, ctx),
      });
    }),
    due.length > 5
      ? row({ title: `Alle ${due.length} anzeigen`, tint: true, chevron: true, onclick: () => ctx.go('tasks') })
      : null);
}

// ── Fokus ────────────────────────────────────────────────────────────────────

function focusBlock(ctx) {
  const t = F.timer();
  const minutes = F.todayMinutes();

  if (!t) {
    return h('div', { class: 'card mt' },
      h('div', { class: 'card-head' },
        h('h3', {}, 'Fokus'),
        minutes ? h('span', { class: 'card-more' }, `${minutes} min heute`) : null),
      h('div', { style: { fontSize: '15px', color: 'var(--label-2)', marginBottom: '14px' } },
        `${F.config().work} Minuten am Stück. Danach Pause.`),
      button('Fokuszeit starten', {
        variant: 'filled', class: 'btn-block', icon: 'play',
        onclick: () => { F.start('work'); ctx.rerender(); },
      }));
  }

  const running = F.isRunning();
  return h('div', { class: 'card mt' },
    h('div', { class: 'card-head' },
      h('h3', {}, F.modeLabel(t.mode)),
      h('span', { class: 'card-more' }, `${minutes} min heute`)),
    h('div', { class: 'inline', style: { gap: '16px' } },
      h('div', {
        'data-focus-time': '',
        style: { fontSize: '42px', fontWeight: '300', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: '1' },
      }, F.formatClock(F.remaining())),
      h('div', { class: 'spacer' }),
      h('button', {
        class: 'focus-btn focus-btn-main', type: 'button', 'aria-label': running ? 'Pause' : 'Weiter',
        style: { width: '54px', height: '54px' },
        onclick: () => { running ? F.pause() : F.resume(); ctx.rerender(); },
      }, icon(running ? 'pause' : 'play', { weight: 2.2, fill: !running })),
      h('button', {
        class: 'focus-btn', type: 'button', 'aria-label': 'Beenden',
        style: { width: '48px', height: '48px' },
        onclick: () => { F.stop(); ctx.rerender(); },
      }, icon('stop', { weight: 2 }))));
}

// ── Termine ──────────────────────────────────────────────────────────────────

function todaysEvents(st) {
  const today = S.today();
  return st.events.filter((e) => e.date === today)
    .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
}

function eventBlock(events, ctx) {
  return group('Termine heute', ...events.map((e) => row({
    title: e.title,
    subtitle: [e.allDay ? 'Ganztägig' : e.time, e.location].filter(Boolean).join(' · '),
    leading: h('span', { class: 'dot', style: { background: `var(--${e.color || 'green'})` } }),
    chevron: true,
    onclick: () => ctx.go('calendar'),
  })));
}

// ── Studium ──────────────────────────────────────────────────────────────────

function studyBlock(st, ctx) {
  const study = S.activeStudy();
  if (!study) {
    return group('Noten', row({
      title: 'Notentracker einrichten',
      subtitle: 'Studiengang oder Klasse wählen — bei Provadis ist alles vorausgefüllt',
      leading: h('div', { class: 'tile tile-blue' }, icon('grades')),
      chevron: true,
      onclick: () => ctx.openOnboarding(),
    }));
  }

  if (study.kind === 'uni') {
    const stats = G.uniStats(study.data, { roundMode: st.settings.roundMode });
    return group('Studium', row({
      title: study.data.name,
      subtitle: `${stats.ectsDone} von ${stats.ectsTotal} ECTS · ${Math.round(stats.progress * 100)} %`,
      leading: h('div', { class: 'tile tile-blue' }, icon('grades')),
      trailing: gradePill(stats.averageRounded ?? stats.average, study.scale),
      chevron: true,
      onclick: () => ctx.go('grades'),
    }));
  }

  const term = study.data.terms[study.data.activeTermIndex] || study.data.terms[0];
  const stats = G.termStats(term, WEIGHT_PROFILES, study.scale);
  return group('Schule', row({
    title: `Klasse ${study.data.klasse} · ${term.label}`,
    subtitle: `${stats.graded} von ${stats.total} Fächern benotet`,
    leading: h('div', { class: 'tile tile-blue' }, icon('grades')),
    trailing: gradePill(stats.average, study.scale),
    chevron: true,
    onclick: () => ctx.go('grades'),
  }));
}

// ── Wetter ───────────────────────────────────────────────────────────────────

function weatherBlock(st, ctx) {
  const cfg = st.settings.weather;
  const card = h('div', { class: 'card mt' });

  const paint = (data, note) => {
    const [label, sym] = W.describe(data.now.code);
    fill(card,
      h('div', { class: 'card-head' },
        h('h3', {}, cfg.place || 'Wetter'),
        h('span', { class: 'card-more' }, note || label)),
      h('div', { class: 'inline' },
        h('div', { class: 'weather-temp' }, `${data.now.temp}°`),
        h('div', { style: { marginLeft: '12px', fontSize: '13px', color: 'var(--label-2)' } },
          h('div', {}, label),
          h('div', {}, `gefühlt ${data.now.feels}°`)),
        h('div', { class: 'spacer' }),
        icon(sym, { size: 36, weight: 1.5 })),
      h('div', { class: 'weather-days' },
        ...data.days.slice(0, 6).map((d, i) => h('div', { class: 'weather-day' },
          h('div', {}, i === 0 ? 'Heute' : formatDate(d.date, 'weekday').split(',')[0]),
          h('b', {}, `${d.max}°`),
          h('div', { style: { fontSize: '11px' } }, `${d.min}°`)))));
  };

  const failed = (msg) => fill(card,
    h('div', { class: 'card-head' }, h('h3', {}, 'Wetter')),
    h('div', { style: { fontSize: '15px', color: 'var(--label-2)' } }, msg),
    button('Erneut versuchen', { variant: 'tinted', class: 'btn-block mt', onclick: () => { weatherState.data = null; ctx.rerender(); } }));

  const cached = W.cachedWeather();
  if (cached) paint(cached, 'zuletzt geladen');
  else fill(card, h('div', { style: { fontSize: '15px', color: 'var(--label-2)', padding: '4px 0' } }, 'Wetter wird geladen …'));

  if (cfg.lat != null && cfg.lon != null) {
    W.fetchWeather(cfg.lat, cfg.lon)
      .then((data) => { if (card.isConnected) paint(data); })
      .catch(() => { if (card.isConnected && !cached) failed('Wetterdienst gerade nicht erreichbar.'); });
  } else {
    fill(card,
      h('div', { class: 'card-head' }, h('h3', {}, 'Wetter')),
      h('div', { style: { fontSize: '15px', color: 'var(--label-2)' } }, 'Noch kein Ort gewählt.'),
      button('Ort festlegen', { variant: 'tinted', class: 'btn-block mt', onclick: () => ctx.go('more') }));
  }

  return card;
}

// ── Impuls ───────────────────────────────────────────────────────────────────

function quoteBlock() {
  const q = quoteOfTheDay();
  return h('div', { class: 'card mt' },
    h('div', { class: 'inline', style: { alignItems: 'flex-start', gap: '12px' } },
      h('div', { class: 'tile tile-orange', style: { marginTop: '2px' } }, icon('bulb')),
      h('div', {},
        h('div', { class: 'quote-text' }, q.text),
        h('div', { class: 'quote-author' }, q.author))));
}
