/**
 * Zentraler Zustand mit localStorage-Persistenz.
 *
 * Ein einziger Schlüssel hält den gesamten Zustand. Das macht Backup, Import
 * und Migration trivial und ist bei dieser Datenmenge (wenige hundert KB im
 * Extremfall) unproblematisch.
 */

import { findUniPreset, PROVADIS_BIN_T } from './data/curriculum.js';
import { findSchoolPreset, WEIGHT_PROFILES } from './data/school.js';

const KEY = 'ap.state.v1';
const SCHEMA = 1;

export function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Lokales Datum als YYYY-MM-DD (nicht UTC — sonst springt der Tag abends). */
export function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() {
  return isoDate(new Date());
}

export function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysUntil(iso) {
  const d = parseDate(iso);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

const DEFAULT_LISTS = [
  { id: 'studium', name: 'Studium', color: 'blue', symbol: 'book' },
  { id: 'privat', name: 'Privat', color: 'green', symbol: 'home' },
  { id: 'arbeit', name: 'Arbeit', color: 'orange', symbol: 'case' },
];

function defaultState() {
  return {
    schema: SCHEMA,
    createdAt: new Date().toISOString(),
    onboarded: false,
    settings: {
      theme: 'system',
      accent: 'blue',
      roundMode: 'truncate1',
      weekStartsMonday: true,
      showQuote: true,
      weather: { enabled: false, lat: null, lon: null, place: '' },
      name: '',
    },
    study: {
      active: null, // 'uni' | 'schule'
      uni: null,
      schule: null,
    },
    lists: DEFAULT_LISTS.map((l) => ({ ...l })),
    tasks: [],
    events: [],
    focus: {
      config: { work: 25, short: 5, long: 15, cycle: 4 },
      sessions: [],
      timer: null,
    },
  };
}

let state = defaultState();
const listeners = new Set();
let saveTimer = null;

// ── Persistenz ───────────────────────────────────────────────────────────────

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return defaultState();
  const base = defaultState();
  const next = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings || {}) },
    study: { ...base.study, ...(raw.study || {}) },
    focus: {
      ...base.focus,
      ...(raw.focus || {}),
      config: { ...base.focus.config, ...((raw.focus || {}).config || {}) },
    },
  };
  next.settings.weather = { ...base.settings.weather, ...((raw.settings || {}).weather || {}) };
  next.lists = Array.isArray(raw.lists) && raw.lists.length ? raw.lists : base.lists;
  next.tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  next.events = Array.isArray(raw.events) ? raw.events : [];
  next.schema = SCHEMA;
  return next;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : defaultState();
  } catch (err) {
    console.warn('Zustand konnte nicht gelesen werden, starte neu.', err);
    state = defaultState();
  }
  return state;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Speichern fehlgeschlagen', err);
    document.dispatchEvent(new CustomEvent('ap:storage-error', { detail: err }));
  }
}

export function get() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Zustand ändern. `fn` mutiert den Zustand direkt; danach wird gespeichert und gerendert. */
export function update(fn) {
  fn(state);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 120);
  for (const l of listeners) l(state);
  return state;
}

/** Speichert sofort — vor Export, App-Wechsel oder Seitenverlassen. */
export function flush() {
  clearTimeout(saveTimer);
  persist();
}

export function replaceState(next) {
  state = migrate(next);
  flush();
  for (const l of listeners) l(state);
}

export function resetAll() {
  state = defaultState();
  flush();
  for (const l of listeners) l(state);
}

// ── Studiengang einrichten ───────────────────────────────────────────────────

/** Baut aus einer Curriculum-Vorlage den bearbeitbaren Studien-Zustand. */
export function buildUni(presetId, opts = {}) {
  const preset = findUniPreset(presetId);
  const startYear = opts.startYear || new Date().getFullYear();
  const startTerm = opts.startTerm || 'WS';

  const semesters = preset.semesters.map((sem, i) => {
    const { year, term } = semesterCalendar(startYear, startTerm, i);
    return {
      id: uid('sem_'),
      nr: sem.nr,
      label: `${sem.nr}. Semester`,
      term,
      year,
      start: null,
      end: null,
      modules: sem.modules.map((m) => buildModule(m)),
    };
  });

  return {
    presetId: preset.id,
    name: preset.name,
    degree: preset.degree,
    institution: preset.institution,
    version: preset.version,
    handbook: preset.handbook || null,
    scale: preset.scale,
    totalEcts: preset.totalEcts,
    regularSemesters: preset.regularSemesters,
    facts: preset.facts || [],
    electives: {},
    target: preset.scale === 'uni' ? 2.0 : null,
    startYear,
    startTerm,
    semesters,
  };
}

export function buildModule(m) {
  return {
    id: uid('mod_'),
    key: m.key || null,
    name: m.name,
    subtitle: m.subtitle || '',
    ects: m.ects ?? 5,
    lang: m.lang || '',
    wab: !!m.wab,
    offer: m.offer || '',
    exam: m.exam || '',
    lecturer: m.lecturer || '',
    page: m.page || null,
    elective: m.elective || null,
    status: 'offen', // offen | angemeldet | bestanden | nicht_bestanden | anerkannt
    excluded: false,
    note: '',
    parts: (m.parts || [{ label: 'Prüfungsleistung', weight: 100 }]).map((p) => ({
      id: uid('p_'),
      label: p.label,
      weight: p.weight,
      assumed: !!p.assumed,
      wab: !!p.wab,
      grade: null,
      date: null,
      time: null,
      room: '',
    })),
  };
}

