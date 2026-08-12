/**
 * Einrichtung — führt in wenigen Schritten zum fertig ausgefüllten Notentracker.
 */

import {
  h, icon, group, row, footnote, button, toast, field, textInput, select, clear,
} from '../ui.js';
import { fill } from '../page.js';
import * as S from '../store.js';
import { PROVADIS_BIN_T, UNI_PRESETS } from '../data/curriculum.js';
import { SCHOOL_PRESETS, findSchoolPreset } from '../data/school.js';

export function open(ctx, opts = {}) {
  const host = document.getElementById('onboard');
  host.hidden = false;
  document.body.classList.add('modal-open');

  const draft = {
    step: opts.studyOnly ? 'kind' : 'welcome',
    kind: null,          // 'uni' | 'schule'
    presetId: PROVADIS_BIN_T.id,
    startYear: defaultStartYear(),
    startTerm: 'WS',
    electives: {},
    schoolPreset: 'sek1',
    klasse: null,
    subjects: null,
    name: S.get().settings.name || '',
    studyOnly: !!opts.studyOnly,
  };

  const scroll = h('div', { class: 'onboard-scroll' });
  const foot = h('div', { class: 'onboard-foot' });
  fill(host, h('div', { class: 'onboard' }, scroll, foot));

  const close = () => {
    host.hidden = true;
    clear(host);
    document.body.classList.remove('modal-open');
    ctx.rerender();
  };

  const go = (step) => { draft.step = step; draw(); scroll.scrollTop = 0; };

  function draw() {
    clear(scroll);
    clear(foot);
    STEPS[draft.step](scroll, foot, draft, { go, close, ctx });
  }

  draw();
}

