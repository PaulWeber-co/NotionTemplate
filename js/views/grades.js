/**
 * Noten — Kernbildschirm.
 * Uni: Semester → Module → Prüfungsleistungen.
 * Schule: Halbjahr → Fächer → Einzelleistungen.
 */

import {
  h, icon, group, row, footnote, emptyState, button, segmented, sheet, confirmDialog,
  actionSheet, toast, field, textInput, select, progressRing, formatDate, relativeDate,
} from '../ui.js';
import { page, navButton, fill } from '../page.js';
import * as S from '../store.js';
import * as G from '../grades.js';
import { findUniPreset } from '../data/curriculum.js';
import { WEIGHT_PROFILES, MARK_KINDS, markKind, findSchoolPreset } from '../data/school.js';

const STATUS = {
  offen: { label: 'Offen', dot: 'dot-open' },
  angemeldet: { label: 'Angemeldet', dot: 'dot-active' },
  bestanden: { label: 'Bestanden', dot: 'dot-ok' },
  nicht_bestanden: { label: 'Nicht bestanden', dot: 'dot-fail' },
  anerkannt: { label: 'Anerkannt', dot: 'dot-ok' },
};

// ── Anzeige-Helfer (auch von anderen Ansichten genutzt) ──────────────────────

export function gradeClass(value, scaleId) {
  if (value == null) return 'grade-none';
  if (scaleId === 'punkte') {
    if (value >= 13) return 'grade-1';
    if (value >= 10) return 'grade-2';
    if (value >= 7) return 'grade-3';
    if (value >= 5) return 'grade-4';
    return 'grade-5';
  }
  return `grade-${Math.min(5, Math.max(1, Math.floor(value)))}`;
}

export function gradePill(value, scaleId, opts = {}) {
  const cls = `grade ${gradeClass(value, scaleId)}${opts.large ? ' grade-lg' : ''}`;
  return h('span', { class: cls }, value == null ? '–' : G.fmt(value, scaleId));
}

function gradeOptions(scaleId) {
  return [{ value: '', label: 'Noch keine Note' }, ...G.scale(scaleId).options.map((o) => ({ value: o.value, label: o.label }))];
}

/** Setzt den Modulstatus automatisch, solange er nicht von Hand gesetzt wurde. */
function syncStatus(mod, scaleId) {
  if (mod.statusManual || mod.status === 'anerkannt') return;
  const g = G.moduleGrade(mod);
  if (g.complete && g.value != null) {
    mod.status = G.isPass(g.value, scaleId) ? 'bestanden' : 'nicht_bestanden';
  } else if (g.doneWeight > 0 || mod.parts.some((p) => p.date)) {
    mod.status = 'angemeldet';
  } else {
    mod.status = 'offen';
  }
}

/** Fachsemester, das gerade läuft — nach Jahr und Semesterhälfte. */
function currentSemesterIndex(uni) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const term = m >= 4 && m <= 9 ? 'SS' : 'WS';
  const winterYear = m <= 3 ? y - 1 : y;
  const idx = uni.semesters.findIndex((s) => s.term === term && s.year === (term === 'WS' ? winterYear : y));
  if (idx >= 0) return idx;
  const open = uni.semesters.findIndex((s) => s.modules.some((mod) => mod.status !== 'bestanden' && mod.status !== 'anerkannt'));
  return open >= 0 ? open : 0;
}

// ── Hauptansicht ─────────────────────────────────────────────────────────────

let view = { semester: null, term: 0 };

export function render(screen, ctx) {
  const st = S.get();
  const p = page({
    title: 'Noten',
    right: navButton('', () => openStudyMenu(ctx), { icon: 'gear', label: 'Studium verwalten' }),
  });
  fill(screen, p.root);

  const study = S.activeStudy();
  if (!study) {
    fill(p.content, emptyState({
      symbol: 'grades',
      title: 'Noch nichts eingerichtet',
      text: 'Wähle deinen Studiengang oder deine Klassenstufe. Bei Provadis sind alle Module aus dem Modulhandbuch schon hinterlegt.',
      action: button('Jetzt einrichten', { variant: 'filled', onclick: () => ctx.openOnboarding() }),
    }));
    return;
  }

  if (study.kind === 'uni') renderUni(p, study.data, ctx);
  else renderSchool(p, study.data, ctx);
}

// ── Uni ──────────────────────────────────────────────────────────────────────

