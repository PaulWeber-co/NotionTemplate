/**
 * MODEL — Datenlogik & localStorage-Persistenz
 */
const Model = {
  STORAGE_KEYS: {
    todos: 'ht_todos',
    theme: 'ht_theme',
    weather: 'ht_weather',
    weatherTime: 'ht_weather_time',
    grades: 'ht_grades',
    customNames: 'ht_custom_names',
  },

  // ── To-Do Daten ──

  getTodos() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.todos) || '[]');
  },

  saveTodos(todos) {
    localStorage.setItem(this.STORAGE_KEYS.todos, JSON.stringify(todos));
  },

  addTodo(text, date, category, points) {
    const todos = this.getTodos();
    const todo = {
      id: this._uid(),
      text,
      date: date || null,
      category,
      points: parseInt(points) || 1,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    todos.push(todo);
    this.saveTodos(todos);
    return todo;
  },

  toggleTodo(id) {
    const todos = this.getTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveTodos(todos);
    }
    return todos;
  },

  deleteTodo(id) {
    const todos = this.getTodos().filter(t => t.id !== id);
    this.saveTodos(todos);
    return todos;
  },

  // ── Filter ──

  getFilteredTodos(filter, selectedDate) {
    let list = this.getTodos();

    if (selectedDate) {
      list = list.filter(t => t.date === selectedDate);
    }

    switch (filter) {
      case 'today':
        list = list.filter(t => t.date === this.todayStr());
        break;
      case 'open':
        list = list.filter(t => !t.completed);
        break;
      case 'done':
        list = list.filter(t => t.completed);
        break;
    }

    return list.sort((a, b) => a.completed - b.completed || new Date(b.createdAt) - new Date(a.createdAt));
  },

  // ── Statistiken ──

  getStats() {
    const todos = this.getTodos();
    const total = todos.length;
    const done = todos.filter(t => t.completed).length;
    const open = total - done;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    const totalPoints = todos.reduce((sum, t) => sum + (t.points || 1), 0);
    const earnedPoints = todos.filter(t => t.completed).reduce((sum, t) => sum + (t.points || 1), 0);
    return { total, done, open, rate, totalPoints, earnedPoints };
  },

  getWeeklyData() {
    const todos = this.getTodos();
    const labels = [];
    const completionData = [];
    const pointsData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('de-DE', { weekday: 'short' });
      labels.push(dayLabel);

      const dayTodos = todos.filter(t => t.date === dateStr);
      const completed = dayTodos.filter(t => t.completed).length;
      const total = dayTodos.length;
      completionData.push(total > 0 ? Math.round((completed / total) * 100) : 0);

      const dayPoints = dayTodos.filter(t => t.completed).reduce((sum, t) => sum + (t.points || 1), 0);
      pointsData.push(dayPoints);
    }

    return { labels, completionData, pointsData };
  },

  getMonthlyData() {
    const todos = this.getTodos();
    const labels = [];
    const completionData = [];
    const pointsData = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.getDate() + '.' + (d.getMonth() + 1);
      labels.push(dayLabel);

      const dayTodos = todos.filter(t => t.date === dateStr);
      const completed = dayTodos.filter(t => t.completed).length;
      const total = dayTodos.length;
      completionData.push(total > 0 ? Math.round((completed / total) * 100) : 0);

      const dayPoints = dayTodos.filter(t => t.completed).reduce((sum, t) => sum + (t.points || 1), 0);
      pointsData.push(dayPoints);
    }

    return { labels, completionData, pointsData };
  },

  getYearlyData() {
    const todos = this.getTodos();
    const labels = [];
    const completionData = [];
    const pointsData = [];
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      labels.push(monthNames[month]);

      const monthTodos = todos.filter(t => {
        if (!t.date) return false;
        const td = new Date(t.date + 'T00:00:00');
        return td.getFullYear() === year && td.getMonth() === month;
      });

      const completed = monthTodos.filter(t => t.completed).length;
      const total = monthTodos.length;
      completionData.push(total > 0 ? Math.round((completed / total) * 100) : 0);

      const monthPoints = monthTodos.filter(t => t.completed).reduce((sum, t) => sum + (t.points || 1), 0);
      pointsData.push(monthPoints);
    }

    return { labels, completionData, pointsData };
  },

  getChartData(range) {
    switch (range) {
      case 'month': return this.getMonthlyData();
      case 'year': return this.getYearlyData();
      default: return this.getWeeklyData();
    }
  },

  // ── ICS Import ──

  parseICS(icsText) {
    const events = [];
    const vevents = icsText.split('BEGIN:VEVENT');

    for (let i = 1; i < vevents.length; i++) {
      const block = vevents[i].split('END:VEVENT')[0];
      const summary = this._icsField(block, 'SUMMARY');
      const dtstart = this._icsField(block, 'DTSTART');
      const description = this._icsField(block, 'DESCRIPTION');

      if (summary && dtstart) {
        const date = this._icsParseDate(dtstart);
        if (date) {
          events.push({
            text: summary.replace(/\\n/g, ' ').replace(/\\,/g, ','),
            date: date,
            description: description || '',
          });
        }
      }
    }
    return events;
  },

  _icsField(block, field) {
    // Handle folded lines and various field formats (DTSTART;VALUE=DATE:, DTSTART:, etc.)
    const regex = new RegExp('(?:^|\\n)' + field + '[^:]*:([^\\r\\n]+)', 'i');
    const match = block.match(regex);
    return match ? match[1].trim() : null;
  },

  _icsParseDate(dtStr) {
    // Formats: 20260305, 20260305T120000, 20260305T120000Z
    const clean = dtStr.replace(/[^0-9T]/g, '');
    if (clean.length >= 8) {
      const y = clean.substring(0, 4);
      const m = clean.substring(4, 6);
      const d = clean.substring(6, 8);
      return y + '-' + m + '-' + d;
    }
    return null;
  },

  importICSEvents(events) {
    let imported = 0;
    events.forEach(ev => {
      this.addTodo(ev.text, ev.date, 'arbeit', 1);
      imported++;
    });
    return imported;
  },

  getCategoryData() {
    const todos = this.getTodos();
    const counts = { arbeit: 0, persoenlich: 0, gesundheit: 0, lernen: 0 };
    todos.forEach(t => {
      if (counts.hasOwnProperty(t.category)) counts[t.category]++;
    });
    return counts;
  },

  getTasksByDate() {
    const todos = this.getTodos();
    const map = {};
    todos.forEach(t => {
      if (t.date) {
        if (!map[t.date]) map[t.date] = [];
        map[t.date].push(t);
      }
    });
    return map;
  },

  // ── Theme ──

  getTheme() {
    return localStorage.getItem(this.STORAGE_KEYS.theme) || 'light';
  },

  setTheme(theme) {
    localStorage.setItem(this.STORAGE_KEYS.theme, theme);
  },

  // ── Wetter (Cache) ──

  getCachedWeather() {
    const cached = localStorage.getItem(this.STORAGE_KEYS.weather);
    const cachedTime = localStorage.getItem(this.STORAGE_KEYS.weatherTime);
    if (cached && cachedTime && (Date.now() - parseInt(cachedTime)) < 1800000) {
      return JSON.parse(cached);
    }
    return null;
  },

  cacheWeather(data) {
    localStorage.setItem(this.STORAGE_KEYS.weather, JSON.stringify(data));
    localStorage.setItem(this.STORAGE_KEYS.weatherTime, Date.now().toString());
  },

  // ── Hilfsfunktionen ──

  todayStr() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  },

  _uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // ── Studienplan ──

  STUDIENPLAN: [
    {
      semester: 1,
      modules: [
        { id: 's1_mathe1', name: 'Mathematik 1', ects: 5, pruefung: '90-min Klausur', wab: false, verantwortlich: 'Prof. Dr. Volker Scheidemann' },
        { id: 's1_lerntechniken', name: 'Lerntechniken und wissenschaftliches Arbeiten', ects: 5, pruefung: 'Klausur (70%) + Gruppenpräsentation (30%)', wab: false, verantwortlich: 'Prof. Dr. Marcus Frenz' },
        { id: 's1_gdi', name: 'Grundlagen der Informatik', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's1_prog', name: 'Programmierung', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's1_prog_wab', name: 'Programmierung WAB', ects: 5, pruefung: 'Präsentation/Kolloquium', wab: false, isWab: true, parentId: 's1_prog' },
        { id: 's1_english', name: 'Business English', ects: 5, pruefung: 'Klausur / mündliche Prüfung', wab: false },
      ],
    },
    {
      semester: 2,
      modules: [
        { id: 's2_mathe2', name: 'Mathematik 2', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's2_theo', name: 'Theoretische Informatik', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's2_algo', name: 'Algorithmen und Datenstrukturen', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's2_algo_wab', name: 'Algorithmen und Datenstrukturen WAB', ects: 5, pruefung: 'WAB Kolloquium', wab: false, isWab: true, parentId: 's2_algo' },
        { id: 's2_fortprog', name: 'Fortgeschrittene Programmierung', ects: 5, pruefung: 'Klausur / Programmierprojekt', wab: false },
        { id: 's2_komm', name: 'Kommunikationskompetenz', ects: 5, pruefung: 'Präsentation / Projektarbeit', wab: false },
      ],
    },
    {
      semester: 3,
      modules: [
        { id: 's3_infosec', name: 'Informationssicherheit', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's3_datenbank', name: 'Datenmodellierung und Datenbanken', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's3_datenbank_wab', name: 'Datenmodellierung und Datenbanken WAB', ects: 5, pruefung: 'WAB Kolloquium', wab: false, isWab: true, parentId: 's3_datenbank' },
        { id: 's3_netze', name: 'Netze und Verteilte Systeme', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's3_bs', name: 'Betriebssysteme', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's3_pm', name: 'Projektmanagement', ects: 5, pruefung: 'Projektarbeit / Präsentation', wab: false },
      ],
    },
    {
      semester: 4,
      modules: [
        { id: 's4_sweng', name: 'Agiles Software-Engineering und Softwaretechnik', ects: 5, pruefung: 'Projekt', wab: false },
        { id: 's4_sweng_wab', name: 'Agiles Software-Engineering WAB', ects: 5, pruefung: 'WAB Kolloquium', wab: false, isWab: true, parentId: 's4_sweng' },
        { id: 's4_techinfo', name: 'Technische Informatik und Rechnerarchitekturen / XaaS', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's4_hci', name: 'Human-Computer-Interaction', ects: 5, pruefung: 'Projekt / Präsentation', wab: false },
        { id: 's4_data', name: 'Data Analytics und Big Data', ects: 5, pruefung: 'Klausur / Projekt', wab: false },
        { id: 's4_interkult', name: 'Interkulturelle Kompetenz und heterogene Teams', ects: 5, pruefung: 'Präsentation / Gruppenarbeit', wab: false },
      ],
    },
    {
      semester: 5,
      modules: [
        { id: 's5_projekt', name: 'Projektpraktikum', ects: 5, pruefung: 'Projekt', wab: false },
        { id: 's5_projekt_wab', name: 'Projektpraktikum WAB', ects: 5, pruefung: 'Kolloquium', wab: false, isWab: true, parentId: 's5_projekt' },
        { id: 's5_microservice', name: 'Software-Anwendungsarchitekturen und Microservice APIs', ects: 5, pruefung: 'Projekt / Klausur', wab: false },
        { id: 's5_ml', name: 'Maschinelles Lernen und Artificial Intelligence', ects: 5, pruefung: 'Klausur / Projekt', wab: false },
        { id: 's5_bwl', name: 'Betriebswirtschaftslehre und IT-Service-Management', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's5_wpf1', name: 'Wahlpflichtfach 1', ects: 5, pruefung: 'Klausur / Projekt', wab: false, wahloptionen: ['Mobile Anwendungen', 'Technikfolgenabschätzung', 'Privacy Enhancement Technologies'] },
      ],
    },
    {
      semester: 6,
      modules: [
        { id: 's6_trends', name: 'New Trends in IT und Management der Digitalen Transformation', ects: 5, pruefung: 'Projekt / Präsentation', wab: false },
        { id: 's6_recht', name: 'Recht und Datenschutz', ects: 5, pruefung: 'Klausur', wab: false },
        { id: 's6_thesis', name: 'Bachelor Thesis', ects: 12, pruefung: 'Abschlussarbeit', wab: false },
        { id: 's6_kolloq', name: 'Bachelor-Thesis Kolloquium', ects: 3, pruefung: 'Verteidigung', wab: false },
        { id: 's6_wpf2', name: 'Wahlpflichtfach 2', ects: 5, pruefung: 'Klausur / Projekt', wab: false, wahloptionen: ['Webanwendungen', 'Embedded Systems und Software', 'Resiliente Netzwerke'] },
      ],
    },
  ],

  getGrades() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.grades) || '{}');
  },

  saveGrade(moduleId, grade, status) {
    const grades = this.getGrades();
    grades[moduleId] = { grade: parseFloat(grade) || null, status: status || 'offen' };
    localStorage.setItem(this.STORAGE_KEYS.grades, JSON.stringify(grades));
  },

  getStudienplanStats() {
    const grades = this.getGrades();
    let totalEcts = 0;
    let completedEcts = 0;
    let weightedSum = 0;
    let gradedEcts = 0;

    this.STUDIENPLAN.forEach(function(sem) {
      sem.modules.forEach(function(mod) {
        totalEcts += mod.ects;
        const entry = grades[mod.id];
        if (entry && entry.status === 'bestanden') {
          completedEcts += mod.ects;
          if (entry.grade && entry.grade > 0) {
            weightedSum += entry.grade * mod.ects;
            gradedEcts += mod.ects;
          }
        }
      });
    });

    const average = gradedEcts > 0 ? (weightedSum / gradedEcts) : 0;
    return { totalEcts: totalEcts, completedEcts: completedEcts, average: average, gradedEcts: gradedEcts };
  },

  // ── Custom Names (Modul/Prof umbenennen) ──

  getCustomNames() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.customNames) || '{}');
  },

  saveCustomName(key, value) {
    var names = this.getCustomNames();
    if (value && value.trim()) {
      names[key] = value.trim();
    } else {
      delete names[key];
    }
    localStorage.setItem(this.STORAGE_KEYS.customNames, JSON.stringify(names));
  },

  getModuleName(mod) {
    var names = this.getCustomNames();
    return names['name_' + mod.id] || mod.name;
  },

  getProfName(mod) {
    var names = this.getCustomNames();
    return names['prof_' + mod.id] || mod.verantwortlich || '';
  },

  // ── Semester-Status ──

  isSemesterComplete(semesterIndex) {
    var grades = this.getGrades();
    var sem = this.STUDIENPLAN[semesterIndex];
    if (!sem) return false;
    return sem.modules.every(function(mod) {
      var entry = grades[mod.id];
      return entry && entry.status === 'bestanden';
    });
  },

  getSemesterEcts(semesterIndex) {
    var grades = this.getGrades();
    var sem = this.STUDIENPLAN[semesterIndex];
    if (!sem) return { total: 0, completed: 0 };
    var total = 0;
    var completed = 0;
    sem.modules.forEach(function(mod) {
      total += mod.ects;
      var entry = grades[mod.id];
      if (entry && entry.status === 'bestanden') completed += mod.ects;
    });
    return { total: total, completed: completed };
  },

  getSemesterAverage(semesterIndex) {
    var grades = this.getGrades();
    var sem = this.STUDIENPLAN[semesterIndex];
    if (!sem) return null;
    var weightedSum = 0;
    var gradedEcts = 0;
    sem.modules.forEach(function(mod) {
      var entry = grades[mod.id];
      if (entry && entry.status === 'bestanden' && entry.grade && entry.grade > 0) {
        weightedSum += entry.grade * mod.ects;
        gradedEcts += mod.ects;
      }
    });
    return gradedEcts > 0 ? (weightedSum / gradedEcts) : null;
  },
};