/** Rechnet vom Startsemester aus, in welchem Jahr/Semester Fachsemester i liegt. */
function semesterCalendar(startYear, startTerm, index) {
  let term = startTerm;
  let year = startYear;
  for (let i = 0; i < index; i++) {
    if (term === 'WS') {
      term = 'SS';
      year += 1;
    } else {
      term = 'WS';
    }
  }
  return { year, term };
}

/** Setzt ein gewähltes Wahlpflichtfach in das zugehörige Modul. */
export function applyElective(uni, slot, optionKey) {
  const preset = findUniPreset(uni.presetId);
  const group = (preset.electives || {})[slot];
  if (!group) return;
  const option = group.options.find((o) => o.key === optionKey);
  for (const sem of uni.semesters) {
    for (const mod of sem.modules) {
      if (mod.elective !== slot) continue;
      if (!option) {
        mod.name = group.label;
        mod.subtitle = '';
        mod.exam = 'abhängig vom gewählten Fach';
        mod.lecturer = '';
        mod.page = null;
        continue;
      }
      mod.name = option.name;
      mod.subtitle = group.label;
      mod.exam = option.exam;
      mod.lecturer = option.lecturer || '';
      mod.lang = option.lang || mod.lang;
      mod.page = option.page || null;
      // Teilleistungen nur ersetzen, wenn noch keine Note eingetragen ist.
      const hasGrades = mod.parts.some((p) => p.grade != null);
      if (!hasGrades && option.parts) {
        mod.parts = option.parts.map((p) => ({
          id: uid('p_'),
          label: p.label,
          weight: p.weight,
          assumed: !!p.assumed,
          wab: !!p.wab,
          grade: null,
          date: null,
          time: null,
          room: '',
        }));
      }
    }
  }
  uni.electives[slot] = optionKey || null;
}

/** Baut den Schul-Zustand aus einer Vorlage. */
export function buildSchool(presetId, opts = {}) {
  const preset = findSchoolPreset(presetId);
  const klasse = opts.klasse || preset.defaultGrade;
  const chosen = opts.subjects || preset.subjectsFor(klasse).map((s) => s.name);
  const catalogue = preset.subjectsFor(klasse);

  const makeTerm = (label) => ({
    id: uid('term_'),
    label,
    subjects: catalogue
      .filter((s) => chosen.includes(s.name))
      .map((s) => ({
        id: uid('sub_'),
        name: s.name,
        profile: s.profile,
        teacher: '',
        marks: [],
      })),
  });

  return {
    presetId: preset.id,
    scale: preset.scale,
    klasse,
    year: opts.year || new Date().getFullYear(),
    activeTermIndex: 0,
    target: preset.scale === 'punkte' ? 12 : 2.0,
    terms: preset.termLabels.map((l) => makeTerm(l)),
  };
}

export function profileFor(subject) {
  return WEIGHT_PROFILES[subject.profile] || WEIGHT_PROFILES.nebenfach;
}

// ── Zugriffshelfer ───────────────────────────────────────────────────────────

export function activeStudy() {
  const s = state.study;
  if (s.active === 'uni' && s.uni) return { kind: 'uni', data: s.uni, scale: s.uni.scale };
  if (s.active === 'schule' && s.schule) return { kind: 'schule', data: s.schule, scale: s.schule.scale };
  return null;
}

export function findModule(modId) {
  const uni = state.study.uni;
  if (!uni) return null;
  for (const sem of uni.semesters) {
    const mod = sem.modules.find((m) => m.id === modId);
    if (mod) return { sem, mod };
  }
  return null;
}

export function findSubject(subId) {
  const sch = state.study.schule;
  if (!sch) return null;
  for (const term of sch.terms) {
    const sub = term.subjects.find((s) => s.id === subId);
    if (sub) return { term, sub };
  }
  return null;
}

/** Alle Prüfungstermine als Kalendereinträge (abgeleitet, nicht dupliziert). */
export function examEntries() {
  const out = [];
  const uni = state.study.uni;
  if (uni && state.study.active === 'uni') {
    for (const sem of uni.semesters) {
      for (const mod of sem.modules) {
        for (const part of mod.parts) {
          if (!part.date) continue;
          out.push({
            id: `exam_${part.id}`,
            kind: 'exam',
            title: mod.name,
            subtitle: part.label,
            date: part.date,
            time: part.time || null,
            room: part.room || '',
            moduleId: mod.id,
            partId: part.id,
            done: part.grade != null,
          });
        }
      }
    }
  }
  const sch = state.study.schule;
  if (sch && state.study.active === 'schule') {
    for (const term of sch.terms) {
      for (const sub of term.subjects) {
        for (const mark of sub.marks) {
          if (!mark.date || mark.value != null) continue;
          out.push({
            id: `exam_${mark.id}`,
            kind: 'exam',
            title: sub.name,
            subtitle: mark.label,
            date: mark.date,
            time: mark.time || null,
            room: '',
            subjectId: sub.id,
            markId: mark.id,
            done: false,
          });
        }
      }
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export { PROVADIS_BIN_T, SCHEMA, KEY };