function renderUni(p, uni, ctx) {
  const st = S.get();
  const scaleId = uni.scale;
  const roundMode = st.settings.roundMode;
  const stats = G.uniStats(uni, { roundMode });

  if (view.semester == null) view.semester = currentSemesterIndex(uni);
  if (view.semester >= uni.semesters.length) view.semester = uni.semesters.length - 1;

  p.setTitle('Noten');

  const avgText = stats.average != null
    ? G.fmtPrecise(stats.averageRounded ?? stats.average, scaleId)
    : '–';

  const hero = h('div', { class: 'card' },
    h('div', { class: 'inline', style: { gap: '18px' } },
      h('div', { class: 'ring-wrap' },
        progressRing(stats.progress, { size: 104, stroke: 10 }),
        h('div', { class: 'ring-center' },
          h('div', { style: { fontSize: '21px', fontWeight: '700', letterSpacing: '-0.03em' } }, `${Math.round(stats.progress * 100)}%`),
          h('div', { style: { fontSize: '11px', color: 'var(--label-2)' } }, 'geschafft'))),
      h('div', { style: { flex: '1', minWidth: '0' } },
        h('div', { style: { fontSize: '13px', color: 'var(--label-2)' } }, 'Aktueller Schnitt'),
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' } },
          h('span', {
            style: {
              fontSize: '38px', fontWeight: '700', letterSpacing: '-0.035em',
              fontVariantNumeric: 'tabular-nums',
              color: stats.average == null ? 'var(--label-3)' : 'var(--label)',
            },
          }, avgText),
          stats.average != null ? h('span', { style: { fontSize: '13px', color: 'var(--label-2)' } }, G.scale(scaleId).text(stats.average)) : null),
        h('div', { style: { fontSize: '13px', color: 'var(--label-2)', marginTop: '4px' } },
          `${stats.ectsDone} von ${stats.ectsTotal} ECTS · ${stats.ectsGraded} ECTS benotet`))),
    stats.failed > 0
      ? h('div', { style: { marginTop: '12px', fontSize: '13px', color: 'var(--red)' } },
        `${stats.failed} ${stats.failed === 1 ? 'Modul' : 'Module'} nicht bestanden`)
      : null);

  const needed = targetPreview(stats, uni.target);
  const quick = h('div', { class: 'metrics mt' },
    metricTap(needed != null ? G.fmt(needed, scaleId) : '–', 'Nötig für Ziel', `Ziel ${G.fmt(uni.target, scaleId)}`, () => openForecast(uni, stats, ctx)),
    metricTap(String(stats.modulesDone), 'Module fertig', `von ${stats.modulesTotal}`, null),
    metricTap(`${currentSemesterIndex(uni) + 1}.`, 'Fachsemester', `von ${uni.regularSemesters}`, null));

  // Semester-Auswahl
  const pills = h('div', {
    class: 'pad',
    style: { display: 'flex', gap: '7px', overflowX: 'auto', paddingTop: '4px', paddingBottom: '2px', scrollbarWidth: 'none' },
  });
  uni.semesters.forEach((sem, i) => {
    const done = sem.modules.length > 0 && sem.modules.every((m) => m.status === 'bestanden' || m.status === 'anerkannt');
    pills.append(h('button', {
      class: 'chip',
      type: 'button',
      style: {
        flex: 'none',
        padding: '7px 13px',
        fontSize: '14px',
        fontWeight: i === view.semester ? '600' : '400',
        background: i === view.semester ? 'var(--tint)' : 'var(--bg-fill)',
        color: i === view.semester ? '#fff' : 'var(--label)',
      },
      onclick: () => { view.semester = i; ctx.rerender(); },
    }, done ? '✓ ' : '', `${sem.nr}. Sem.`));
  });

  const sem = uni.semesters[view.semester];
  const semStats = G.semesterStats(sem, { roundMode });

  const rows = sem.modules.length
    ? sem.modules.map((mod) => moduleRow(mod, scaleId, ctx))
    : [h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-sub' }, 'Noch keine Module in diesem Semester.')))];

  const semTitle = `${sem.nr}. Semester · ${sem.term === 'WS' ? 'Winter' : 'Sommer'} ${sem.year || ''}`.trim();

  const modulesGroup = group(semTitle, ...rows,
    row({
      title: 'Modul hinzufügen',
      leading: h('div', { class: 'tile tile-tint' }, icon('plus', { weight: 2.4 })),
      tint: true,
      onclick: () => addModule(sem, ctx),
    }));

  const semSummary = h('div', { class: 'pad', style: { display: 'flex', gap: '14px', paddingTop: '9px', fontSize: '13px', color: 'var(--label-2)' } },
    h('span', {}, `Schnitt: ${semStats.average != null ? G.fmtPrecise(semStats.average, scaleId) : '–'}`),
    h('span', {}, `${semStats.ectsDone}/${semStats.ectsTotal} ECTS`));

  const preset = findUniPreset(uni.presetId);
  const electiveRows = Object.entries(preset.electives || {}).map(([slot, grp]) => row({
    title: grp.label,
    subtitle: uni.electives[slot]
      ? grp.options.find((o) => o.key === uni.electives[slot])?.name
      : 'Noch nicht gewählt',
    leading: h('div', { class: 'tile tile-indigo' }, icon('flag')),
    chevron: true,
    onclick: () => chooseElective(uni, slot, grp, ctx),
  }));

  fill(p.content,
    hero,
    quick,
    h('div', { class: 'mt-lg' }, pills),
    semSummary,
    modulesGroup,
    electiveRows.length ? group('Wahlpflicht', ...electiveRows) : null,
    group('Studiengang',
      row({
        title: uni.name,
        subtitle: [uni.degree, uni.institution].filter(Boolean).join(' · '),
        leading: h('div', { class: 'tile tile-blue' }, icon('book')),
        chevron: true,
        onclick: () => openProgramInfo(uni, ctx),
      }),
      uni.handbook
        ? row({
          title: 'Modulhandbuch öffnen',
          subtitle: uni.version,
          leading: h('div', { class: 'tile tile-gray' }, icon('doc')),
          href: uni.handbook,
          chevron: true,
        })
        : null),
    footnote('Die Endnote ist der ECTS-gewichtete Durchschnitt aller vollständig benoteten Module.'));
}

