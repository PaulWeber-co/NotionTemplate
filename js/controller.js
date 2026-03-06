/**
 * CONTROLLER — Verbindet Model & View, Event-Handling
 */
const Controller = {
  currentFilter: 'all',
  selectedDate: null,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  calendarExpanded: false,
  chartRange: 'week',

  // ── Initialisierung ──

  init() {
    this._initTheme();
    this._initClock();
    this._initWeather();
    this._initStudienplan();
    this._initCalendarExpand();
    this._initChartRange();
    this._initICSImport();
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
    View.renderLineChart(Model.getChartData(this.chartRange));
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
      View.renderLineChart(Model.getChartData(this.chartRange));
      View.renderDonutChart(Model.getCategoryData());
    });
  },

  // ── Uhr ──

  _initClock() {
    View.updateClock();
    setInterval(() => View.updateClock(), 1000);
  },

  // ── Lofi Player ──


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
      var fallback = { lat: 52.52, lon: 13.41, city: 'Berlin' };
      var resolved = false;

      function done(coords) {
        if (!resolved) {
          resolved = true;
          resolve(coords);
        }
      }

      // Timeout: nach 3s Fallback verwenden
      setTimeout(function() { done(fallback); }, 3000);

      // Versuch 1: Browser Geolocation API
      if (navigator.geolocation) {
        try {
          navigator.geolocation.getCurrentPosition(
            function(pos) {
              done({
                lat: pos.coords.latitude.toFixed(2),
                lon: pos.coords.longitude.toFixed(2),
                city: 'Mein Standort',
              });
            },
            function() {
              // Versuch 2: IP-basierte Geolocation
              fetch('https://ipapi.co/json/')
                .then(function(r) { return r.json(); })
                .then(function(d) {
                  if (d.latitude && d.longitude) {
                    done({ lat: d.latitude, lon: d.longitude, city: d.city || 'Unbekannt' });
                  } else {
                    done(fallback);
                  }
                })
                .catch(function() { done(fallback); });
            },
            { timeout: 2000 }
          );
        } catch (e) {
          done(fallback);
        }
      } else {
        // Kein Geolocation — IP-Fallback
        fetch('https://ipapi.co/json/')
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (d.latitude && d.longitude) {
              done({ lat: d.latitude, lon: d.longitude, city: d.city || 'Unbekannt' });
            } else {
              done(fallback);
            }
          })
          .catch(function() { done(fallback); });
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

  // ── Kalender Expand ──

  _initCalendarExpand() {
    var self = this;
    View.el('calExpandBtn').addEventListener('click', function() {
      self.calendarExpanded = !self.calendarExpanded;
      var mainEl = document.querySelector('.main');
      if (self.calendarExpanded) {
        mainEl.classList.add('calendar-expanded');
      } else {
        mainEl.classList.remove('calendar-expanded');
      }
      self._renderCalendar();
    });
  },

  // ── Chart Zeitraum ──

  _initChartRange() {
    var self = this;
    document.querySelectorAll('.chart-range-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.chart-range-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.chartRange = btn.dataset.range;
        View.renderLineChart(Model.getChartData(self.chartRange));
      });
    });
  },

  // ── Kalender Sync ──

  _initICSImport() {
    var self = this;

    // Sync-Button öffnet Modal
    View.el('calSyncBtn').addEventListener('click', function() {
      self._openSyncModal();
    });

    View.el('calSyncClose').addEventListener('click', function() {
      View.el('calSyncOverlay').classList.remove('visible');
    });

    View.el('calSyncOverlay').addEventListener('click', function(e) {
      if (e.target === View.el('calSyncOverlay')) {
        View.el('calSyncOverlay').classList.remove('visible');
      }
    });

    // URL speichern + sync
    View.el('syncUrlSave').addEventListener('click', function() {
      var url = View.el('syncUrlInput').value.trim();
      if (!url) return;
      Model.setSyncUrl(url);
      self._syncFromUrl(url);
    });

    // Datei-Import (Click + Drag&Drop)
    var dropZone = View.el('syncDropZone');
    var fileInput = View.el('calIcsFile');

    dropZone.addEventListener('click', function() {
      fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (file) self._importFile(file);
      fileInput.value = '';
    });

    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.classList.add('sync-drop-active');
    });

    dropZone.addEventListener('dragleave', function() {
      dropZone.classList.remove('sync-drop-active');
    });

    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.classList.remove('sync-drop-active');
      var file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.ics')) {
        self._importFile(file);
      }
    });

    // Clear sync events
    View.el('syncClearBtn').addEventListener('click', function() {
      Model.clearSyncEvents();
      self._updateSyncStatus();
      self.renderAll();
    });

    // Vorhandene URL laden
    var savedUrl = Model.getSyncUrl();
    if (savedUrl) {
      // Auto-Sync alle 15 Minuten
      var elapsed = Date.now() - Model.getLastSyncTime();
      if (elapsed > 900000) {
        this._syncFromUrl(savedUrl);
      }
      setInterval(function() {
        self._syncFromUrl(Model.getSyncUrl());
      }, 900000);
    }
  },

  _openSyncModal() {
    var overlay = View.el('calSyncOverlay');
    var urlInput = View.el('syncUrlInput');
    urlInput.value = Model.getSyncUrl();
    this._updateSyncStatus();
    overlay.classList.add('visible');
  },

  _updateSyncStatus() {
    var statusEl = View.el('syncUrlStatus');
    var eventsSection = View.el('syncEventsSection');
    var eventsCount = View.el('syncEventsCount');
    var url = Model.getSyncUrl();
    var syncEvents = Model.getSyncEvents();
    var lastSync = Model.getLastSyncTime();

    if (url) {
      var timeStr = lastSync > 0
        ? new Date(lastSync).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '--';
      statusEl.textContent = 'Verbunden — Letzte Sync: ' + timeStr;
      statusEl.className = 'sync-url-status sync-connected';
    } else {
      statusEl.textContent = '';
      statusEl.className = 'sync-url-status';
    }

    if (syncEvents.length > 0) {
      eventsSection.classList.remove('sync-hidden');
      eventsCount.textContent = syncEvents.length + ' Termine synchronisiert';
    } else {
      eventsSection.classList.add('sync-hidden');
    }
  },

  _syncFromUrl(url) {
    var self = this;
    var statusEl = View.el('syncUrlStatus');
    statusEl.textContent = 'Synchronisiere...';
    statusEl.className = 'sync-url-status sync-loading';

    // CORS-Proxy nötig für externe URLs
    var proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);

    fetch(proxyUrl)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function(text) {
        var count = Model.syncFromICS(text);
        self._updateSyncStatus();
        self.renderAll();
      })
      .catch(function(err) {
        console.warn('Sync fehlgeschlagen:', err);
        statusEl.textContent = 'Sync fehlgeschlagen — prüfe die URL';
        statusEl.className = 'sync-url-status sync-error';
      });
  },

  _importFile(file) {
    var self = this;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var text = ev.target.result;
      var events = Model.parseICS(text);
      if (events.length === 0) {
        View.el('syncUrlStatus').textContent = 'Keine Termine in der Datei gefunden.';
        return;
      }
      var count = Model.importICSEvents(events);
      View.el('syncUrlStatus').textContent = count + ' Termin(e) als Aufgaben importiert.';
      self._updateSyncStatus();
      self.renderAll();
    };
    reader.readAsText(file);
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

  // ── Planer ──

  _initStudienplan() {
    var self = this;

    View.el('studienplanBtn').addEventListener('click', function() {
      self._openPlaner();
    });

    View.el('studienplanClose').addEventListener('click', function() {
      View.hideStudienplan();
    });

    View.el('studienplanOverlay').addEventListener('click', function(e) {
      if (e.target === View.el('studienplanOverlay')) {
        View.hideStudienplan();
      }
    });

    // Modus-Auswahl Buttons
    document.querySelectorAll('.planer-mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = btn.dataset.mode;
        Model.setPlanerMode(mode);
        self._renderPlaner();
      });
    });

    // Modus ändern
    View.el('planerReset').addEventListener('click', function() {
      self._showConfirm('Modus ändern? Alle bisherigen Daten werden gelöscht.', function() {
        Model.resetPlaner();
        View.el('studienplanBody').innerHTML = '';
        View.el('planerTitle').textContent = 'Planer';
        View.el('studienplanSummary').textContent = '';
        View.showPlanerModeSelect();
      });
    });

    // Zeitraum hinzufügen
    View.el('planerAddPeriod').addEventListener('click', function() {
      Model.addPeriod();
      self._renderPlaner();
    });
  },

  _openPlaner() {
    var mode = Model.getPlanerMode();
    if (mode) {
      this._renderPlaner();
    } else {
      View.showPlanerModeSelect();
    }
    View.showStudienplan();
  },

  _renderPlaner() {
    var self = this;
    var mode = Model.getPlanerMode();
    if (!mode) { View.showPlanerModeSelect(); return; }

    var data = Model.getPlanerData();
    var grades = Model.getGrades();

    View.showPlanerContent(mode);
    View.renderPlaner(data, grades, mode);
    View.renderPlanerStats(Model.getPlanerStats(), mode);

    // Accordion
    document.querySelectorAll('.sp-semester-header').forEach(function(header) {
      header.addEventListener('click', function(e) {
        if (e.target.closest('.sp-period-delete')) return;
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
        self._refreshPlaner();
      });
    });

    // Status selects
    document.querySelectorAll('.sp-status-select').forEach(function(select) {
      select.addEventListener('change', function() {
        var moduleId = select.dataset.module;
        var gradeInput = document.querySelector('.sp-grade-input[data-module="' + moduleId + '"]');
        var grade = gradeInput ? gradeInput.value : '';
        Model.saveGrade(moduleId, grade, select.value);
        self._refreshPlaner();
      });
    });

    // Inline module field edits (name, prof, pruefung, points)
    document.querySelectorAll('.sp-name-input, .sp-prof-input, .sp-pruef-input, .sp-ects-input').forEach(function(input) {
      input.addEventListener('change', function() {
        var pi = parseInt(input.dataset.period);
        var mi = parseInt(input.dataset.mod);
        var field = input.dataset.field;
        var val = field === 'points' ? parseInt(input.value) || 5 : input.value;
        Model.updateModule(pi, mi, field, val);
        self._refreshPlaner();
      });
    });

    // Delete module
    document.querySelectorAll('.sp-mod-delete').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Model.deleteModule(parseInt(btn.dataset.period), parseInt(btn.dataset.mod));
        self._refreshPlaner();
      });
    });

    // Delete period
    document.querySelectorAll('.sp-period-delete').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var config = Model.PLANER_MODES[mode];
        var periodIdx = parseInt(btn.dataset.periodDel);
        self._showConfirm(config.periodLabel + ' löschen?', function() {
          Model.deletePeriod(periodIdx);
          self._refreshPlaner();
        });
      });
    });

    // Add module
    document.querySelectorAll('.sp-add-module-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Model.addModule(parseInt(btn.dataset.addMod));
        self._refreshPlaner();
      });
    });
  },

  _refreshPlaner() {
    var openSemesters = [];
    document.querySelectorAll('.sp-semester-content.sp-content-open').forEach(function(el) {
      var parent = el.closest('.sp-semester');
      if (parent) openSemesters.push(parent.dataset.semester);
    });

    this._renderPlaner();

    openSemesters.forEach(function(idx) {
      var content = document.querySelector('.sp-semester[data-semester="' + idx + '"] .sp-semester-content');
      var chevron = document.querySelector('.sp-semester[data-semester="' + idx + '"] .sp-chevron');
      if (content && !content.classList.contains('sp-content-open')) {
        content.classList.add('sp-content-open');
        if (chevron) chevron.classList.add('sp-chevron-open');
      }
    });
  },

  // ── Confirm Modal (confirm() funktioniert nicht in Extensions) ──

  _confirmCallback: null,

  _showConfirm: function(text, onOk) {
    var self = this;
    var overlay = View.el('confirmOverlay');
    View.el('confirmText').textContent = text;
    overlay.classList.remove('sync-hidden');
    overlay.classList.add('visible');
    self._confirmCallback = onOk;

    // Event-Listener einmal binden (alte entfernen)
    var okBtn = View.el('confirmOk');
    var cancelBtn = View.el('confirmCancel');
    var newOk = okBtn.cloneNode(true);
    var newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newOk.addEventListener('click', function() {
      overlay.classList.remove('visible');
      overlay.classList.add('sync-hidden');
      if (self._confirmCallback) self._confirmCallback();
      self._confirmCallback = null;
    });

    newCancel.addEventListener('click', function() {
      overlay.classList.remove('visible');
      overlay.classList.add('sync-hidden');
      self._confirmCallback = null;
    });
  },
};







































