/**
 * Kalender — Monatsraster mit Tagesliste. Zeigt Prüfungstermine (abgeleitet
 * aus den Noten), Aufgaben mit Fälligkeit und eigene Termine.
 */

import {
  h, icon, group, row, footnote, button, sheet, confirmDialog, actionSheet, toast,
  field, textInput, select, formatDate, WEEKDAYS_SHORT, MONTHS,
} from '../ui.js';
import { page, navButton, fill } from '../page.js';
import * as S from '../store.js';
import * as ICS from '../ics.js';
import { compose as composeTask } from './tasks.js';

let cursor = new Date();
let selected = null;

export function goToToday() {
  cursor = new Date();
  selected = S.today();
}

export function render(screen, ctx) {
  const st = S.get();
  if (!selected) selected = S.today();

  const p = page({
    title: 'Kalender',
    right: navButton('', () => addMenu(ctx), { icon: 'plus', label: 'Eintrag hinzufügen', weight: 2.2 }),
    left: navButton('', () => calendarMenu(ctx), { icon: 'share', label: 'Import und Export' }),
  });
  fill(screen, p.root);

  const marks = buildMarks(st);

  const nav = h('div', { class: 'cal-nav' },
    h('div', { class: 'cal-month' }, `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`),
    h('button', { class: 'cal-nav-btn', type: 'button', 'aria-label': 'Voriger Monat', onclick: () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); ctx.rerender(); } }, icon('chevronLeft', { weight: 2.2 })),
    h('button', { class: 'cal-nav-btn', type: 'button', 'aria-label': 'Heute', onclick: () => { goToToday(); ctx.rerender(); } }, icon('target', { weight: 1.9 })),
    h('button', { class: 'cal-nav-btn', type: 'button', 'aria-label': 'Nächster Monat', onclick: () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); ctx.rerender(); } }, icon('chevron', { weight: 2.2 })));

  const grid = buildGrid(st, marks, ctx);
  const day = buildDayList(st, selected, ctx);

  fill(p.content, nav, grid, day);
}

function buildMarks(st) {
  const map = {};
  const push = (date, kind) => {
    if (!date) return;
    (map[date] ||= new Set()).add(kind);
  };
  for (const t of st.tasks) if (!t.done) push(t.due, 'task');
  for (const e of st.events) push(e.date, 'event');
  for (const e of S.examEntries()) if (!e.done) push(e.date, 'exam');
  return map;
}

function buildGrid(st, marks, ctx) {
  const mondayFirst = st.settings.weekStartsMonday;
  const head = h('div', { class: 'cal-head' });
  const order = mondayFirst ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  for (const d of order) head.append(h('div', {}, WEEKDAYS_SHORT[d]));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - (mondayFirst ? 1 : 0) + 7) % 7;
  const start = new Date(year, month, 1 - offset);

  const grid = h('div', { class: 'cal-grid' });
  const today = S.today();

  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = S.isoDate(d);
    const inMonth = d.getMonth() === month;
    const kinds = marks[iso] ? Array.from(marks[iso]) : [];

    const cell = h('button', {
      class: [
        'cal-cell',
        !inMonth && 'muted',
        iso === today && 'today',
        iso === selected && 'sel',
      ].filter(Boolean).join(' '),
      type: 'button',
      onclick: () => {
        selected = iso;
        if (!inMonth) cursor = new Date(d.getFullYear(), d.getMonth(), 1);
        ctx.rerender();
      },
    },
      h('span', {}, d.getDate()),
      h('span', { class: 'cal-marks' },
        ...['exam', 'task', 'event'].filter((k) => kinds.includes(k))
          .map((k) => h('span', { class: `cal-mark cal-mark-${k}` }))));

    grid.append(cell);
    if (i >= 34 && d.getMonth() !== month && d > new Date(year, month + 1, 0)) break;
  }

  return h('div', {}, head, grid);
}