function metricTap(value, label, sub, onclick) {
  return h('div', {
    class: `metric${onclick ? ' card-tap' : ''}`,
    onclick,
    style: onclick ? { cursor: 'pointer' } : null,
  },
    h('div', { class: 'metric-value' }, value),
    h('div', { class: 'metric-label' }, label),
    sub ? h('div', { class: 'metric-sub' }, sub) : null);
}

function targetPreview(stats, target) {
  if (stats.ectsOpen <= 0) return null;
  const f = G.forecast(stats, target ?? 2.0);
  return f.needed == null ? null : Math.max(1, Math.min(5, f.needed));
}

function moduleRow(mod, scaleId, ctx) {
  const g = G.moduleGrade(mod);
  const status = STATUS[mod.status] || STATUS.offen;
  const nextExam = mod.parts.filter((p) => p.date && p.grade == null).sort((a, b) => a.date.localeCompare(b.date))[0];

  const bits = [`${mod.ects} ECTS`];
  if (mod.status === 'anerkannt') bits.push('anerkannt');
  else if (nextExam) bits.push(`${nextExam.label.split('(')[0].trim()} · ${relativeDate(nextExam.date)}`);
  else if (!g.complete && g.doneWeight > 0) bits.push(`${Math.round(g.doneWeight)} % bewertet`);
  else bits.push(status.label);

  return row({
    title: mod.name,
    subtitle: bits.join(' · '),
    leading: h('span', { class: `dot ${status.dot}` }),
    trailing: gradePill(g.complete || g.doneWeight > 0 ? g.value : null, scaleId),
    chevron: true,
    onclick: () => openModule(mod, scaleId, ctx),
  });
}

// ── Modul-Detail ─────────────────────────────────────────────────────────────

function openModule(mod, scaleId, ctx) {
  const render = (body, close) => {
    const draw = () => {
      const g = G.moduleGrade(mod);
      const status = STATUS[mod.status] || STATUS.offen;
      const hasAssumed = mod.parts.some((p) => p.assumed);

      const badges = h('div', { class: 'badge-row' },
        h('span', { class: 'badge' }, `${mod.ects} ECTS`),
        mod.wab ? h('span', { class: 'badge badge-wab' }, 'WAB') : null,
        mod.lang ? h('span', { class: 'badge' }, mod.lang) : null,
        mod.offer ? h('span', { class: 'badge' }, mod.offer) : null);

      fill(body,
        h('div', { class: 'hero' },
          h('div', { class: 'hero-title' }, mod.name),
          mod.subtitle ? h('div', { class: 'hero-sub' }, mod.subtitle) : null,
          h('div', { class: 'hero-grade' },
            gradePill(g.value, scaleId, { large: true }),
            g.value != null && !g.complete
              ? h('div', { style: { fontSize: '12px', color: 'var(--label-2)', marginTop: '6px' } },
                `Zwischenstand — ${Math.round(g.openWeight)} % der Prüfung stehen noch aus`)
              : null,
            g.value != null && g.complete
              ? h('div', { style: { fontSize: '13px', color: 'var(--label-2)', marginTop: '6px' } }, G.scale(scaleId).text(g.value))
              : null),
          badges),

        group('Prüfungsleistungen',
          ...mod.parts.map((part, i) => partRow(mod, part, i, scaleId, ctx, draw)),
          row({
            title: 'Teilleistung hinzufügen',
            leading: h('div', { class: 'tile tile-tint' }, icon('plus', { weight: 2.4 })),
            tint: true,
            onclick: () => {
              S.update(() => {
                mod.parts.push({
                  id: S.uid('p_'), label: 'Weitere Leistung', weight: 0,
                  grade: null, date: null, time: null, room: '', assumed: false, wab: false,
                });
              });
              draw();
            },
          })),
        weightNotice(mod, hasAssumed),

        group('Status',
          row({
            title: 'Status',
            detail: status.label,
            leading: h('span', { class: `dot ${status.dot}`, style: { marginLeft: '5px', marginRight: '5px' } }),
            chevron: true,
            onclick: async () => {
              const pick = await actionSheet({
                title: 'Status',
                message: 'Wird sonst automatisch aus den Noten abgeleitet.',
                actions: [
                  { id: 'auto', label: 'Automatisch' },
                  ...Object.entries(STATUS).map(([id, s]) => ({ id, label: s.label })),
                ],
              });
              if (!pick) return;
              S.update(() => {
                if (pick === 'auto') {
                  mod.statusManual = false;
                  syncStatus(mod, scaleId);
                } else {
                  mod.statusManual = true;
                  mod.status = pick;
                }
              });
              draw();
              ctx.rerender();
            },
          }),
          row({
            title: 'Zählt in den Schnitt',
            trailing: switchRow(!mod.excluded, (on) => {
              S.update(() => { mod.excluded = !on; });
              ctx.rerender();
            }),
          })),
        mod.excluded ? footnote('Dieses Modul bleibt bei der Berechnung des Notenschnitts außen vor.') : null,

        group('Details',
          mod.exam ? row({ title: 'Prüfungsform', subtitle: mod.exam }) : null,
          mod.lecturer ? row({ title: 'Modulverantwortung', subtitle: mod.lecturer }) : null,
          row({
            title: 'Notiz',
            subtitle: mod.note || 'Keine Notiz',
            leading: h('div', { class: 'tile tile-gray' }, icon('edit')),
            chevron: true,
            onclick: () => editNote(mod, draw),
          })),

        group('',
          row({
            title: 'Modul bearbeiten',
            leading: h('div', { class: 'tile tile-gray' }, icon('gear')),
            chevron: true,
            onclick: () => editModule(mod, ctx, draw),
          }),
          row({
            title: 'Modul löschen',
            danger: true,
            leading: h('div', { class: 'tile tile-red' }, icon('trash')),
            onclick: async () => {
              const ok = await confirmDialog({
                title: 'Modul löschen?',
                text: `„${mod.name}" wird mit allen Noten entfernt.`,
              });
              if (!ok) return;
              S.update((st) => {
                for (const sem of st.study.uni.semesters) {
                  const i = sem.modules.findIndex((m) => m.id === mod.id);
                  if (i >= 0) sem.modules.splice(i, 1);
                }
              });
              close();
              ctx.rerender();
            },
          })),
        mod.page && S.get().study.uni.handbook
          ? footnote(`Modulhandbuch, Seite ${mod.page}.`)
          : null);
    };
    draw();
  };

  return sheet({ title: 'Modul', leftLabel: 'Fertig', size: 'full', render });
}

