/**
 * Notenlogik: Skalen, Gewichtung, Durchschnitte, Prognose.
 *
 * Alles Rechnen passiert auf einem numerischen `value`. Wie dieser Wert
 * angezeigt und eingegeben wird, bestimmt die Skala.
 */

const dec = (v, n = 2) => v.toFixed(n).replace('.', ',');

/** Deutsche Note 1,0–5,0 (Hochschule). */
const UNI = {
  id: 'uni',
  label: 'Note 1,0 – 5,0',
  better: 'lower',
  best: 1.0,
  worst: 5.0,
  passMax: 4.0,
  options: [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0].map((v) => ({
    value: v,
    label: dec(v, 1),
  })),
  format: (v) => dec(v, 1),
  formatPrecise: (v) => dec(v, 2),
  passed: (v) => v <= 4.0 + 1e-9,
  text(v) {
    if (v <= 1.5) return 'sehr gut';
    if (v <= 2.5) return 'gut';
    if (v <= 3.5) return 'befriedigend';
    if (v <= 4.0) return 'ausreichend';
    return 'nicht ausreichend';
  },
};

/** Schulnote 1–6 mit Tendenz (Viertelnoten-Konvention: 1- = 1,25 · 2+ = 1,75). */
const SCHULE = {
  id: 'schule',
  label: 'Note 1 – 6',
  better: 'lower',
  best: 1.0,
  worst: 6.0,
  passMax: 4.0,
  options: (() => {
    const out = [];
    for (let n = 1; n <= 6; n++) {
      if (n < 6) out.push({ value: n - 0.25, label: `${n}+` });
      out.push({ value: n, label: `${n}` });
      if (n < 6) out.push({ value: n + 0.25, label: `${n}-` });
    }
    return out;
  })(),
  format: (v) => dec(v, 2),
  formatPrecise: (v) => dec(v, 2),
  passed: (v) => v <= 4.49,
  text(v) {
    if (v < 1.5) return 'sehr gut';
    if (v < 2.5) return 'gut';
    if (v < 3.5) return 'befriedigend';
    if (v < 4.5) return 'ausreichend';
    if (v < 5.5) return 'mangelhaft';
    return 'ungenügend';
  },
};

/** Oberstufen-Punkte 15–0 (mehr ist besser). */
const PUNKTE = {
  id: 'punkte',
  label: 'Punkte 15 – 0',
  better: 'higher',
  best: 15,
  worst: 0,
  passMin: 5,
  options: Array.from({ length: 16 }, (_, i) => 15 - i).map((v) => ({
    value: v,
    label: `${v}`,
  })),
  format: (v) => (Number.isInteger(v) ? `${v}` : dec(v, 1)),
  formatPrecise: (v) => (Number.isInteger(v) ? `${v}` : dec(v, 1)),
  passed: (v) => v >= 5,
  text(v) {
    if (v >= 13) return 'sehr gut';
    if (v >= 10) return 'gut';
    if (v >= 7) return 'befriedigend';
    if (v >= 5) return 'ausreichend';
    if (v >= 1) return 'mangelhaft';
    return 'ungenügend';
  },
  /** Übliche Umrechnung Durchschnittspunkte → Note. 14 P ≙ 1,0 · 11 P ≙ 2,0 · 5 P ≙ 4,0 */
  toNote(v) {
    return Math.min(6, Math.max(1, (17 - v) / 3));
  },
};

const SCALES = { uni: UNI, schule: SCHULE, punkte: PUNKTE };

export function scale(id) {
  return SCALES[id] || UNI;
}

/** Kürzel für die Bewertung, z. B. „1,7" oder „12". */
export function fmt(value, scaleId) {
  if (value == null || Number.isNaN(value)) return '–';
  return scale(scaleId).format(value);
}

export function fmtPrecise(value, scaleId) {
  if (value == null || Number.isNaN(value)) return '–';
  return scale(scaleId).formatPrecise(value);
}

/** Nächstliegende offizielle Stufe der Skala. */
export function snap(value, scaleId) {
  if (value == null) return null;
  const opts = scale(scaleId).options;
  let best = opts[0];
  for (const o of opts) {
    if (Math.abs(o.value - value) < Math.abs(best.value - value)) best = o;
  }
  return best.value;
}

/** Ist der Wert eine bestandene Leistung? */
export function isPass(value, scaleId) {
  if (value == null) return false;
  return scale(scaleId).passed(value);
}

/**
 * Rundungsmodus für angezeigte Endnoten.
 *  truncate1 — auf eine Nachkommastelle abgeschnitten (an Hochschulen üblich)
 *  round1    — kaufmännisch auf eine Nachkommastelle
 *  exact     — zwei Nachkommastellen
 */
export function applyRounding(value, mode) {
  if (value == null) return null;
  if (mode === 'round1') return Math.round(value * 10) / 10;
  if (mode === 'exact') return Math.round(value * 100) / 100;
  return Math.floor(value * 10 + 1e-9) / 10;
}

// ── Modulnote aus Teilleistungen ─────────────────────────────────────────────

/**
 * Note eines Moduls / Fachs aus seinen Teilleistungen.
 * Berücksichtigt nur Teilleistungen mit eingetragener Note.
 * Gibt zusätzlich zurück, wie viel Prozent der Prüfung schon bewertet ist.
 */
