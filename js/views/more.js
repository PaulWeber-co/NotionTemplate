/**
 * Mehr — Fokus im Vollbild, Statistik, Einstellungen, Sicherung.
 */

import {
  h, icon, group, row, footnote, button, sheet, confirmDialog, actionSheet, toast,
  field, textInput, select, progressRing, formatDate, WEEKDAYS_SHORT,
} from '../ui.js';
import { page, navButton, fill } from '../page.js';
import * as S from '../store.js';
import * as G from '../grades.js';
import * as F from '../focus.js';
import * as W from '../weather.js';
import * as ICS from '../ics.js';
import { WEIGHT_PROFILES } from '../data/school.js';

const ACCENTS = [
  ['blue', 'Blau'], ['indigo', 'Indigo'], ['purple', 'Violett'], ['pink', 'Pink'],
  ['red', 'Rot'], ['orange', 'Orange'], ['green', 'Grün'], ['teal', 'Türkis'],
];

export function render(screen, ctx) {
  const st = S.get();
  const p = page({ title: 'Mehr' });
  fill(screen, p.root);

  const study = S.activeStudy();

  fill(p.content,
    group('',
      row({
        title: 'Fokus',
        subtitle: `${F.todayMinutes()} Minuten heute`,
        leading: h('div', { class: 'tile tile-red' }, icon('flame')),
        chevron: true,
        onclick: () => openFocus(ctx),
      }),
      row({
        title: 'Statistik',
        subtitle: 'Aufgaben, Fokuszeit, Notenverlauf',
        leading: h('div', { class: 'tile tile-purple' }, icon('chart')),
        chevron: true,
        onclick: () => openStats(ctx),
      })),

    group('Darstellung',
      row({
        title: 'Erscheinungsbild',
        detail: { system: 'Automatisch', light: 'Hell', dark: 'Dunkel' }[st.settings.theme],
        leading: h('div', { class: 'tile tile-gray' }, icon('sun')),
        chevron: true,
        onclick: async () => {
          const pick = await actionSheet({
            title: 'Erscheinungsbild',
            actions: [
              { id: 'system', label: 'Automatisch (Systemeinstellung)' },
              { id: 'light', label: 'Hell' },
              { id: 'dark', label: 'Dunkel' },
            ],
          });
          if (!pick) return;
          S.update((s) => { s.settings.theme = pick; });
          ctx.applyTheme();
          ctx.rerender();
        },
      }),
      h('div', { class: 'row' },
        h('div', { class: 'row-leading' }, h('div', { class: 'tile tile-tint' }, icon('target'))),
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Akzentfarbe')),
        h('div', { style: { display: 'flex', gap: '9px' } },
          ...ACCENTS.map(([c, name]) => h('button', {
            type: 'button',
            'aria-label': name,
            style: {
              width: '24px', height: '24px', borderRadius: '50%', flex: 'none',
              background: `var(--${c})`,
              boxShadow: st.settings.accent === c ? '0 0 0 2px var(--bg-raised), 0 0 0 4px var(--label-3)' : 'none',
            },
            onclick: () => {
              S.update((s) => { s.settings.accent = c; });
              ctx.applyTheme();
              ctx.rerender();
            },
          }))))),

    group('Inhalte',
      row({
        title: 'Wetter auf „Heute“',
        subtitle: st.settings.weather.enabled ? (st.settings.weather.place || 'Kein Ort gewählt') : 'Aus',
        leading: h('div', { class: 'tile tile-teal' }, icon('cloud')),
        chevron: true,
        onclick: () => openWeather(ctx),
      }),
      row({
        title: 'Täglicher Impuls',
        leading: h('div', { class: 'tile tile-orange' }, icon('bulb')),
        trailing: switchEl(st.settings.showQuote, (on) => {
          S.update((s) => { s.settings.showQuote = on; });
          ctx.rerender();
        }),
      }),
      row({
        title: 'Name',
        subtitle: st.settings.name || 'Für die Begrüßung auf „Heute“',
        leading: h('div', { class: 'tile tile-gray' }, icon('edit')),
        chevron: true,
        onclick: () => editName(ctx),
      })),

    group('Noten',
      row({
        title: 'Bildungsgang',
        subtitle: study
          ? (study.kind === 'uni'
            ? `${study.data.name} · ${study.data.degree || ''}`.trim()
            : `Klasse ${study.data.klasse}`)
          : 'Noch nicht eingerichtet',
        leading: h('div', { class: 'tile tile-blue' }, icon('grades')),
        chevron: true,
        onclick: () => ctx.openOnboarding({ studyOnly: true }),
      }),
      row({
        title: 'Endnote runden',
        detail: { truncate1: 'Abschneiden', round1: 'Kaufmännisch', exact: 'Zwei Stellen' }[st.settings.roundMode],
        leading: h('div', { class: 'tile tile-indigo' }, icon('target')),
        chevron: true,
        onclick: async () => {
          const pick = await actionSheet({
            title: 'Endnote runden',
            message: 'Hochschulen schneiden die Endnote meist nach der ersten Nachkommastelle ab.',
            actions: [
              { id: 'truncate1', label: 'Abschneiden (2,49 → 2,4)' },
              { id: 'round1', label: 'Kaufmännisch (2,49 → 2,5)' },
              { id: 'exact', label: 'Zwei Nachkommastellen' },
            ],
          });
          if (!pick) return;
          S.update((s) => { s.settings.roundMode = pick; });
          ctx.rerender();
        },
      })),

    group('Kalender',
      row({
        title: 'Woche beginnt montags',
        leading: h('div', { class: 'tile tile-green' }, icon('calendar')),
        trailing: switchEl(st.settings.weekStartsMonday, (on) => {
          S.update((s) => { s.settings.weekStartsMonday = on; });
          ctx.rerender();
        }),
      }),
      row({
        title: 'Prüfungstermine exportieren',
        subtitle: 'Als .ics für Apple Kalender, Google & Co.',
        leading: h('div', { class: 'tile tile-orange' }, icon('share')),
        chevron: true,
        onclick: () => {
          const exams = S.examEntries();
          if (!exams.length) { toast('Keine Prüfungstermine hinterlegt', { warn: true }); return; }
          ICS.download('anti-procrastinator-pruefungen.ics', ICS.buildICS(exams.map((e) => ({
            id: e.id,
            title: `Prüfung: ${e.title}`,
            date: e.date,
            time: e.time,
            location: e.room,
            note: e.subtitle,
            durationMinutes: 90,
            alarmMinutes: 1440,
          }))));
          toast(`${exams.length} Termine exportiert`);
        },
      })),

    group('Daten',
      row({
        title: 'Sicherung erstellen',
        subtitle: 'Alle Daten als JSON-Datei',
        leading: h('div', { class: 'tile tile-green' }, icon('download')),
        chevron: true,
        onclick: exportBackup,
      }),
      row({
        title: 'Sicherung einspielen',
        leading: h('div', { class: 'tile tile-blue' }, icon('upload')),
        chevron: true,
        onclick: () => importBackup(ctx),
      }),
      row({
        title: 'Alles löschen',
        danger: true,
        leading: h('div', { class: 'tile tile-red' }, icon('trash')),
        onclick: async () => {
          const ok = await confirmDialog({
            title: 'Wirklich alles löschen?',
            text: 'Noten, Aufgaben, Termine und Einstellungen werden entfernt. Das lässt sich nicht rückgängig machen.',
            confirmLabel: 'Alles löschen',
          });
          if (!ok) return;
          S.resetAll();
          ctx.applyTheme();
          ctx.openOnboarding();
        },
      })),
    h('div', { class: 'notice mt' }, icon('warn'),
      h('div', {}, 'Alle Daten liegen nur in diesem Browser. Safari räumt den Speicher von Webseiten auf, die sieben Tage nicht benutzt wurden — leg die App über „Teilen → Zum Home-Bildschirm“ ab und erstelle ab und zu eine Sicherung.')),

    group('Über',
      row({ title: 'Anti Procrastinator', subtitle: 'Version 2.0 · offline nutzbar' }),
      row({
        title: 'Zum Home-Bildschirm hinzufügen',
        subtitle: 'Safari: Teilen-Symbol → Zum Home-Bildschirm',
        leading: h('div', { class: 'tile tile-gray' }, icon('info')),
      })),
    footnote('Gebaut ohne Tracking, ohne Konto, ohne Server.'));
}