function weightNotice(mod, hasAssumed) {
  const total = mod.parts.reduce((s, p) => s + (Number(p.weight) || 0), 0);
  if (Math.abs(total - 100) > 0.5) {
    return h('div', { class: 'notice mt' }, icon('warn'),
      h('div', {}, `Die Gewichtungen ergeben ${Math.round(total)} %. Der Schnitt wird trotzdem korrekt anteilig berechnet — für eine klare Übersicht sollten es 100 % sein.`));
  }
  if (hasAssumed) {
    return h('div', { class: 'notice mt' }, icon('info'),
      h('div', {}, 'Das Modulhandbuch legt die Gewichtung dieser Teilleistungen nicht fest. Hinterlegt ist eine gleichmäßige Aufteilung — bitte anpassen, sobald du es von den Dozierenden weißt.'));
  }
  return null;
}

function partRow(mod, part, index, scaleId, ctx, redraw) {
  const bits = [`${Math.round(part.weight)} %`];
  if (part.date) bits.push(formatDate(part.date, 'medium') + (part.time ? `, ${part.time}` : ''));
  if (part.room) bits.push(part.room);

  return row({
    title: part.label,
    subtitle: bits.join(' · '),
    leading: part.wab ? h('span', { class: 'badge badge-wab' }, 'WAB') : null,
    trailing: gradePill(part.grade, scaleId),
    chevron: true,
    onclick: () => editPart(mod, part, index, scaleId, ctx, redraw),
  });
}

function editPart(mod, part, index, scaleId, ctx, redraw) {
  const draft = { ...part };
  return sheet({
    title: 'Prüfungsleistung',
    rightLabel: 'Sichern',
    size: 'full',
    onRight: (close) => {
      S.update(() => {
        Object.assign(part, draft, { weight: Number(draft.weight) || 0 });
        part.grade = draft.grade === '' || draft.grade == null ? null : Number(draft.grade);
        part.assumed = false;
        syncStatus(mod, scaleId);
      });
      redraw();
      ctx.rerender();
      close();
    },
    render: (body, close) => {
      fill(body,
        group('',
          field({ label: 'Bezeichnung', input: textInput({ value: draft.label, oninput: (e) => { draft.label = e.target.value; } }) }),
          field({
            label: 'Gewichtung an der Modulnote',
            input: h('div', { class: 'inline' },
              textInput({ type: 'number', value: draft.weight, min: 0, max: 100, step: 1, inputmode: 'numeric', oninput: (e) => { draft.weight = e.target.value; } }),
              h('span', { style: { fontSize: '17px', color: 'var(--label-2)' } }, '%')),
            hint: 'Bei einer einzigen Prüfung: 100 %.',
          })),

        group('Note',
          field({
            label: 'Bewertung',
            input: select(gradeOptions(scaleId), draft.grade ?? '', (v) => { draft.grade = v === '' ? null : Number(v); }),
            hint: G.scale(scaleId).label,
          })),

        group('Termin',
          field({ label: 'Datum', input: textInput({ type: 'date', value: draft.date || '', onchange: (e) => { draft.date = e.target.value || null; } }) }),
          field({ label: 'Uhrzeit', input: textInput({ type: 'time', value: draft.time || '', onchange: (e) => { draft.time = e.target.value || null; } }) }),
          field({ label: 'Raum', input: textInput({ value: draft.room || '', placeholder: 'z. B. A 1.03', oninput: (e) => { draft.room = e.target.value; } }) })),
        footnote('Termine erscheinen automatisch im Kalender und auf „Heute“.'),

        mod.parts.length > 1
          ? group('', row({
            title: 'Teilleistung löschen',
            danger: true,
            leading: h('div', { class: 'tile tile-red' }, icon('trash')),
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Teilleistung löschen?' });
              if (!ok) return;
              S.update(() => {
                mod.parts.splice(index, 1);
                syncStatus(mod, scaleId);
              });
              redraw();
              ctx.rerender();
              close();
            },
          }))
          : null);
    },
  });
}

function editNote(mod, redraw) {
  let text = mod.note || '';
  return sheet({
    title: 'Notiz',
    rightLabel: 'Sichern',
    onRight: (close) => {
      S.update(() => { mod.note = text.trim(); });
      redraw();
      close();
    },
    render: (body) => {
      fill(body, group('', h('div', { class: 'field' },
        h('textarea', {
          class: 'input',
          placeholder: 'Literatur, Formelsammlung erlaubt, Hinweise der Dozierenden …',
          oninput: (e) => { text = e.target.value; },
        }, text))));
    },
  });
}