function defaultStartYear() {
  const now = new Date();
  // Vor April gehört man noch zum Wintersemester des Vorjahres.
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

const STEPS = {
  welcome(scroll, foot, draft, nav) {
    scroll.append(
      h('div', { class: 'onboard-hero' },
        h('div', { class: 'onboard-mark' }, icon('flame', { weight: 1.6 })),
        h('h1', { class: 'onboard-title' }, 'Anti Procrastinator'),
        h('p', { class: 'onboard-text' },
          'Noten, Prüfungstermine, Aufgaben und Fokuszeit an einem Ort. Alles bleibt auf deinem Gerät — kein Konto, kein Server.')),
      group('',
        row({ title: 'Notentracker', subtitle: 'Module und Prüfungsleistungen, Schnitt wird automatisch berechnet', leading: h('div', { class: 'tile tile-blue' }, icon('grades')) }),
        row({ title: 'Prüfungen & Termine', subtitle: 'Countdown, Kalender, Export nach Apple Kalender', leading: h('div', { class: 'tile tile-red' }, icon('calendar')) }),
        row({ title: 'Aufgaben & Fokus', subtitle: 'Listen mit Fälligkeiten und ein Timer, der nicht driftet', leading: h('div', { class: 'tile tile-green' }, icon('tasks')) })),
      group('Optional',
        field({
          label: 'Dein Name',
          input: textInput({ value: draft.name, placeholder: 'Vorname', oninput: (e) => { draft.name = e.target.value; } }),
          hint: 'Nur für die Begrüßung. Kannst du überspringen.',
        })));

    foot.append(button('Los geht’s', {
      variant: 'filled', class: 'btn-block',
      onclick: () => {
        S.update((s) => { s.settings.name = draft.name.trim().slice(0, 30); });
        nav.go('kind');
      },
    }));
  },

  kind(scroll, foot, draft, nav) {
    scroll.append(
      h('div', { class: 'onboard-hero' },
        h('h1', { class: 'onboard-title' }, 'Was trackst du?'),
        h('p', { class: 'onboard-text' }, 'Danach richtet sich, wie Noten berechnet werden.')),
      h('div', { class: 'list' },
        pick('Studium', 'Module mit ECTS · Noten 1,0 – 5,0 · Endnote ECTS-gewichtet', draft.kind === 'uni', () => { draft.kind = 'uni'; nav.go('program'); }),
        pick('Schule', 'Fächer mit Klassenarbeiten und Mitarbeit · Noten 1 – 6 oder Punkte 15 – 0', draft.kind === 'schule', () => { draft.kind = 'schule'; nav.go('school'); })),
      footnote('Beides lässt sich später einrichten und umschalten.'));

    if (!draft.studyOnly) {
      foot.append(button('Zurück', { variant: 'gray', class: 'btn-block', onclick: () => nav.go('welcome') }));
    } else {
      foot.append(button('Abbrechen', { variant: 'gray', class: 'btn-block', onclick: nav.close }));
    }
  },

  program(scroll, foot, draft, nav) {
    scroll.append(
      h('div', { class: 'onboard-hero' },
        h('h1', { class: 'onboard-title' }, 'Studiengang'),
        h('p', { class: 'onboard-text' }, 'Bei Provadis sind alle Module, ECTS und Prüfungsformen aus dem Modulhandbuch schon hinterlegt.')),
      h('div', { class: 'list' },
        ...UNI_PRESETS.map((p) => pick(
          p.id === PROVADIS_BIN_T.id ? `${p.name} ${p.degree}` : `${p.name} (${p.degree})`,
          p.id === PROVADIS_BIN_T.id
            ? `${p.institution} · ${p.semesters.reduce((n, s) => n + s.modules.length, 0)} Module · ${p.totalEcts} ECTS · fertig ausgefüllt`
            : `${p.regularSemesters} Semester · ${p.totalEcts} ECTS · Module selbst eintragen`,
          draft.presetId === p.id,
          () => { draft.presetId = p.id; nav.go('program'); },
        ))),
      group('Studienbeginn',
        field({
          label: 'Erstes Semester',
          input: select([{ value: 'WS', label: 'Wintersemester' }, { value: 'SS', label: 'Sommersemester' }], draft.startTerm,
            (v) => { draft.startTerm = v; }),
        }),
        field({
          label: 'Jahr',
          input: select(
            Array.from({ length: 9 }, (_, i) => defaultStartYear() - 6 + i).map((y) => ({ value: y, label: String(y) })),
            draft.startYear, (v) => { draft.startYear = Number(v); },
          ),
          hint: 'Daraus ergibt sich, welches Semester gerade läuft.',
        })));

    foot.append(
      button('Zurück', { variant: 'gray', onclick: () => nav.go('kind') }),
      button('Weiter', {
        variant: 'filled', class: 'btn-block',
        onclick: () => {
          const preset = UNI_PRESETS.find((p) => p.id === draft.presetId);
          if (preset?.electives && Object.keys(preset.electives).length) nav.go('electives');
          else finishUni(draft, nav);
        },
      }));
  },

  electives(scroll, foot, draft, nav) {
    const preset = UNI_PRESETS.find((p) => p.id === draft.presetId);
    scroll.append(
      h('div', { class: 'onboard-hero' },
        h('h1', { class: 'onboard-title' }, 'Wahlpflichtfächer'),
        h('p', { class: 'onboard-text' }, 'Noch nicht klar? Einfach überspringen — du kannst es jederzeit in den Noten festlegen.')));

    for (const [slot, grp] of Object.entries(preset.electives)) {
      scroll.append(
        group(`${grp.label} · ${grp.semester}. Semester`,
          ...grp.options.map((o) => pick(o.name, [o.exam, o.lecturer].filter(Boolean).join(' · '),
            draft.electives[slot] === o.key,
            () => {
              draft.electives[slot] = draft.electives[slot] === o.key ? null : o.key;
              nav.go('electives');
            }))));
    }

    foot.append(
      button('Zurück', { variant: 'gray', onclick: () => nav.go('program') }),
      button('Fertig', { variant: 'filled', class: 'btn-block', onclick: () => finishUni(draft, nav) }));
  },

  school(scroll, foot, draft, nav) {
    const preset = findSchoolPreset(draft.schoolPreset);
    if (draft.klasse == null || !preset.grades.includes(draft.klasse)) draft.klasse = preset.defaultGrade;
    const catalogue = preset.subjectsFor(draft.klasse);
    if (draft.subjects == null) draft.subjects = catalogue.map((s) => s.name);

    scroll.append(
      h('div', { class: 'onboard-hero' },
        h('h1', { class: 'onboard-title' }, 'Deine Klasse'),
        h('p', { class: 'onboard-text' }, 'In der Oberstufe wird in Punkten gerechnet, davor in Noten von 1 bis 6.')),
      h('div', { class: 'list' },
        ...SCHOOL_PRESETS.map((p) => pick(p.label, p.sub, draft.schoolPreset === p.id, () => {
          draft.schoolPreset = p.id;
          draft.klasse = p.defaultGrade;
          draft.subjects = null;
          nav.go('school');
        }))),
      group('Jahrgangsstufe',
        field({
          label: 'Klasse',
          input: select(preset.grades.map((g) => ({ value: g, label: `Klasse ${g}` })), draft.klasse, (v) => {
            draft.klasse = Number(v);
            draft.subjects = null;
            nav.go('school');
          }),
        })),
      group('Fächer',
        ...catalogue.map((s) => {
          const on = draft.subjects.includes(s.name);
          return pick(s.name, null, on, () => {
            draft.subjects = on ? draft.subjects.filter((n) => n !== s.name) : [...draft.subjects, s.name];
            nav.go('school');
          });
        })),
      footnote('Fächer lassen sich später jederzeit ergänzen oder entfernen.'));

    foot.append(
      button('Zurück', { variant: 'gray', onclick: () => nav.go('kind') }),
      button('Fertig', {
        variant: 'filled', class: 'btn-block',
        onclick: () => {
          if (!draft.subjects.length) { toast('Mindestens ein Fach wählen', { warn: true }); return; }
          S.update((s) => {
            s.study.schule = S.buildSchool(draft.schoolPreset, { klasse: draft.klasse, subjects: draft.subjects });
            s.study.active = 'schule';
            s.onboarded = true;
          });
          toast('Notentracker eingerichtet');
          nav.close();
        },
      }));
  },
};

function finishUni(draft, nav) {
  S.update((s) => {
    const uni = S.buildUni(draft.presetId, { startYear: draft.startYear, startTerm: draft.startTerm });
    for (const [slot, key] of Object.entries(draft.electives)) {
      if (key) S.applyElective(uni, slot, key);
    }
    s.study.uni = uni;
    s.study.active = 'uni';
    s.onboarded = true;
  });
  toast('Notentracker eingerichtet');
  nav.close();
}

function pick(title, sub, on, onclick) {
  return h('button', { class: `pick${on ? ' pick-on' : ''}`, type: 'button', onclick },
    h('div', { class: 'pick-main' },
      h('div', { class: 'pick-title' }, title),
      sub ? h('div', { class: 'pick-sub' }, sub) : null),
    h('span', { class: 'pick-check' }, icon('check', { weight: 3 })));
}