function switchEl(checked, onChange) {
  const input = h('input', { type: 'checkbox', checked, onchange: (e) => onChange(e.target.checked) });
  return h('label', { class: 'switch' }, input, h('span', { class: 'switch-track' }, h('span', { class: 'switch-knob' })));
}

function editName(ctx) {
  let value = S.get().settings.name || '';
  return sheet({
    title: 'Name',
    rightLabel: 'Sichern',
    onRight: (close) => {
      S.update((s) => { s.settings.name = value.trim().slice(0, 30); });
      ctx.rerender();
      close();
    },
    render: (body) => {
      fill(body, group('', field({
        label: 'Wie sollen wir dich ansprechen?',
        input: textInput({ value, placeholder: 'Vorname', oninput: (e) => { value = e.target.value; } }),
        hint: 'Erscheint nur auf „Heute“ und bleibt auf diesem Gerät.',
      })));
    },
  });
}

// ── Fokus im Vollbild ────────────────────────────────────────────────────────

function openFocus(ctx) {
  return sheet({
    title: 'Fokus',
    leftLabel: 'Fertig',
    size: 'full',
    render: (body, close) => {
      let unsub = null;
      const draw = () => {
        const t = F.timer();
        const cfg = F.config();
        const running = F.isRunning();
        const mode = t?.mode || 'work';

        const timeEl = h('div', { class: 'focus-time' }, F.formatClock(t ? F.remaining() : cfg.work * 60));
        const ringWrap = h('div', { class: 'ring-wrap' },
          progressRing(t ? F.progress() : 0, { size: 232, stroke: 12 }),
          h('div', { class: 'ring-center' }, timeEl, h('div', { class: 'focus-mode' }, F.modeLabel(mode))));

        const pips = h('div', { class: 'focus-pips' },
          ...Array.from({ length: cfg.cycle }, (_, i) => h('span', {
            class: `focus-pip${(t?.cycle || 0) % cfg.cycle > i || ((t?.cycle || 0) > 0 && (t.cycle % cfg.cycle === 0)) ? ' focus-pip-on' : ''}`,
          })));

        fill(body,
          h('div', { class: 'focus-stage' }, ringWrap, pips,
            h('div', { class: 'focus-controls' },
              h('button', {
                class: 'focus-btn', type: 'button', 'aria-label': 'Zurücksetzen',
                onclick: () => { F.stop(); draw(); ctx.rerender(); },
              }, icon('refresh', { weight: 2 })),
              h('button', {
                class: 'focus-btn focus-btn-main', type: 'button', 'aria-label': running ? 'Pause' : 'Start',
                onclick: () => { F.toggle(); draw(); ctx.rerender(); },
              }, icon(running ? 'pause' : 'play', { weight: 2.2, fill: !running })),
              h('button', {
                class: 'focus-btn', type: 'button', 'aria-label': 'Pause starten',
                onclick: () => { F.start(mode === 'work' ? 'short' : 'work'); draw(); ctx.rerender(); },
              }, icon('chevron', { weight: 2.2 })))),

          group('Heute',
            row({ title: 'Fokuszeit', detail: `${F.todayMinutes()} min` }),
            row({ title: 'Einheiten', detail: String(S.get().focus.sessions.filter((s) => s.date === S.today()).length) })),

          group('Längen',
            field({
              label: 'Fokus',
              input: select([15, 20, 25, 30, 45, 50, 60].map((v) => ({ value: v, label: `${v} Minuten` })), cfg.work,
                (v) => { S.update((s) => { s.focus.config.work = Number(v); }); draw(); }),
            }),
            field({
              label: 'Kurze Pause',
              input: select([3, 5, 8, 10].map((v) => ({ value: v, label: `${v} Minuten` })), cfg.short,
                (v) => { S.update((s) => { s.focus.config.short = Number(v); }); draw(); }),
            }),
            field({
              label: 'Lange Pause',
              input: select([10, 15, 20, 30].map((v) => ({ value: v, label: `${v} Minuten` })), cfg.long,
                (v) => { S.update((s) => { s.focus.config.long = Number(v); }); draw(); }),
            }),
            field({
              label: 'Lange Pause nach',
              input: select([2, 3, 4, 5, 6].map((v) => ({ value: v, label: `${v} Einheiten` })), cfg.cycle,
                (v) => { S.update((s) => { s.focus.config.cycle = Number(v); }); draw(); }),
            })),

          'Notification' in window && Notification.permission === 'default'
            ? group('', row({
              title: 'Benachrichtigung erlauben',
              subtitle: 'Meldet sich, wenn eine Einheit vorbei ist',
              leading: h('div', { class: 'tile tile-orange' }, icon('info')),
              tint: true,
              onclick: () => F.requestNotifications().then((r) => {
                toast(r === 'granted' ? 'Benachrichtigungen aktiv' : 'Nicht erlaubt', { warn: r !== 'granted' });
                draw();
              }),
            }))
            : null,
          footnote('Der Timer rechnet mit Uhrzeiten. Er läuft korrekt weiter, auch wenn das Display aus ist oder du die App wechselst.'));

        unsub?.();
        unsub = F.onTick(() => {
          if (!timeEl.isConnected) { unsub?.(); unsub = null; return; }
          timeEl.textContent = F.formatClock(F.remaining());
          const fill_ = ringWrap.querySelector('.ring-fill');
          if (fill_) {
            const r = (232 - 12) / 2;
            const c = 2 * Math.PI * r;
            fill_.setAttribute('stroke-dasharray', `${c * F.progress()} ${c}`);
          }
        });
      };
      draw();
      document.addEventListener('ap:focus-finished', draw);
    },
  }).then(() => ctx.rerender());
}