function editModule(mod, ctx, redraw) {
  const draft = { name: mod.name, subtitle: mod.subtitle, ects: mod.ects, lecturer: mod.lecturer, exam: mod.exam };
  return sheet({
    title: 'Modul bearbeiten',
    rightLabel: 'Sichern',
    size: 'full',
    onRight: (close) => {
      if (!draft.name.trim()) { toast('Name fehlt', { warn: true }); return; }
      S.update(() => {
        mod.name = draft.name.trim();
        mod.subtitle = draft.subtitle.trim();
        mod.ects = Math.max(0, Number(draft.ects) || 0);
        mod.lecturer = draft.lecturer.trim();
        mod.exam = draft.exam.trim();
      });
      redraw();
      ctx.rerender();
      close();
    },
    render: (body) => {
      fill(body, group('',
        field({ label: 'Name', input: textInput({ value: draft.name, oninput: (e) => { draft.name = e.target.value; } }) }),
        field({ label: 'Zusatz', input: textInput({ value: draft.subtitle, placeholder: 'z. B. mit WAB', oninput: (e) => { draft.subtitle = e.target.value; } }) }),
        field({ label: 'ECTS', input: textInput({ type: 'number', value: draft.ects, min: 0, max: 60, step: 1, inputmode: 'numeric', oninput: (e) => { draft.ects = e.target.value; } }) }),
        field({ label: 'Prüfungsform', input: textInput({ value: draft.exam, oninput: (e) => { draft.exam = e.target.value; } }) }),
        field({ label: 'Modulverantwortung', input: textInput({ value: draft.lecturer, oninput: (e) => { draft.lecturer = e.target.value; } }) })));
    },
  });
}

function addModule(sem, ctx) {
  const draft = { name: '', ects: 5, exam: 'Klausur' };
  return sheet({
    title: 'Neues Modul',
    rightLabel: 'Hinzufügen',
    onRight: (close) => {
      if (!draft.name.trim()) { toast('Name fehlt', { warn: true }); return; }
      S.update(() => {
        sem.modules.push(S.buildModule({
          name: draft.name.trim(),
          ects: Number(draft.ects) || 5,
          exam: draft.exam.trim(),
          parts: [{ label: draft.exam.trim() || 'Prüfungsleistung', weight: 100 }],
        }));
      });
      ctx.rerender();
      close();
    },
    render: (body) => {
      fill(body, group('',
        field({ label: 'Name', input: textInput({ value: '', placeholder: 'Modulname', oninput: (e) => { draft.name = e.target.value; } }) }),
        field({ label: 'ECTS', input: textInput({ type: 'number', value: 5, min: 0, step: 1, inputmode: 'numeric', oninput: (e) => { draft.ects = e.target.value; } }) }),
        field({ label: 'Prüfungsform', input: textInput({ value: 'Klausur', oninput: (e) => { draft.exam = e.target.value; } }) })));
    },
  });
}

// ── Wahlpflichtfach ──────────────────────────────────────────────────────────

function chooseElective(uni, slot, grp, ctx) {
  return sheet({
    title: grp.label,
    leftLabel: 'Fertig',
    size: 'full',
    render: (body, close) => {
      const pick = (key) => {
        S.update(() => S.applyElective(uni, slot, key));
        ctx.rerender();
        close();
        toast(key ? 'Wahlpflichtfach gesetzt' : 'Auswahl zurückgesetzt');
      };
      fill(body,
        h('div', { class: 'notice notice-info mt' }, icon('info'), h('div', {}, grp.hint)),
        group('Zur Wahl',
          ...grp.options.map((o) => row({
            title: o.name,
            subtitle: [o.exam, o.lecturer].filter(Boolean).join(' · '),
            leading: h('span', { class: `dot ${uni.electives[slot] === o.key ? 'dot-ok' : 'dot-open'}` }),
            onclick: () => pick(o.key),
          }))),
        uni.electives[slot]
          ? group('', row({ title: 'Auswahl zurücksetzen', danger: true, onclick: () => pick(null) }))
          : null);
    },
  });
}

// ── Prognose ─────────────────────────────────────────────────────────────────