export function partsAverage(parts) {
  let sum = 0;
  let weight = 0;
  let openWeight = 0;
  for (const p of parts || []) {
    const w = Number(p.weight) || 0;
    if (p.grade == null) {
      openWeight += w;
      continue;
    }
    sum += Number(p.grade) * w;
    weight += w;
  }
  return {
    value: weight > 0 ? sum / weight : null,
    doneWeight: weight,
    openWeight,
    complete: weight > 0 && openWeight === 0,
  };
}

/** Modulnote inkl. Status-Sonderfällen. */
export function moduleGrade(mod) {
  if (mod.status === 'anerkannt') return { value: null, doneWeight: 0, openWeight: 0, complete: true, recognised: true };
  return partsAverage(mod.parts);
}

/** Zählt das Modul in den Notenschnitt? */
export function countsToAverage(mod) {
  if (mod.excluded) return false;
  if (mod.status === 'anerkannt') return false;
  return true;
}

// ── Studien-Statistik ────────────────────────────────────────────────────────

/**
 * Gesamtauswertung eines Studiengangs.
 * Der Schnitt ist das ECTS-gewichtete Mittel aller benoteten Module
 * („Gewichtung entsprechend der ECTS", Modulhandbuch Punkt 9).
 */
export function uniStats(uni, opts = {}) {
  const roundMode = opts.roundMode || 'truncate1';
  let ectsTotal = 0;
  let ectsDone = 0;
  let ectsGraded = 0;
  let ectsOpen = 0;
  let sum = 0;
  let modulesTotal = 0;
  let modulesDone = 0;
  let failed = 0;

  for (const sem of uni.semesters || []) {
    for (const mod of sem.modules || []) {
      const ects = Number(mod.ects) || 0;
      ectsTotal += ects;
      modulesTotal++;
      const g = moduleGrade(mod);
      const passed = mod.status === 'bestanden' || mod.status === 'anerkannt';
      if (passed) {
        ectsDone += ects;
        modulesDone++;
      }
      if (mod.status === 'nicht_bestanden') failed++;
      if (countsToAverage(mod) && g.value != null && g.complete) {
        sum += g.value * ects;
        ectsGraded += ects;
      } else if (countsToAverage(mod)) {
        ectsOpen += ects;
      }
    }
  }

  const raw = ectsGraded > 0 ? sum / ectsGraded : null;
  return {
    ectsTotal,
    ectsDone,
    ectsGraded,
    ectsOpen,
    modulesTotal,
    modulesDone,
    failed,
    average: raw,
    averageRounded: applyRounding(raw, roundMode),
    weightedSum: sum,
    progress: ectsTotal > 0 ? ectsDone / ectsTotal : 0,
  };
}

export function semesterStats(sem, opts = {}) {
  return uniStats({ semesters: [sem] }, opts);
}

/**
 * Was muss im Rest im Schnitt erreicht werden, um `target` zu schaffen?
 * Rechnet auf ECTS-Basis: (target · (G + R) − S) / R
 */
export function forecast(stats, target) {
  const { ectsGraded: G, ectsOpen: R, weightedSum: S } = stats;
  if (R <= 0) return { possible: false, reason: 'done', needed: null };
  const needed = (target * (G + R) - S) / R;
  const best = 1.0;
  const worst = 4.0;
  return {
    possible: needed >= best - 1e-9,
    guaranteed: needed >= worst - 1e-9,
    needed,
    remainingEcts: R,
  };
}

// ── Schul-Statistik ──────────────────────────────────────────────────────────

/**
 * Fachnote aus Einzelleistungen. Schriftliche und sonstige Leistungen werden
 * zuerst je für sich gemittelt und dann nach Profil gewichtet — so ändert eine
 * einzelne zusätzliche mündliche Note den Schnitt nicht überproportional.
 */
export function subjectAverage(subject, profile) {
  const groups = { schriftlich: [], sonstige: [] };
  for (const m of subject.marks || []) {
    if (m.value == null) continue;
    const g = m.group === 'schriftlich' ? 'schriftlich' : 'sonstige';
    groups[g].push({ value: Number(m.value), weight: Number(m.weight) || 1 });
  }

  const mean = (arr) => {
    if (!arr.length) return null;
    let s = 0;
    let w = 0;
    for (const x of arr) {
      s += x.value * x.weight;
      w += x.weight;
    }
    return w > 0 ? s / w : null;
  };

  const schriftlich = mean(groups.schriftlich);
  const sonstige = mean(groups.sonstige);

  let ws = profile.schriftlich;
  let wo = profile.sonstige;
  // Fehlende Gruppe: die vorhandene trägt allein.
  if (schriftlich == null) ws = 0;
  if (sonstige == null) wo = 0;
  const total = ws + wo;
  if (total === 0) return { value: null, schriftlich, sonstige };

  const value = ((schriftlich ?? 0) * ws + (sonstige ?? 0) * wo) / total;
  return { value, schriftlich, sonstige };
}

/** Schnitt über alle Fächer eines Halbjahres (ungewichtet, wie im Zeugnis). */
export function termStats(term, profiles, scaleId) {
  let sum = 0;
  let count = 0;
  let total = 0;
  for (const sub of term.subjects || []) {
    total++;
    const profile = profiles[sub.profile] || profiles.nebenfach;
    const { value } = subjectAverage(sub, profile);
    if (value != null) {
      sum += value;
      count++;
    }
  }
  const average = count > 0 ? sum / count : null;
  const out = { average, graded: count, total };
  if (scaleId === 'punkte' && average != null) out.asNote = PUNKTE.toNote(average);
  return out;
}

export { UNI, SCHULE, PUNKTE };
