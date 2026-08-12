/**
 * Schul-Vorlagen für das deutsche Schulsystem.
 *
 * Die Gewichtung schriftlicher und sonstiger Leistungen ist Ländersache und
 * unterscheidet sich je nach Schulform und Fach. Die App bildet die zwei
 * verbreiteten Modelle ab und lässt beides pro Fach überschreiben:
 *
 *   • Sekundarstufe I — Hauptfächer (mit Klassenarbeiten): schriftlich zählt
 *     doppelt so viel wie die sonstige Mitarbeit (2 : 1).
 *   • Sekundarstufe I — Nebenfächer: schriftlich und sonstige Mitarbeit
 *     zählen gleich (1 : 1). Fächer ohne Klassenarbeiten zählen zu 100 %
 *     über die sonstige Mitarbeit.
 *   • Oberstufe — Leistungen werden in Punkten (15–0) erfasst, Klausuren und
 *     sonstige Mitarbeit je zur Hälfte (Standardfall in den meisten Ländern).
 */

/** Gewichtungsprofile: Anteil je Leistungsart in Prozent. */
export const WEIGHT_PROFILES = {
  hauptfach: { id: 'hauptfach', label: 'Hauptfach (schriftlich zählt doppelt)', schriftlich: 67, sonstige: 33 },
  nebenfach: { id: 'nebenfach', label: 'Nebenfach (50 : 50)', schriftlich: 50, sonstige: 50 },
  muendlich: { id: 'muendlich', label: 'Ohne Klassenarbeiten (100 % Mitarbeit)', schriftlich: 0, sonstige: 100 },
  oberstufe: { id: 'oberstufe', label: 'Oberstufe (Klausur 50 : Mitarbeit 50)', schriftlich: 50, sonstige: 50 },
};

/** Leistungsarten, die in einem Fach eingetragen werden können. */
export const MARK_KINDS = [
  { id: 'klassenarbeit', label: 'Klassenarbeit', short: 'KA', group: 'schriftlich' },
  { id: 'klausur', label: 'Klausur', short: 'KL', group: 'schriftlich' },
  { id: 'test', label: 'Test / Ex', short: 'Ex', group: 'sonstige' },
  { id: 'muendlich', label: 'Mündliche Note', short: 'Mdl', group: 'sonstige' },
  { id: 'referat', label: 'Referat / Präsentation', short: 'Ref', group: 'sonstige' },
  { id: 'projekt', label: 'Projekt / Praktikum', short: 'Prj', group: 'sonstige' },
  { id: 'hausaufgabe', label: 'Hausaufgabe / Heft', short: 'HA', group: 'sonstige' },
];

export function markKind(id) {
  return MARK_KINDS.find((k) => k.id === id) || MARK_KINDS[3];
}

const HF = 'hauptfach';
const NF = 'nebenfach';
const MU = 'muendlich';

const s = (name, profile = NF) => ({ name, profile });

/** Fächerkanon je Jahrgangsstufe. Bewusst breit — beim Einrichten abwählbar. */
export const SUBJECTS_BY_GRADE = {
  5: [s('Deutsch', HF), s('Mathematik', HF), s('Englisch', HF), s('Biologie'), s('Geschichte'), s('Erdkunde'), s('Kunst', MU), s('Musik', MU), s('Sport', MU), s('Religion / Ethik', MU)],
  6: [s('Deutsch', HF), s('Mathematik', HF), s('Englisch', HF), s('2. Fremdsprache', HF), s('Biologie'), s('Geschichte'), s('Erdkunde'), s('Kunst', MU), s('Musik', MU), s('Sport', MU), s('Religion / Ethik', MU)],
  7: [s('Deutsch', HF), s('Mathematik', HF), s('Englisch', HF), s('2. Fremdsprache', HF), s('Biologie'), s('Physik'), s('Geschichte'), s('Erdkunde'), s('Kunst', MU), s('Musik', MU), s('Sport', MU), s('Religion / Ethik', MU)],
  8: [s('Deutsch', HF), s('Mathematik', HF), s('Englisch', HF), s('2. Fremdsprache', HF), s('Biologie'), s('Physik'), s('Chemie'), s('Geschichte'), s('Erdkunde'), s('Politik / Wirtschaft'), s('Informatik'), s('Kunst', MU), s('Musik', MU), s('Sport', MU), s('Religion / Ethik', MU)],
  9: [s('Deutsch', HF), s('Mathematik', HF), s('Englisch', HF), s('2. Fremdsprache', HF), s('Biologie'), s('Physik'), s('Chemie'), s('Geschichte'), s('Erdkunde'), s('Politik / Wirtschaft'), s('Informatik'), s('Kunst', MU), s('Musik', MU), s('Sport', MU), s('Religion / Ethik', MU)],
  10: [s('Deutsch', HF), s('Mathematik', HF), s('Englisch', HF), s('2. Fremdsprache', HF), s('Biologie'), s('Physik'), s('Chemie'), s('Geschichte'), s('Erdkunde'), s('Politik / Wirtschaft'), s('Informatik'), s('Kunst', MU), s('Musik', MU), s('Sport', MU), s('Religion / Ethik', MU)],
};

const OB = 'oberstufe';
const o = (name) => ({ name, profile: OB });

export const SUBJECTS_OBERSTUFE = [
  o('Deutsch'), o('Mathematik'), o('Englisch'), o('2. Fremdsprache'),
  o('Biologie'), o('Physik'), o('Chemie'), o('Informatik'),
  o('Geschichte'), o('Politik / Wirtschaft'), o('Erdkunde'),
  o('Kunst'), o('Musik'), o('Sport'), o('Religion / Ethik'),
];

export const SCHOOL_PRESETS = [
  {
    id: 'sek1',
    label: 'Sekundarstufe I',
    sub: 'Klasse 5–10 · Noten 1–6 mit Tendenz',
    scale: 'schule',
    grades: [5, 6, 7, 8, 9, 10],
    defaultGrade: 9,
    termLabels: ['1. Halbjahr', '2. Halbjahr'],
    subjectsFor: (klasse) => SUBJECTS_BY_GRADE[klasse] || SUBJECTS_BY_GRADE[9],
  },
  {
    id: 'oberstufe',
    label: 'Oberstufe',
    sub: 'Klasse 11–13 · Punkte 15–0',
    scale: 'punkte',
    grades: [11, 12, 13],
    defaultGrade: 11,
    termLabels: ['1. Halbjahr', '2. Halbjahr'],
    subjectsFor: () => SUBJECTS_OBERSTUFE,
  },
];

export function findSchoolPreset(id) {
  return SCHOOL_PRESETS.find((p) => p.id === id) || SCHOOL_PRESETS[0];
}