function buildDayList(st, iso, ctx) {
  const exams = S.examEntries().filter((e) => e.date === iso);
  const events = st.events.filter((e) => e.date === iso);
  const tasks = st.tasks.filter((t) => t.due === iso);

  const rows = [];

  for (const e of exams) {
    rows.push(row({
      title: e.title,
      subtitle: [e.subtitle, e.time, e.room].filter(Boolean).join(' · ') || 'Prüfung',
      leading: h('span', { class: 'dot dot-fail' }),
      chevron: true,
      onclick: () => { ctx.go('grades'); },
    }));
  }

  for (const e of events) {
    rows.push(row({
      title: e.title,
      subtitle: [e.allDay ? 'Ganztägig' : e.time, e.location, e.note].filter(Boolean).join(' · '),
      leading: h('span', { class: 'dot', style: { background: `var(--${e.color || 'green'})` } }),
      chevron: true,
      onclick: () => editEvent(e, ctx),
    }));
  }

  for (const t of tasks) {
    rows.push(row({
      title: t.title,
      subtitle: [t.done ? 'Erledigt' : 'Aufgabe', t.time].filter(Boolean).join(' · '),
      leading: h('span', { class: 'dot dot-active', style: t.done ? { background: 'var(--label-3)' } : null }),
      chevron: true,
      onclick: () => composeTask(t, ctx),
    }));
  }

  const label = formatDate(iso, 'long');

  if (!rows.length) {
    return h('div', {},
      group(label),
      h('div', { class: 'card', style: { marginTop: '-22px' } },
        h('div', { style: { fontSize: '15px', color: 'var(--label-2)', textAlign: 'center', padding: '6px 0 12px' } }, 'Nichts geplant.'),
        button('Termin hinzufügen', { variant: 'tinted', class: 'btn-block', onclick: () => newEvent(iso, ctx) })));
  }

  return h('div', {},
    group(label, ...rows,
      row({
        title: 'Termin hinzufügen',
        leading: h('div', { class: 'tile tile-tint' }, icon('plus', { weight: 2.4 })),
        tint: true,
        onclick: () => newEvent(iso, ctx),
      })),
    footnote('Rot: Prüfungen · Blau: Aufgaben · Grün: eigene Termine'));
}

// ── Termine ──────────────────────────────────────────────────────────────────

async function addMenu(ctx) {
  const pick = await actionSheet({
    title: 'Neu',
    actions: [
      { id: 'event', label: 'Termin' },
      { id: 'task', label: 'Aufgabe' },
    ],
  });
  if (pick === 'event') newEvent(selected, ctx);
  if (pick === 'task') composeTask(null, ctx, { due: selected });
}

function newEvent(iso, ctx) {
  return editEvent(null, ctx, iso);
}

function editEvent(existing, ctx, defaultDate) {
  const isNew = !existing;
  const draft = existing
    ? { ...existing }
    : { title: '', date: defaultDate || S.today(), time: null, endTime: null, allDay: false, location: '', note: '', color: 'green' };

  return sheet({
    title: isNew ? 'Neuer Termin' : 'Termin',
    rightLabel: isNew ? 'Hinzufügen' : 'Sichern',
    size: 'full',
    onRight: (close) => {
      if (!draft.title.trim()) { toast('Titel fehlt', { warn: true }); return; }
      S.update((s) => {
        if (isNew) {
          s.events.push({
            id: S.uid('e_'),
            title: draft.title.trim(),
            date: draft.date,
            time: draft.allDay ? null : (draft.time || null),
            endTime: draft.allDay ? null : (draft.endTime || null),
            allDay: !!draft.allDay,
            location: draft.location.trim(),
            note: draft.note.trim(),
            color: draft.color,
            source: 'manual',
          });
        } else {
          Object.assign(existing, {
            title: draft.title.trim(),
            date: draft.date,
            time: draft.allDay ? null : (draft.time || null),
            endTime: draft.allDay ? null : (draft.endTime || null),
            allDay: !!draft.allDay,
            location: draft.location.trim(),
            note: draft.note.trim(),
            color: draft.color,
          });
        }
      });
      selected = draft.date;
      ctx.rerender();
      close();
    },
    render: (body, close) => {
      const timeFields = h('div', {});
      const drawTimes = () => {
        fill(timeFields,
          draft.allDay ? null : field({ label: 'Beginn', input: textInput({ type: 'time', value: draft.time || '', onchange: (e) => { draft.time = e.target.value || null; } }) }),
          draft.allDay ? null : field({ label: 'Ende', input: textInput({ type: 'time', value: draft.endTime || '', onchange: (e) => { draft.endTime = e.target.value || null; } }) }));
      };
      drawTimes();

      fill(body,
        group('',
          field({ label: 'Titel', input: textInput({ value: draft.title, placeholder: 'z. B. Vorlesung Mathematik', oninput: (e) => { draft.title = e.target.value; } }) }),
          field({ label: 'Datum', input: textInput({ type: 'date', value: draft.date, onchange: (e) => { draft.date = e.target.value || S.today(); } }) }),
          row({
            title: 'Ganztägig',
            trailing: (() => {
              const input = h('input', {
                type: 'checkbox', checked: draft.allDay,
                onchange: (e) => { draft.allDay = e.target.checked; drawTimes(); },
              });
              return h('label', { class: 'switch' }, input, h('span', { class: 'switch-track' }, h('span', { class: 'switch-knob' })));
            })(),
          }),
          timeFields),

        group('Details',
          field({ label: 'Ort', input: textInput({ value: draft.location, placeholder: 'Raum, Adresse …', oninput: (e) => { draft.location = e.target.value; } }) }),
          h('label', { class: 'field' },
            h('span', { class: 'field-label' }, 'Notiz'),
            h('textarea', { class: 'input', oninput: (e) => { draft.note = e.target.value; } }, draft.note)),
          field({
            label: 'Farbe',
            input: select(
              ['green', 'blue', 'orange', 'purple', 'red', 'teal', 'indigo', 'pink'].map((c) => ({ value: c, label: c })),
              draft.color, (v) => { draft.color = v; },
            ),
          })),

        !isNew
          ? group('', row({
            title: 'Termin löschen',
            danger: true,
            leading: h('div', { class: 'tile tile-red' }, icon('trash')),
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Termin löschen?' });
              if (!ok) return;
              S.update((s) => { s.events = s.events.filter((e) => e.id !== existing.id); });
              ctx.rerender();
              close();
            },
          }))
          : null);
    },
  });
}