function openForecast(uni, stats, ctx) {
  return sheet({
    title: 'Notenprognose',
    leftLabel: 'Fertig',
    size: 'full',
    render: (body, close) => {
      const scaleId = uni.scale;
      const draw = () => {
        const s = G.uniStats(uni, { roundMode: S.get().settings.roundMode });
        const f = G.forecast(s, uni.target);
        let verdict;
        if (s.ectsOpen <= 0) {
          verdict = h('div', {}, 'Alle Module sind benotet — dein Schnitt steht fest.');
        } else if (!f.possible) {
          verdict = h('div', { style: { color: 'var(--red)' } },
            `Dafür wäre ein Schnitt von ${G.fmtPrecise(f.needed, scaleId)} nötig — das liegt jenseits der besten möglichen Note.`);
        } else if (f.guaranteed) {
          verdict = h('div', { style: { color: 'var(--green)' } },
            'Das Ziel erreichst du selbst dann, wenn du alle verbleibenden Module gerade so bestehst.');
        } else {
          verdict = h('div', {},
            `In den verbleibenden ${s.ectsOpen} ECTS brauchst du im Schnitt `,
            h('b', {}, G.fmtPrecise(f.needed, scaleId)), '.');
        }

        fill(body,
          h('div', { class: 'hero' },
            h('div', { style: { fontSize: '13px', color: 'var(--label-2)' } }, 'Zielnote'),
            h('div', { class: 'countdown', style: { marginTop: '6px' } }, G.fmt(uni.target, scaleId))),
          group('Ziel',
            field({
              label: 'Angestrebte Endnote',
              input: select(
                G.scale(scaleId).options.filter((o) => o.value <= 4.0).map((o) => ({ value: o.value, label: o.label })),
                uni.target,
                (v) => { S.update(() => { uni.target = Number(v); }); draw(); ctx.rerender(); },
              ),
            })),
          h('div', { class: 'card mt' },
            h('div', { class: 'card-head' }, h('h3', {}, 'Einschätzung')),
            h('div', { style: { fontSize: '15px', lineHeight: '1.45' } }, verdict)),
          group('Grundlage',
            row({ title: 'Benotet', detail: `${s.ectsGraded} ECTS` }),
            row({ title: 'Noch offen', detail: `${s.ectsOpen} ECTS` }),
            row({ title: 'Aktueller Schnitt', detail: s.average != null ? G.fmtPrecise(s.average, scaleId) : '–' })),
          footnote('Gerechnet wird mit dem ECTS-gewichteten Mittel. Anerkannte und ausgenommene Module bleiben außen vor.'));
      };
      draw();
    },
  });
}

// ── Studiengang-Info ─────────────────────────────────────────────────────────

function openProgramInfo(uni, ctx) {
  const preset = findUniPreset(uni.presetId);
  return sheet({
    title: 'Studiengang',
    leftLabel: 'Fertig',
    size: 'full',
    render: (body) => {
      const draft = { name: uni.name, institution: uni.institution, degree: uni.degree };
      fill(body,
        h('div', { class: 'hero' },
          h('div', { class: 'hero-title' }, uni.name),
          h('div', { class: 'hero-sub' }, [uni.degree, uni.institution].filter(Boolean).join(' · ')),
          uni.version ? h('div', { class: 'badge-row' }, h('span', { class: 'badge' }, uni.version)) : null),
        group('Bearbeiten',
          field({ label: 'Studiengang', input: textInput({ value: draft.name, oninput: (e) => { S.update(() => { uni.name = e.target.value; }); ctx.rerender(); } }) }),
          field({ label: 'Abschluss', input: textInput({ value: draft.degree, oninput: (e) => { S.update(() => { uni.degree = e.target.value; }); } }) }),
          field({ label: 'Hochschule', input: textInput({ value: draft.institution, oninput: (e) => { S.update(() => { uni.institution = e.target.value; }); } }) })),
        preset.facts?.length
          ? group('Eckdaten', ...preset.facts.map(([k, v]) => row({ title: k, subtitle: v })))
          : null,
        group('Semestertermine',
          ...uni.semesters.map((sem) => row({
            title: `${sem.nr}. Semester`,
            subtitle: `${sem.term === 'WS' ? 'Wintersemester' : 'Sommersemester'} ${sem.year || ''}`,
            detail: sem.start ? formatDate(sem.start, 'short') : 'Datum setzen',
            chevron: true,
            onclick: () => editSemester(sem, ctx),
          }))));
    },
  });
}

function editSemester(sem, ctx) {
  return sheet({
    title: `${sem.nr}. Semester`,
    leftLabel: 'Fertig',
    render: (body) => {
      fill(body, group('',
        field({
          label: 'Semesterart',
          input: select([{ value: 'WS', label: 'Wintersemester' }, { value: 'SS', label: 'Sommersemester' }], sem.term,
            (v) => S.update(() => { sem.term = v; })),
        }),
        field({ label: 'Jahr', input: textInput({ type: 'number', value: sem.year || '', inputmode: 'numeric', oninput: (e) => S.update(() => { sem.year = Number(e.target.value) || null; }) }) }),
        field({ label: 'Beginn', input: textInput({ type: 'date', value: sem.start || '', onchange: (e) => S.update(() => { sem.start = e.target.value || null; }) }) }),
        field({ label: 'Ende', input: textInput({ type: 'date', value: sem.end || '', onchange: (e) => S.update(() => { sem.end = e.target.value || null; }) }) })));
    },
  }).then(() => ctx.rerender());
}

// ── Schule ───────────────────────────────────────────────────────────────────

