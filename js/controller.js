/**
 * CONTROLLER — Verbindet Model & View, Event-Handling
 */
const Controller = {
  currentFilter: 'all',
  selectedDate: null,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),

  // ── Initialisierung ──

  init() {
    this._initTheme();
    this._initClock();
    this._initWeather();
    this._initStudienplan();
    this._bindTodoEvents();
    this._bindFilterEvents();
    this._bindCalendarNav();
    this._setDefaultDate();
    this.renderAll();
  },

  // ── Komplett-Render ──

  renderAll() {
    const todos = Model.getFilteredTodos(this.currentFilter, this.selectedDate);
    View.renderTodos(todos, this.selectedDate);
    this._bindTodoItemEvents();

    View.renderCalendar(
      this.calYear,
      this.calMonth,
      Model.getTasksByDate(),
      Model.todayStr(),
      this.selectedDate
    );
    this._bindCalendarDayEvents();

    View.renderStats(Model.getStats());
    View.renderLineChart(Model.getWeeklyData());
    View.renderDonutChart(Model.getCategoryData());
  },

  // ── Theme ──

  _initTheme() {
    const theme = Model.getTheme();
    View.applyTheme(theme);

    View.el('themeToggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      Model.setTheme(next);
      View.applyTheme(next);
      // Charts müssen nach Theme-Wechsel neu gerendert werden
      View.renderLineChart(Model.getWeeklyData());
      View.renderDonutChart(Model.getCategoryData());
    });
  },

  // ── Uhr ──

  _initClock() {
    View.updateClock();
    setInterval(() => View.updateClock(), 1000);
  },

  // ── Wetter ──

  WMO_DESCRIPTIONS: {
    0: 'Klar',
    1: 'Überwiegend klar',
    2: 'Teilweise bewölkt',
    3: 'Bedeckt',
    45: 'Nebel',
    48: 'Nebel mit Reif',
    51: 'Leichter Nieselregen',
    53: 'Nieselregen',
    55: 'Starker Nieselregen',
    61: 'Leichter Regen',
    63: 'Regen',
    65: 'Starker Regen',
    71: 'Leichter Schneefall',
    73: 'Schneefall',
    75: 'Starker Schneefall',
    80: 'Regenschauer',
    81: 'Starke Regenschauer',
    82: 'Heftige Regenschauer',
    85: 'Schneeschauer',
    86: 'Starke Schneeschauer',
    95: 'Gewitter',
    96: 'Gewitter mit Hagel',
    99: 'Gewitter mit starkem Hagel',
  },

  _initWeather() {
    const cached = Model.getCachedWeather();
    if (cached) {
      View.displayWeather(cached);
    } else {
      this._fetchWeather();
    }
  },

  async _fetchWeather() {
    try {
      const coords = await this._getCoordinates();
      const url = 'https://api.open-meteo.com/v1/forecast'
        + '?latitude=' + coords.lat
        + '&longitude=' + coords.lon
        + '&current=temperature_2m,weather_code'
        + '&timezone=Europe%2FBerlin';

      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather API responded with ' + res.status);
      const data = await res.json();

      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      const desc = this.WMO_DESCRIPTIONS[code] || 'Unbekannt';

      const weather = {
        temp: temp,
        desc: desc,
        city: coords.city,
      };

      Model.cacheWeather(weather);
      View.displayWeather(weather);
    } catch (e) {
      console.warn('Wetter konnte nicht geladen werden:', e);
      View.displayWeather(null);
    }
  },

  _getCoordinates() {
    return new Promise(function(resolve) {
      // Versuch 1: Browser Geolocation API
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            resolve({
              lat: pos.coords.latitude.toFixed(2),
              lon: pos.coords.longitude.toFixed(2),
              city: 'Mein Standort',
            });
          },
          function() {
            // Geolocation abgelehnt oder fehlgeschlagen — Fallback Berlin
            resolve({ lat: 52.52, lon: 13.41, city: 'Berlin' });
          },
          { timeout: 5000 }
        );
      } else {
        // Kein Geolocation verfügbar — Fallback Berlin
        resolve({ lat: 52.52, lon: 13.41, city: 'Berlin' });
      }
    });
  },

  // ── To-Do Events ──

  _bindTodoEvents() {
    View.el('todoAdd').addEventListener('click', () => this._addTodo());
    View.el('todoInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addTodo();
    });
  },

  _addTodo() {
    const input = View.el('todoInput');
    const text = input.value.trim();
    if (!text) return;

    const date = View.el('todoDate').value || null;
    const category = View.el('todoCategory').value;
    const points = View.el('todoPoints').value;

    Model.addTodo(text, date, category, points);
    input.value = '';
    this.renderAll();
  },

  _bindTodoItemEvents() {
    document.querySelectorAll('.todo-checkbox').forEach(cb => {
      cb.addEventListener('click', () => {
        Model.toggleTodo(cb.dataset.id);
        this.renderAll();
      });
    });

    document.querySelectorAll('.todo-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        Model.deleteTodo(btn.dataset.id);
        this.renderAll();
      });
    });
  },

  // ── Filter Events ──

  _bindFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        View.setActiveFilter(btn);
        this.currentFilter = btn.dataset.filter;
        const todos = Model.getFilteredTodos(this.currentFilter, this.selectedDate);
        View.renderTodos(todos, this.selectedDate);
        this._bindTodoItemEvents();
      });
    });
  },

  // ── Kalender Navigation ──

  _bindCalendarNav() {
    View.el('calPrev').addEventListener('click', () => {
      this.calMonth--;
      if (this.calMonth < 0) { this.calMonth = 11; this.calYear--; }
      this._renderCalendar();
    });

    View.el('calNext').addEventListener('click', () => {
      this.calMonth++;
      if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; }
      this._renderCalendar();
    });
  },

  _renderCalendar() {
    View.renderCalendar(
      this.calYear,
      this.calMonth,
      Model.getTasksByDate(),
      Model.todayStr(),
      this.selectedDate
    );
    this._bindCalendarDayEvents();
  },

  _bindCalendarDayEvents() {
    document.querySelectorAll('.calendar-day[data-date]').forEach(dayEl => {
      dayEl.addEventListener('click', () => {
        const dateStr = dayEl.dataset.date;
        if (this.selectedDate === dateStr) {
          this.selectedDate = null;
        } else {
          this.selectedDate = dateStr;
          View.el('todoDate').value = dateStr;
        }
        this._renderCalendar();
        const todos = Model.getFilteredTodos(this.currentFilter, this.selectedDate);
        View.renderTodos(todos, this.selectedDate);
        this._bindTodoItemEvents();
      });
    });
  },

  // ── Standarddatum ──

  _setDefaultDate() {
    View.el('todoDate').value = Model.todayStr();
  },

  // ── Studienplan ──

  _initStudienplan() {
    var self = this;

    View.el('studienplanBtn').addEventListener('click', function() {
      self._renderStudienplan();
      View.showStudienplan();
    });

    View.el('studienplanClose').addEventListener('click', function() {
      View.hideStudienplan();
    });

    View.el('studienplanOverlay').addEventListener('click', function(e) {
      if (e.target === View.el('studienplanOverlay')) {
        View.hideStudienplan();
      }
    });
  },

  _renderStudienplan() {
    var self = this;
    var grades = Model.getGrades();
    var customNames = Model.getCustomNames();
    View.renderStudienplan(Model.STUDIENPLAN, grades, customNames);
    View.renderStudienplanStats(Model.getStudienplanStats());

    // Accordion toggle
    document.querySelectorAll('.sp-semester-header').forEach(function(header) {
      header.addEventListener('click', function() {
        var content = header.nextElementSibling;
        var chevron = header.querySelector('.sp-chevron');
        if (content.classList.contains('sp-content-open')) {
          content.classList.remove('sp-content-open');
          chevron.classList.remove('sp-chevron-open');
        } else {
          content.classList.add('sp-content-open');
          chevron.classList.add('sp-chevron-open');
        }
      });
    });

    // Grade inputs
    document.querySelectorAll('.sp-grade-input').forEach(function(input) {
      input.addEventListener('change', function() {
        var moduleId = input.dataset.module;
        var selectEl = document.querySelector('.sp-status-select[data-module="' + moduleId + '"]');
        var status = selectEl ? selectEl.value : 'offen';
        Model.saveGrade(moduleId, input.value, status);
        self._refreshStudienplan();
      });
    });

    // Status selects
    document.querySelectorAll('.sp-status-select').forEach(function(select) {
      select.addEventListener('change', function() {
        var moduleId = select.dataset.module;
        var gradeInput = document.querySelector('.sp-grade-input[data-module="' + moduleId + '"]');
        var grade = gradeInput ? gradeInput.value : '';
        Model.saveGrade(moduleId, grade, select.value);
        self._refreshStudienplan();
      });
    });

    // Custom module name inputs
    document.querySelectorAll('.sp-name-input').forEach(function(input) {
      input.addEventListener('change', function() {
        Model.saveCustomName(input.dataset.nameKey, input.value);
      });
    });

    // Custom prof name inputs
    document.querySelectorAll('.sp-prof-input').forEach(function(input) {
      input.addEventListener('change', function() {
        Model.saveCustomName(input.dataset.nameKey, input.value);
      });
    });
  },

  _refreshStudienplan() {
    // Merke welche Semester offen sind
    var openSemesters = [];
    document.querySelectorAll('.sp-semester-content.sp-content-open').forEach(function(el) {
      var parent = el.closest('.sp-semester');
      if (parent) openSemesters.push(parent.dataset.semester);
    });

    this._renderStudienplan();

    // Stelle den open-State wieder her
    openSemesters.forEach(function(idx) {
      var content = document.querySelector('.sp-semester[data-semester="' + idx + '"] .sp-semester-content');
      var chevron = document.querySelector('.sp-semester[data-semester="' + idx + '"] .sp-chevron');
      if (content && !content.classList.contains('sp-content-open')) {
        content.classList.add('sp-content-open');
        if (chevron) chevron.classList.add('sp-chevron-open');
      }
    });
  },

  _updateStatusClasses() {
    document.querySelectorAll('.sp-status-select').forEach(function(select) {
      select.classList.remove('sp-status-offen', 'sp-status-bestanden', 'sp-status-nb');
      if (select.value === 'bestanden') select.classList.add('sp-status-bestanden');
      else if (select.value === 'nicht-bestanden') select.classList.add('sp-status-nb');
      else select.classList.add('sp-status-offen');
    });
  },
};