// ── Statistik ────────────────────────────────────────────────────────────────

function openStats(ctx) {
  return sheet({
    title: 'Statistik',
    leftLabel: 'Fertig',
    size: 'full',
    render: (body) => {
      const st = S.get();
      const focusDays = F.history(14);
      const taskDays = taskHistory(14);
      const study = S.activeStudy();

      const totalFocus = st.focus.sessions.reduce((s, x) => s + x.minutes, 0);
      const doneTasks = st.tasks.filter((t) => t.done).length;
      const openTasks = st.tasks.filter((t) => !t.done).length;

      fill(body,
        h('div', { class: 'metrics mt' },
          metric(`${Math.round(totalFocus / 60)} h`, 'Fokus gesamt'),
          metric(String(doneTasks), 'erledigt'),
          metric(String(openTasks), 'offen')),

        h('div', { class: 'card mt' },
          h('div', { class: 'card-head' }, h('h3', {}, 'Fokusminuten'), h('span', { class: 'card-more' }, '14 Tage')),
          barChart(focusDays.map((d) => ({ label: shortDay(d.date), value: d.minutes })), ' min')),

        h('div', { class: 'card mt' },
          h('div', { class: 'card-head' }, h('h3', {}, 'Erledigte Aufgaben'), h('span', { class: 'card-more' }, '14 Tage')),
          barChart(taskDays.map((d) => ({ label: shortDay(d.date), value: d.count })))),

        study?.kind === 'uni' ? semesterChart(study.data, st.settings.roundMode) : null,
        study?.kind === 'schule' ? schoolChart(study.data) : null,

        footnote('Alle Auswertungen entstehen aus deinen eigenen Daten auf diesem Gerät.'));
    },
  });
}