// ── Import & Export ──────────────────────────────────────────────────────────

async function calendarMenu(ctx) {
  const pick = await actionSheet({
    title: 'Kalender',
    actions: [
      { id: 'import', label: '.ics-Datei importieren' },
      { id: 'exportExams', label: 'Prüfungstermine exportieren' },
      { id: 'exportAll', label: 'Alles exportieren' },
      { id: 'clean', label: 'Importierte Termine entfernen', destructive: true },
    ],
  });
  if (pick === 'import') importICS(ctx);
  if (pick === 'exportExams') exportEntries('pruefungen', S.examEntries().map(examToEntry));
  if (pick === 'exportAll') exportEntries('kalender', allEntries());
  if (pick === 'clean') {
    const count = S.get().events.filter((e) => e.source === 'ics').length;
    if (!count) { toast('Keine importierten Termine'); return; }
    const ok = await confirmDialog({ title: 'Importierte Termine entfernen?', text: `${count} Einträge aus .ics-Dateien werden gelöscht. Eigene Termine bleiben.` });
    if (!ok) return;
    S.update((s) => { s.events = s.events.filter((e) => e.source !== 'ics'); });
    ctx.rerender();
    toast('Entfernt');
  }
}

async function importICS(ctx) {
  const file = await ICS.pickFile('.ics,text/calendar');
  if (!file) return;
  let events;
  try {
    events = ICS.parseICS(file.text);
  } catch (err) {
    toast('Datei konnte nicht gelesen werden', { warn: true });
    return;
  }
  if (!events.length) { toast('Keine Termine gefunden', { warn: true }); return; }

  S.update((s) => {
    const known = new Set(s.events.map((e) => `${e.date}|${e.title}|${e.time || ''}`));
    for (const e of events) {
      const key = `${e.date}|${e.title}|${e.time || ''}`;
      if (known.has(key)) continue;
      known.add(key);
      s.events.push({
        id: S.uid('e_'),
        title: e.title,
        date: e.date,
        time: e.time || null,
        endTime: e.endTime || null,
        allDay: !!e.allDay,
        location: e.location || '',
        note: (e.note || '').slice(0, 500),
        color: 'teal',
        source: 'ics',
      });
    }
  });
  ctx.rerender();
  toast(`${events.length} Termine geprüft, importiert`);
}

function examToEntry(e) {
  return {
    id: e.id,
    title: `Prüfung: ${e.title}`,
    date: e.date,
    time: e.time,
    location: e.room,
    note: e.subtitle,
    durationMinutes: 90,
    alarmMinutes: 60 * 24,
  };
}

function allEntries() {
  const st = S.get();
  return [
    ...S.examEntries().map(examToEntry),
    ...st.events.map((e) => ({
      id: e.id, title: e.title, date: e.date, time: e.allDay ? null : e.time,
      location: e.location, note: e.note, durationMinutes: 60,
    })),
    ...st.tasks.filter((t) => t.due && !t.done).map((t) => ({
      id: t.id, title: t.title, date: t.due, time: t.time,
      note: t.note, durationMinutes: 30,
    })),
  ];
}

function exportEntries(name, entries) {
  if (!entries.length) { toast('Nichts zu exportieren', { warn: true }); return; }
  ICS.download(`anti-procrastinator-${name}.ics`, ICS.buildICS(entries));
  toast(`${entries.length} Termine exportiert`);
}
