/**
 * Studiengangs-Vorlagen.
 *
 * Die Provadis-Vorlage ist 1:1 aus dem Modulhandbuch
 * „Curriculum des Studiengangs Bachelor Informatik Telekom, Version 2.1,
 * gültig ab Wintersemester 2024" (Stand 08.10.2024) übernommen.
 * Seitenzahlen verweisen auf das PDF unter assets/Modulhandbuch-BIN-T-v2.1.pdf.
 *
 * `parts` sind die Teilleistungen einer Modulprüfung. `weight` ist der Anteil
 * an der Modulnote in Prozent. Wo das Modulhandbuch die Gewichtung nicht
 * festlegt (v.a. bei WAB-Modulen), steht eine plausible Annahme mit `assumed: true` —
 * die App weist darauf hin und die Gewichtung ist überall editierbar.
 */

const P = (label, weight, opts = {}) => ({ label, weight, ...opts });

export const PROVADIS_BIN_T = {
  id: 'provadis-bin-t',
  name: 'Informatik Telekom',
  degree: 'B.Sc.',
  institution: 'Provadis School of International Management and Technology',
  note: 'in Kooperation mit der Deutschen Telekom AG',
  version: 'Modulhandbuch v2.1 · gültig ab WS 2024',
  handbook: 'assets/Modulhandbuch-BIN-T-v2.1.pdf',
  scale: 'uni',
  totalEcts: 180,
  regularSemesters: 6,
  // Endnote = ECTS-gewichtetes Mittel (Modulhandbuch, Punkt 9 jedes Moduls:
  // „Stellenwert der Note für die Endnote: Gewichtung entsprechend der ECTS.")
  weighting: 'ects',
  semesters: [
    {
      nr: 1, term: 'WS',
      modules: [
        {
          key: 'mathe1', name: 'Mathematik 1', subtitle: 'inkl. Vorkurs + Tutorium',
          ects: 5, lang: 'deutsch', wab: false, page: 7,
          offer: 'jedes Wintersemester',
          exam: '90-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Volker Scheidemann',
          parts: [P('Klausur (90 min)', 100)],
        },
        {
          key: 'lerntechniken', name: 'Lerntechniken und wissenschaftliches Arbeiten',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 9,
          offer: 'jedes Wintersemester',
          exam: 'Klausur (70 %) + Gruppenpräsentation (30 %)',
          lecturer: 'Prof. Dr. Marcus Frenz',
          parts: [
            P('Klausur — wissenschaftliches Arbeiten', 70),
            P('Gruppenpräsentation — Lerntechniken', 30),
          ],
        },
        {
          key: 'gdi', name: 'Grundlagen der Informatik',
          ects: 5, lang: 'deutsch', wab: false, page: 11,
          offer: 'jedes Wintersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Dr.-Ing. Florian Volk',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'programmierung', name: 'Programmierung', subtitle: 'mit WAB',
          ects: 10, lang: 'deutsch', wab: true, page: 13,
          offer: 'jedes Wintersemester',
          exam: '90-minütige Abschlussklausur sowie WAB',
          lecturer: 'Prof. Dr. Henrik Paul',
          parts: [
            P('Klausur (90 min)', 50, { assumed: true }),
            P('WAB + Kolloquium', 50, { assumed: true, wab: true }),
          ],
        },
        {
          key: 'business-english', name: 'Business English',
          ects: 5, lang: 'englisch', wab: false, page: 15,
          offer: 'jedes Wintersemester',
          exam: 'Bericht + Präsentation im Virtual Classroom (20 min)',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          parts: [
            P('Bericht', 50, { assumed: true }),
            P('Präsentation (20 min)', 50, { assumed: true }),
          ],
        },
      ],
    },
    {
      nr: 2, term: 'SS',
      modules: [
        {
          key: 'mathe2', name: 'Mathematik 2', subtitle: 'inkl. Tutorium',
          ects: 5, lang: 'deutsch', wab: false, page: 17,
          offer: 'jedes Sommersemester',
          exam: '90-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Volker Scheidemann',
          parts: [P('Klausur (90 min)', 100)],
        },
        {
          key: 'theo-inf', name: 'Theoretische Informatik',
          ects: 5, lang: 'deutsch', wab: false, page: 19,
          offer: 'jedes Sommersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Dr.-Ing. Florian Volk',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'algo-ds', name: 'Algorithmen und Datenstrukturen', subtitle: 'mit WAB',
          ects: 10, lang: 'deutsch/englisch', wab: true, page: 21,
          offer: 'jedes Sommersemester',
          exam: '60-minütige Abschlussklausur sowie WAB',
          lecturer: 'Prof. Dr. Jörg Daubert',
          parts: [
            P('Klausur (60 min)', 50, { assumed: true }),
            P('WAB + Kolloquium', 50, { assumed: true, wab: true }),
          ],
        },
        {
          key: 'fortg-prog', name: 'Fortgeschrittene Programmierung',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 23,
          offer: 'jedes Sommersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Henrik Paul',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'kommunikation', name: 'Kommunikationskompetenz',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 25,
          offer: 'jedes Sommersemester',
          exam: 'Schriftliche Ausarbeitung und Präsentation, zu gleichen Teilen',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          parts: [
            P('Schriftliche Ausarbeitung', 50),
            P('Präsentation', 50),
          ],
        },
      ],
    },
    {
      nr: 3, term: 'WS',
      modules: [
        {
          key: 'infosec', name: 'Informationssicherheit',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 27,
          offer: 'jedes Wintersemester',
          exam: '90-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Volker Scheidemann',
          parts: [P('Klausur (90 min)', 100)],
        },
        {
          key: 'datenbanken', name: 'Datenmodellierung und Datenbanken', subtitle: 'mit WAB',
          ects: 10, lang: 'deutsch/englisch', wab: true, page: 29,
          offer: 'jedes Wintersemester',
          exam: '90-minütige Abschlussklausur sowie WAB',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          parts: [
            P('Klausur (90 min)', 50, { assumed: true }),
            P('WAB + Kolloquium', 50, { assumed: true, wab: true }),
          ],
        },
        {
          key: 'netze', name: 'Netze & Verteilte Systeme',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 31,
          offer: 'jedes Wintersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'betriebssysteme', name: 'Betriebssysteme',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 33,
          offer: 'jedes Wintersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Eric Hutter',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'projektmanagement', name: 'Projektmanagement',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 35,
          offer: 'jedes Sommersemester',
          exam: 'Klausur (60 min) oder Gruppenpräsentation (45 min) — wird zu Beginn der Lehrveranstaltung bekannt gegeben',
          lecturer: 'Prof. Dr. Oliver Lade',
          parts: [P('Klausur (60 min) oder Gruppenpräsentation', 100)],
        },
      ],
    },
    {
      nr: 4, term: 'SS',
      modules: [
        {
          key: 'agiles-se', name: 'Agiles Software-Engineering und Softwaretechnik', subtitle: 'mit WAB',
          ects: 10, lang: 'deutsch/englisch', wab: true, page: 37,
          offer: 'jedes Sommersemester',
          exam: 'Softwareprodukt sowie bewertete WAB',
          lecturer: 'Prof. Dr. Marcus Frenz',
          parts: [
            P('Softwareprodukt', 50, { assumed: true }),
            P('WAB + Kolloquium', 50, { assumed: true, wab: true }),
          ],
        },
        {
          key: 'techn-inf', name: 'Technische Informatik und Rechnerarchitekturen', subtitle: 'und XaaS',
          ects: 5, lang: 'deutsch', wab: false, page: 39,
          offer: 'jedes Sommersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Dr.-Ing. Florian Volk',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'hci', name: 'Human-Computer-Interaction',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 41,
          offer: 'jedes Sommersemester',
          exam: '90-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert',
          parts: [P('Klausur (90 min)', 100)],
        },
        {
          key: 'data-analytics', name: 'Data Analytics & Big Data',
          ects: 5, lang: 'deutsch', wab: false, page: 43,
          offer: 'jedes Sommersemester',
          exam: '90-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Marcus Frenz',
          parts: [P('Klausur (90 min)', 100)],
        },
        {
          key: 'interkulturell', name: 'Interkulturelle Kompetenz und heterogene Teams',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 45,
          offer: 'jedes Sommersemester',
          exam: 'Gruppenbericht (50 %) + Gruppenpräsentation (50 %)',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          parts: [
            P('Gruppenbericht', 50),
            P('Abschlusspräsentation', 50),
          ],
        },
      ],
    },
    {
      nr: 5, term: 'WS',
      modules: [
        {
          key: 'projektpraktikum', name: 'Projektpraktikum', subtitle: 'mit WAB',
          ects: 10, lang: 'deutsch/englisch', wab: true, page: 48,
          offer: 'jedes Wintersemester',
          exam: 'Softwareprodukt inkl. Dokumentation (als WAB) + Präsentation (20 min)',
          lecturer: 'Prof. Dr. Richard Beetz',
          parts: [
            P('Softwareprodukt + WAB-Dokumentation', 50, { assumed: true, wab: true }),
            P('Präsentation (20 min)', 50, { assumed: true }),
          ],
        },
        {
          key: 'sw-arch', name: 'Software-Anwendungsarchitekturen und Microservice APIs',
          ects: 5, lang: 'deutsch', wab: false, page: 50,
          offer: 'jedes Wintersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'ml-ai', name: 'Maschinelles Lernen und Artificial Intelligence',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 52,
          offer: 'jedes Wintersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Marcus Frenz',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'bwl-itsm', name: 'Betriebswirtschaftslehre und IT-Service-Management',
          ects: 5, lang: 'deutsch', wab: false, page: 54,
          offer: 'jedes Wintersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'wpf1', name: 'Wahlpflichtfach 1', elective: 'wpf1',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 56,
          offer: 'im Wintersemester',
          exam: 'abhängig vom gewählten Fach',
          lecturer: '',
          parts: [P('Prüfungsleistung', 100)],
        },
      ],
    },
    {
      nr: 6, term: 'SS',
      modules: [
        {
          key: 'new-trends', name: 'New Trends in IT und Management der Digitalen Transformation',
          ects: 5, lang: 'deutsch', wab: false, page: 62,
          offer: 'jedes Sommersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Richard Beetz',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'recht', name: 'Recht und Datenschutz',
          ects: 5, lang: 'deutsch', wab: false, page: 64,
          offer: 'jedes Sommersemester',
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'thesis', name: 'Bachelor-Thesis',
          ects: 12, lang: 'deutsch/englisch', wab: false, page: 66,
          offer: 'jedes Semester',
          exam: 'Wissenschaftliche Abschlussarbeit',
          lecturer: 'Prof. Dr. Jörg Daubert',
          parts: [P('Thesis', 100)],
        },
        {
          key: 'kolloquium', name: 'Bachelor-Thesis Kolloquium',
          ects: 3, lang: 'deutsch/englisch', wab: false, page: 67,
          offer: 'jedes Semester',
          exam: 'Kolloquium',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          parts: [P('Kolloquium', 100)],
        },
        {
          key: 'wpf2', name: 'Wahlpflichtfach 2', elective: 'wpf2',
          ects: 5, lang: 'deutsch/englisch', wab: false, page: 69,
          offer: 'im Sommersemester',
          exam: 'abhängig vom gewählten Fach',
          lecturer: '',
          parts: [P('Prüfungsleistung', 100)],
        },
      ],
    },
  ],

  /** Wahlmöglichkeiten. Die App fragt sie bei der Einrichtung ab und schreibt
   *  Name, Prüfungsform und Dozent in das jeweilige Wahlpflicht-Modul. */
  electives: {
    wpf1: {
      label: 'Wahlpflichtfach 1',
      semester: 5,
      hint: 'Wird im 5. Semester gewählt. Welche Fächer zustande kommen, hängt von der Jahrgangsgröße ab.',
      options: [
        {
          key: 'mobile', name: 'Mobile Anwendungen', page: 56,
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert',
          lang: 'deutsch/englisch',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'tfa', name: 'Technikfolgenabschätzung', page: 58,
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          lang: 'deutsch/englisch',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'pet', name: 'Privacy Enhancement Technologies', page: 60,
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Dr. Lamya Abdullah',
          lang: 'englisch',
          parts: [P('Klausur (60 min)', 100)],
        },
      ],
    },
    wpf2: {
      label: 'Wahlpflichtfach 2',
      semester: 6,
      hint: 'Wird im 6. Semester gewählt. Es werden immer mindestens drei Module zur Wahl angeboten.',
      options: [
        {
          key: 'web', name: 'Webanwendungen', page: 69,
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert (Studiengangleiter)',
          lang: 'deutsch/englisch',
          parts: [P('Klausur (60 min)', 100)],
        },
        {
          key: 'embedded', name: 'Embedded Systems und Software', page: 71,
          exam: '60-minütige Abschlussklausur oder alternativer Leistungsnachweis',
          lecturer: 'Prof. Dr. Eric Hutter',
          lang: 'deutsch/englisch',
          parts: [P('Prüfungsleistung', 100)],
        },
        {
          key: 'resilient', name: 'Resiliente Netzwerke', page: 73,
          exam: '60-minütige Abschlussklausur',
          lecturer: 'Prof. Dr. Jörg Daubert',
          lang: 'deutsch/englisch',
          parts: [P('Klausur (60 min)', 100)],
        },
      ],
    },
  },

  /** Zusatzinfos, die die App im Studiengang-Steckbrief zeigt. */
  facts: [
    ['Regelstudienzeit', '6 Semester'],
    ['Umfang', '180 ECTS · 1 ECTS = 25 h Workload'],
    ['Aufbau je Semester', '5 Wochen Präsenz (4 Wochen Lernphase + 1 Prüfungswoche) und ca. 18 Wochen Distanzphase'],
    ['WAB', 'In den Semestern 1–5 je eine wissenschaftlich angeleitete Berufspraxis (125 h / 5 ECTS), abgeschlossen mit Kolloquium. Eine der fünf WABs ist auf Englisch zu verfassen.'],
    ['Endnote', 'ECTS-gewichteter Durchschnitt aller Modulnoten'],
    ['Englischanteil', 'ca. 25 % der Vorlesungen'],
  ],
};

/** Leere Uni-Vorlage für alle, die nicht bei Provadis studieren. */
export const BLANK_UNI = {
  id: 'blank-bachelor',
  name: 'Eigener Studiengang',
  degree: 'B.Sc.',
  institution: '',
  version: '',
  scale: 'uni',
  totalEcts: 180,
  regularSemesters: 6,
  weighting: 'ects',
  semesters: [1, 2, 3, 4, 5, 6].map((nr) => ({
    nr,
    term: nr % 2 === 1 ? 'WS' : 'SS',
    modules: [],
  })),
  electives: {},
  facts: [],
};

export const BLANK_MASTER = {
  ...BLANK_UNI,
  id: 'blank-master',
  name: 'Eigener Studiengang',
  degree: 'M.Sc.',
  totalEcts: 120,
  regularSemesters: 4,
  semesters: [1, 2, 3, 4].map((nr) => ({
    nr,
    term: nr % 2 === 1 ? 'WS' : 'SS',
    modules: [],
  })),
};

export const UNI_PRESETS = [PROVADIS_BIN_T, BLANK_UNI, BLANK_MASTER];

export function findUniPreset(id) {
  return UNI_PRESETS.find((p) => p.id === id) || BLANK_UNI;
}