function metric(value, label) {
  return h('div', { class: 'metric' },
    h('div', { class: 'metric-value' }, value),
    h('div', { class: 'metric-label' }, label));
}

function shortDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS_SHORT[new Date(y, m - 1, d).getDay()];
}

function taskHistory(days) {
  const st = S.get();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = S.isoDate(d);
    out.push({
      date: iso,
      count: st.tasks.filter((t) => t.done && (t.doneAt || '').slice(0, 10) === iso).length,
    });
  }
  return out;
}

/** Schlichtes Balkendiagramm als SVG — skaliert mit der Breite und kennt beide Themes. */
function barChart(items, unit = '') {
  const peak = Math.max(0, ...items.map((i) => i.value));
  if (peak === 0) {
    return h('div', { style: { fontSize: '15px', color: 'var(--label-2)', padding: '10px 0 2px' } },
      'Noch nichts aufgezeichnet.');
  }

  const W_ = 320;
  const H = 84;
  const gap = 3;
  const bw = (W_ - gap * (items.length - 1)) / items.length;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W_} ${H + 14}`);
  svg.classList.add('chart');
  svg.style.width = '100%';

  items.forEach((it, i) => {
    const hgt = it.value > 0 ? Math.max(4, (it.value / peak) * H) : 2;
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', i * (bw + gap));
    rect.setAttribute('y', H - hgt);
    rect.setAttribute('width', bw);
    rect.setAttribute('height', hgt);
    rect.setAttribute('rx', Math.min(2.5, bw / 2));
    rect.setAttribute('class', it.value > 0 ? 'chart-bar' : 'chart-bar-muted');
    svg.append(rect);

    if (i % 2 === 0) {
      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', i * (bw + gap) + bw / 2);
      text.setAttribute('y', H + 11);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'chart-label');
      text.textContent = it.label;
      svg.append(text);
    }
  });

  const total = items.reduce((s, i) => s + i.value, 0);
  return h('div', {}, svg,
    h('div', { style: { fontSize: '12px', color: 'var(--label-2)', marginTop: '8px' } },
      `Gesamt ${total}${unit} · Bestwert ${peak}${unit}`));
}

function semesterChart(uni, roundMode) {
  const rows = uni.semesters.map((sem) => {
    const s = G.semesterStats(sem, { roundMode });
    return { label: `${sem.nr}. Semester`, avg: s.average, ects: s.ectsDone, total: s.ectsTotal };
  });
  return h('div', { class: 'card mt' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Semester')),
    ...rows.map((r) => h('div', { style: { marginBottom: '12px' } },
      h('div', { class: 'inline', style: { fontSize: '14px', marginBottom: '5px' } },
        h('span', {}, r.label),
        h('span', { class: 'spacer' }),
        h('span', { class: 'muted' }, r.avg != null ? `Ø ${G.fmtPrecise(r.avg, uni.scale)}` : '–'),
        h('span', { class: 'muted', style: { marginLeft: '10px' } }, `${r.ects}/${r.total} ECTS`)),
      h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: `${r.total ? (r.ects / r.total) * 100 : 0}%` } })))));
}

function schoolChart(sch) {
  return h('div', { class: 'card mt' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Halbjahre')),
    ...sch.terms.map((t) => {
      const s = G.termStats(t, WEIGHT_PROFILES, sch.scale);
      return h('div', { style: { marginBottom: '12px' } },
        h('div', { class: 'inline', style: { fontSize: '14px', marginBottom: '5px' } },
          h('span', {}, t.label),
          h('span', { class: 'spacer' }),
          h('span', { class: 'muted' }, s.average != null ? `Ø ${G.fmtPrecise(s.average, sch.scale)}` : '–')),
        h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: `${s.total ? (s.graded / s.total) * 100 : 0}%` } })));
    }));
}

// ── Wetter-Einstellungen ─────────────────────────────────────────────────────

function openWeather(ctx) {
  return sheet({
    title: 'Wetter',
    leftLabel: 'Fertig',
    size: 'full',
    render: (body) => {
      const results = h('div', {});
      const draw = () => {
        const cfg = S.get().settings.weather;
        fill(body,
          group('',
            row({
              title: 'Auf „Heute“ anzeigen',
              trailing: switchEl(cfg.enabled, (on) => {
                S.update((s) => { s.settings.weather.enabled = on; });
                draw();
                ctx.rerender();
              }),
            }),
            cfg.place ? row({ title: 'Ort', detail: cfg.place }) : null),

          group('Ort wählen',
            field({
              label: 'Stadt suchen',
              input: textInput({
                placeholder: 'z. B. Frankfurt am Main',
                enterkeyhint: 'search',
                oninput: (e) => search(e.target.value),
              }),
            })),
          results,
          group('', row({
            title: 'Aktuellen Standort verwenden',
            leading: h('div', { class: 'tile tile-teal' }, icon('target')),
            tint: true,
            onclick: async () => {
              try {
                const { lat, lon } = await W.locate();
                S.update((s) => {
                  s.settings.weather = { enabled: true, lat, lon, place: 'Aktueller Standort' };
                });
                draw();
                ctx.rerender();
                toast('Standort übernommen');
              } catch (err) {
                toast(err.message, { warn: true });
              }
            },
          })),
          footnote('Die Daten kommen von Open-Meteo. Es wird kein Konto und kein Schlüssel gebraucht, und dein Ort verlässt das Gerät nur als Koordinatenpaar in der Wetterabfrage.'));
      };

      let searchTimer = null;
      const search = (q) => {
        clearTimeout(searchTimer);
        if (q.trim().length < 2) { fill(results); return; }
        searchTimer = setTimeout(async () => {
          try {
            const places = await W.searchPlace(q.trim());
            fill(results, places.length
              ? group('Treffer', ...places.map((pl) => row({
                title: pl.name,
                subtitle: pl.admin,
                onclick: () => {
                  S.update((s) => {
                    s.settings.weather = { enabled: true, lat: pl.lat, lon: pl.lon, place: pl.name };
                  });
                  draw();
                  ctx.rerender();
                  toast(`${pl.name} übernommen`);
                },
              })))
              : group('Treffer', row({ title: 'Nichts gefunden' })));
          } catch {
            fill(results, group('', row({ title: 'Suche nicht erreichbar', subtitle: 'Bist du online?' })));
          }
        }, 320);
      };

      draw();
    },
  });
}

// ── Sicherung ────────────────────────────────────────────────────────────────

function exportBackup() {
  S.flush();
  const data = JSON.stringify(S.get(), null, 2);
  const stamp = S.today();
  ICS.download(`anti-procrastinator-backup-${stamp}.json`, data, 'application/json');
  toast('Sicherung erstellt');
}

async function importBackup(ctx) {
  const file = await ICS.pickFile('.json,application/json');
  if (!file) return;
  let parsed;
  try {
    parsed = JSON.parse(file.text);
  } catch {
    toast('Datei ist keine gültige Sicherung', { warn: true });
    return;
  }
  if (!parsed || typeof parsed !== 'object' || !('tasks' in parsed || 'study' in parsed)) {
    toast('Datei passt nicht zu dieser App', { warn: true });
    return;
  }
  const ok = await confirmDialog({
    title: 'Sicherung einspielen?',
    text: 'Die aktuellen Daten auf diesem Gerät werden dabei ersetzt.',
    confirmLabel: 'Einspielen',
  });
  if (!ok) return;
  S.replaceState(parsed);
  ctx.applyTheme();
  ctx.rerender();
  toast('Sicherung eingespielt');
}