function renderSchool(p, sch, ctx) {
  const scaleId = sch.scale;
  p.setTitle('Noten');

  if (view.term >= sch.terms.length) view.term = 0;
  const term = sch.terms[view.term];
  const stats = G.termStats(term, WEIGHT_PROFILES, scaleId);

  const avg = stats.average;
  const hero = h('div', { class: 'card' },
    h('div', { style: { fontSize: '13px', color: 'var(--label-2)' } }, `${term.label} · Klasse ${sch.klasse}`),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' } },
      h('span', {
        style: {
          fontSize: '42px', fontWeight: '700', letterSpacing: '-0.035em',
          fontVariantNumeric: 'tabular-nums',
          color: avg == null ? 'var(--label-3)' : 'var(--label)',
        },
      }, avg != null ? G.fmtPrecise(avg, scaleId) : '–'),
      avg != null ? h('span', { style: { fontSize: '14px', color: 'var(--label-2)' } }, G.scale(scaleId).text(avg)) : null),
    h('div', { style: { fontSize: '13px', color: 'var(--label-2)', marginTop: '4px' } },
      stats.asNote != null
        ? `entspricht Note ${stats.asNote.toFixed(1).replace('.', ',')} · ${stats.graded} von ${stats.total} Fächern benotet`
        : `${stats.graded} von ${stats.total} Fächern benotet`));

  const termSeg = segmented(
    sch.terms.map((t, i) => ({ value: i, label: t.label })),
    view.term,
    (v) => { view.term = Number(v); ctx.rerender(); },
  );

  const subjects = term.subjects.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const rows = subjects.map((sub) => {
    const profile = WEIGHT_PROFILES[sub.profile] || WEIGHT_PROFILES.nebenfach;
    const { value } = G.subjectAverage(sub, profile);
    const count = (sub.marks || []).filter((m) => m.value != null).length;
    return row({
      title: sub.name,
      subtitle: count ? `${count} ${count === 1 ? 'Note' : 'Noten'} · ${profile.label}` : 'Noch keine Noten',
      trailing: gradePill(value, scaleId),
      chevron: true,
      onclick: () => openSubject(sub, term, scaleId, ctx),
    });
  });

  fill(p.content,
    hero,
    h('div', { class: 'mt-lg' }, termSeg),
    group('Fächer',
      ...(rows.length ? rows : [h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-sub' }, 'Noch keine Fächer.')))]),
      row({
        title: 'Fach hinzufügen',
        leading: h('div', { class: 'tile tile-tint' }, icon('plus', { weight: 2.4 })),
        tint: true,
        onclick: () => addSubject(term, ctx),
      })),
    footnote('Der Zeugnisschnitt ist das Mittel aller Fachnoten. Innerhalb eines Fachs werden schriftliche und sonstige Leistungen erst je für sich gemittelt und dann nach Profil gewichtet.'));
}

function openSubject(sub, term, scaleId, ctx) {
  return sheet({
    title: 'Fach',
    leftLabel: 'Fertig',
    size: 'full',
    render: (body, close) => {
      const draw = () => {
        const profile = WEIGHT_PROFILES[sub.profile] || WEIGHT_PROFILES.nebenfach;
        const { value, schriftlich, sonstige } = G.subjectAverage(sub, profile);
        const marks = (sub.marks || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        fill(body,
          h('div', { class: 'hero' },
            h('div', { class: 'hero-title' }, sub.name),
            sub.teacher ? h('div', { class: 'hero-sub' }, sub.teacher) : null,
            h('div', { class: 'hero-grade' }, gradePill(value, scaleId, { large: true })),
            h('div', { class: 'badge-row' },
              h('span', { class: 'badge' }, profile.label),
              schriftlich != null ? h('span', { class: 'badge' }, `schriftlich ${G.fmtPrecise(schriftlich, scaleId)}`) : null,
              sonstige != null ? h('span', { class: 'badge' }, `sonstige ${G.fmtPrecise(sonstige, scaleId)}`) : null)),

          group('Noten',
            ...(marks.length
              ? marks.map((m) => row({
                title: m.label || markKind(m.kind).label,
                subtitle: [m.date ? formatDate(m.date, 'medium') : null, m.group === 'schriftlich' ? 'schriftlich' : 'sonstige', m.weight !== 1 ? `Faktor ${m.weight}` : null].filter(Boolean).join(' · '),
                trailing: gradePill(m.value, scaleId),
                chevron: true,
                onclick: () => editMark(sub, m, scaleId, ctx, draw),
              }))
              : [h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-sub' }, 'Noch nichts eingetragen.')))]),
            row({
              title: 'Note eintragen',
              leading: h('div', { class: 'tile tile-tint' }, icon('plus', { weight: 2.4 })),
              tint: true,
              onclick: () => editMark(sub, {
                id: S.uid('mk_'), kind: 'klassenarbeit', label: '', group: 'schriftlich',
                value: null, weight: 1, date: S.today(), time: null,
              }, scaleId, ctx, draw, true),
            })),

          group('Einstellungen',
            field({
              label: 'Gewichtungsprofil',
              input: select(Object.values(WEIGHT_PROFILES).map((w) => ({ value: w.id, label: w.label })), sub.profile,
                (v) => { S.update(() => { sub.profile = v; }); draw(); ctx.rerender(); }),
              hint: 'Bestimmt, wie stark schriftliche gegenüber sonstigen Leistungen zählen.',
            }),
            field({ label: 'Lehrkraft', input: textInput({ value: sub.teacher || '', oninput: (e) => S.update(() => { sub.teacher = e.target.value; }) }) })),

          group('', row({
            title: 'Fach löschen',
            danger: true,
            leading: h('div', { class: 'tile tile-red' }, icon('trash')),
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Fach löschen?', text: `„${sub.name}" wird mit allen Noten entfernt.` });
              if (!ok) return;
              S.update(() => {
                const i = term.subjects.findIndex((x) => x.id === sub.id);
                if (i >= 0) term.subjects.splice(i, 1);
              });
              close();
              ctx.rerender();
            },
          })));
      };
      draw();
    },
  });
}

function editMark(sub, mark, scaleId, ctx, redraw, isNew = false) {
  const draft = { ...mark };
  return sheet({
    title: isNew ? 'Neue Note' : 'Note',
    leftLabel: 'Abbrechen',
    rightLabel: 'Sichern',
    size: 'full',
    onRight: (close) => {
      S.update(() => {
        Object.assign(mark, draft);
        mark.value = draft.value === '' || draft.value == null ? null : Number(draft.value);
        mark.weight = Number(draft.weight) || 1;
        mark.group = markKind(draft.kind).group;
        if (!mark.label) mark.label = markKind(draft.kind).label;
        if (isNew) (sub.marks ||= []).push(mark);
      });
      redraw();
      ctx.rerender();
      close();
    },
    render: (body, close) => {
      fill(body,
        group('',
          field({
            label: 'Art',
            input: select(MARK_KINDS.map((k) => ({ value: k.id, label: k.label })), draft.kind, (v) => { draft.kind = v; }),
          }),
          field({ label: 'Bezeichnung', input: textInput({ value: draft.label || '', placeholder: 'z. B. 2. Klassenarbeit', oninput: (e) => { draft.label = e.target.value; } }) }),
          field({
            label: 'Bewertung',
            input: select(gradeOptions(scaleId), draft.value ?? '', (v) => { draft.value = v === '' ? null : Number(v); }),
          }),
          field({
            label: 'Faktor',
            input: select([{ value: 1, label: 'Normal (×1)' }, { value: 2, label: 'Doppelt (×2)' }, { value: 0.5, label: 'Halb (×0,5)' }], draft.weight, (v) => { draft.weight = Number(v); }),
            hint: 'Für einzelne Leistungen, die stärker oder schwächer zählen.',
          }),
          field({ label: 'Datum', input: textInput({ type: 'date', value: draft.date || '', onchange: (e) => { draft.date = e.target.value || null; } }) })),
        footnote('Ein Datum ohne Note gilt als anstehende Prüfung und erscheint im Kalender.'),
        isNew
          ? null
          : group('', row({
            title: 'Note löschen',
            danger: true,
            leading: h('div', { class: 'tile tile-red' }, icon('trash')),
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Note löschen?' });
              if (!ok) return;
              S.update(() => {
                const i = sub.marks.findIndex((m) => m.id === mark.id);
                if (i >= 0) sub.marks.splice(i, 1);
              });
              redraw();
              ctx.rerender();
              close();
            },
          })));
    },
  });
}

function addSubject(term, ctx) {
  const draft = { name: '', profile: 'nebenfach' };
  return sheet({
    title: 'Neues Fach',
    rightLabel: 'Hinzufügen',
    onRight: (close) => {
      if (!draft.name.trim()) { toast('Name fehlt', { warn: true }); return; }
      S.update(() => {
        term.subjects.push({ id: S.uid('sub_'), name: draft.name.trim(), profile: draft.profile, teacher: '', marks: [] });
      });
      ctx.rerender();
      close();
    },
    render: (body) => {
      fill(body, group('',
        field({ label: 'Fach', input: textInput({ value: '', placeholder: 'z. B. Informatik', oninput: (e) => { draft.name = e.target.value; } }) }),
        field({
          label: 'Gewichtungsprofil',
          input: select(Object.values(WEIGHT_PROFILES).map((w) => ({ value: w.id, label: w.label })), draft.profile, (v) => { draft.profile = v; }),
        })));
    },
  });
}

// ── Verwaltung ───────────────────────────────────────────────────────────────

function switchRow(checked, onChange) {
  const input = h('input', { type: 'checkbox', checked, onchange: (e) => onChange(e.target.checked) });
  return h('label', { class: 'switch' }, input, h('span', { class: 'switch-track' }, h('span', { class: 'switch-knob' })));
}

async function openStudyMenu(ctx) {
  const st = S.get();
  const has = !!S.activeStudy();
  const actions = [];
  if (st.study.uni && st.study.active !== 'uni') actions.push({ id: 'uni', label: 'Zum Studium wechseln' });
  if (st.study.schule && st.study.active !== 'schule') actions.push({ id: 'schule', label: 'Zur Schule wechseln' });
  actions.push({ id: 'new', label: has ? 'Anderen Bildungsgang einrichten' : 'Einrichten' });
  if (has) actions.push({ id: 'reset', label: 'Noten zurücksetzen', destructive: true });

  const pick = await actionSheet({ title: 'Noten verwalten', actions });
  if (!pick) return;
  if (pick === 'uni' || pick === 'schule') {
    S.update((s) => { s.study.active = pick; });
    view = { semester: null, term: 0 };
    ctx.rerender();
    return;
  }
  if (pick === 'new') { ctx.openOnboarding({ studyOnly: true }); return; }
  if (pick === 'reset') {
    const ok = await confirmDialog({
      title: 'Alle Noten löschen?',
      text: 'Module und Fächer bleiben erhalten, sämtliche Bewertungen und Termine werden entfernt.',
      confirmLabel: 'Zurücksetzen',
    });
    if (!ok) return;
    S.update((s) => {
      if (s.study.uni) {
        for (const sem of s.study.uni.semesters) {
          for (const mod of sem.modules) {
            mod.status = 'offen';
            mod.statusManual = false;
            for (const part of mod.parts) { part.grade = null; part.date = null; part.time = null; part.room = ''; }
          }
        }
      }
      if (s.study.schule) for (const t of s.study.schule.terms) for (const sub of t.subjects) sub.marks = [];
    });
    ctx.rerender();
    toast('Noten zurückgesetzt');
  }
}

export { syncStatus, STATUS };
