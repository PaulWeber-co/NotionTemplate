/**
 * VIEW — DOM-Manipulation & Rendering
 */
const View = {
  CATEGORIES: {
    arbeit: 'Arbeit',
    persoenlich: 'Persoenlich',
    gesundheit: 'Gesundheit',
    lernen: 'Lernen',
  },

  CATEGORY_COLORS: {
    arbeit: 'accent',
    persoenlich: 'purple',
    gesundheit: 'green',
    lernen: 'orange',
  },

  MONTH_NAMES: [
    'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ],

  DAY_NAMES: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],

  charts: { line: null, donut: null },

  // ── Referenzen ──

  el(id) {
    return document.getElementById(id);
  },

  // ── Uhr ──

  updateClock() {
    const n = new Date();
    const timeOpts = { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const dateOpts = { timeZone: 'Europe/Berlin', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.el('clock').textContent = n.toLocaleTimeString('de-DE', timeOpts);
    this.el('clockDate').textContent = n.toLocaleDateString('de-DE', dateOpts);
  },

  // ── Wetter ──

  displayWeather(data) {
    if (!data) {
      this.el('weatherTemp').textContent = '--';
      this.el('weatherDesc').textContent = 'Nicht verfuegbar';
      this.el('weatherIcon').textContent = '--';
      return;
    }
    this.el('weatherTemp').textContent = data.temp + ' C';
    this.el('weatherDesc').textContent = data.desc + ' / ' + data.city;
    this.el('weatherIcon').textContent = data.temp + '\u00B0';
  },

  // ── Theme ──

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.el('themeToggle').textContent = theme === 'light' ? 'Dark' : 'Light';
  },

  // ── Stats ──

  renderStats(stats) {
    this.el('statTotal').textContent = stats.total;
    this.el('statDone').textContent = stats.done;
    this.el('statOpen').textContent = stats.open;
    this.el('statRate').textContent = stats.rate + '%';
    this.el('statPoints').textContent = stats.earnedPoints + ' / ' + stats.totalPoints;
  },

  // ── To-Do Liste ──

  renderTodos(todos, selectedDate) {
    const ul = this.el('todoList');

    if (todos.length === 0) {
      ul.innerHTML = '<div class="todo-empty"><div class="todo-empty-icon">--</div>Keine Aufgaben' +
        (selectedDate ? ' fuer diesen Tag' : '') + '</div>';
      return;
    }

    ul.innerHTML = todos.map(t => {
      const catLabel = this.CATEGORIES[t.category] || t.category;
      const dateLabel = t.date ? this._formatDateDE(t.date) : '';
      const pointsDots = this._renderPointsDots(t.points || 1);

      return '<li class="todo-item">' +
        '<div class="todo-checkbox ' + (t.completed ? 'checked' : '') + '" data-id="' + t.id + '"></div>' +
        '<div class="todo-content">' +
          '<div class="todo-text ' + (t.completed ? 'completed' : '') + '">' + this._escapeHtml(t.text) + '</div>' +
          '<div class="todo-meta">' +
            '<span class="todo-tag tag-' + t.category + '">' + catLabel + '</span>' +
            '<span class="todo-points">' + pointsDots + '</span>' +
            (dateLabel ? '<span class="todo-date-label">' + dateLabel + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<button class="todo-delete" data-id="' + t.id + '">x</button>' +
      '</li>';
    }).join('');
  },

  _renderPointsDots(points) {
    let dots = '';
    for (let i = 0; i < points; i++) {
      dots += '<span class="point-dot"></span>';
    }
    return dots;
  },

  // ── Kalender ──

  renderCalendar(year, month, tasksByDate, todayStr, selectedDate) {
    this.el('calMonthLabel').textContent = this.MONTH_NAMES[month] + ' ' + year;
    const grid = this.el('calendarGrid');
    grid.innerHTML = '';

    // Wochentag-Header
    this.DAY_NAMES.forEach(d => {
      const el = document.createElement('div');
      el.className = 'calendar-day-header';
      el.textContent = d;
      grid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1);
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Vormonat
    for (let i = startWeekday - 1; i >= 0; i--) {
      grid.appendChild(this._createDayEl(daysInPrevMonth - i, true, null, [], false, false));
    }

    // Aktueller Monat
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const tasks = tasksByDate[dateStr] || [];
      grid.appendChild(this._createDayEl(d, false, dateStr, tasks, dateStr === todayStr, dateStr === selectedDate));
    }

    // Naechster Monat
    const totalCells = startWeekday + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      grid.appendChild(this._createDayEl(i, true, null, [], false, false));
    }
  },

  _createDayEl(day, isOther, dateStr, tasks, isToday, isSelected) {
    const el = document.createElement('div');
    el.className = 'calendar-day';
    if (isOther) el.classList.add('other-month');
    if (isToday) el.classList.add('today');
    if (isSelected) el.classList.add('selected');
    if (dateStr) el.setAttribute('data-date', dateStr);

    const num = document.createElement('span');
    num.textContent = day;
    el.appendChild(num);

    if (tasks.length > 0) {
      const dots = document.createElement('div');
      dots.className = 'calendar-dots';
      const uniqueCats = [...new Set(tasks.map(t => t.category))].slice(0, 4);
      uniqueCats.forEach(cat => {
        const dot = document.createElement('div');
        dot.className = 'calendar-dot dot-' + (cat || 'default');
        dots.appendChild(dot);
      });
      el.appendChild(dots);
    }

    return el;
  },

  // ── Charts ──

  renderLineChart(weeklyData) {
    const colors = this._getChartColors();
    const ctx = this.el('lineChart').getContext('2d');

    if (this.charts.line) this.charts.line.destroy();

    this.charts.line = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyData.labels,
        datasets: [
          {
            label: 'Abschlussrate',
            data: weeklyData.completionData,
            borderColor: colors.accent,
            backgroundColor: colors.accentLight,
            borderWidth: 2,
            pointBackgroundColor: colors.accent,
            pointBorderColor: colors.accent,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: true,
            yAxisID: 'y',
          },
          {
            label: 'Story Points',
            data: weeklyData.pointsData,
            borderColor: colors.green,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointBackgroundColor: colors.green,
            pointBorderColor: colors.green,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: false,
            borderDash: [4, 3],
            yAxisID: 'y1',
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: colors.textSecondary,
              font: { family: 'Inter', size: 11 },
              boxWidth: 12,
              boxHeight: 2,
              padding: 12,
              usePointStyle: false,
            },
          },
          tooltip: {
            backgroundColor: colors.cardBg,
            titleColor: colors.text,
            bodyColor: colors.textSecondary,
            borderColor: colors.border,
            borderWidth: 1,
            titleFont: { family: 'Inter', weight: '600' },
            bodyFont: { family: 'Inter' },
            padding: 10,
            callbacks: {
              label: function(context) {
                if (context.datasetIndex === 0) return ' ' + context.parsed.y + '% erledigt';
                return ' ' + context.parsed.y + ' Punkte';
              },
            },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            position: 'left',
            ticks: {
              color: colors.textSecondary,
              font: { family: 'Inter', size: 10 },
              callback: function(v) { return v + '%'; },
              stepSize: 25,
            },
            grid: { color: colors.grid, drawBorder: false },
            border: { display: false },
          },
          y1: {
            min: 0,
            position: 'right',
            ticks: {
              color: colors.textSecondary,
              font: { family: 'Inter', size: 10 },
              callback: function(v) { return v + 'pt'; },
              stepSize: 1,
            },
            grid: { display: false },
            border: { display: false },
          },
          x: {
            ticks: { color: colors.textSecondary, font: { family: 'Inter', size: 10 } },
            grid: { display: false },
            border: { display: false },
          },
        },
      },
    });
  },

  renderDonutChart(categoryData) {
    const colors = this._getChartColors();
    const ctx = this.el('donutChart').getContext('2d');

    if (this.charts.donut) this.charts.donut.destroy();

    const hasData = Object.values(categoryData).some(v => v > 0);

    this.charts.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Arbeit', 'Persoenlich', 'Gesundheit', 'Lernen'],
        datasets: [{
          data: hasData ? Object.values(categoryData) : [1, 1, 1, 1],
          backgroundColor: [colors.accent, colors.purple, colors.green, colors.orange],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: colors.textSecondary,
              font: { family: 'Inter', size: 11 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
          tooltip: {
            backgroundColor: colors.cardBg,
            titleColor: colors.text,
            bodyColor: colors.textSecondary,
            borderColor: colors.border,
            borderWidth: 1,
            titleFont: { family: 'Inter', weight: '600' },
            bodyFont: { family: 'Inter' },
            padding: 10,
            callbacks: {
              label: function(context) {
                if (!hasData) return ' Keine Daten';
                return ' ' + context.parsed + ' Tasks';
              },
            },
          },
        },
      },
    });
  },

  _getChartColors() {
    const s = getComputedStyle(document.documentElement);
    return {
      accent: s.getPropertyValue('--accent').trim(),
      green: s.getPropertyValue('--green').trim(),
      orange: s.getPropertyValue('--orange').trim(),
      purple: s.getPropertyValue('--purple').trim(),
      text: s.getPropertyValue('--text').trim(),
      textSecondary: s.getPropertyValue('--text-secondary').trim(),
      grid: s.getPropertyValue('--chart-grid').trim(),
      accentLight: s.getPropertyValue('--accent-light').trim(),
      border: s.getPropertyValue('--border').trim(),
      cardBg: s.getPropertyValue('--bg-card').trim(),
    };
  },

  // ── Filter aktiv setzen ──

  setActiveFilter(filterBtn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    filterBtn.classList.add('active');
  },

  // ── Hilfsfunktionen ──

  _formatDateDE(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ── Studienplan ──

  renderStudienplan(semesters, grades) {
    const body = this.el('studienplanBody');
    let html = '';

    semesters.forEach(function(sem) {
      html += '<div class="sp-semester">';
      html += '<div class="sp-semester-title">' + sem.semester + '. Semester</div>';
      html += '<table class="sp-table">';
      html += '<thead><tr>'
        + '<th class="sp-th-name">Modul</th>'
        + '<th class="sp-th-ects">ECTS</th>'
        + '<th class="sp-th-pruef">Pruefung</th>'
        + '<th class="sp-th-wab">WAB</th>'
        + '<th class="sp-th-note">Note</th>'
        + '<th class="sp-th-status">Status</th>'
        + '</tr></thead><tbody>';

      sem.modules.forEach(function(mod) {
        const entry = grades[mod.id] || {};
        const gradeVal = entry.grade || '';
        const status = entry.status || 'offen';

        let statusClass = 'sp-status-offen';
        if (status === 'bestanden') statusClass = 'sp-status-bestanden';
        else if (status === 'nicht-bestanden') statusClass = 'sp-status-nb';

        let nameExtra = '';
        if (mod.wahloptionen) {
          nameExtra = '<div class="sp-wahloptionen">' + mod.wahloptionen.join(' / ') + '</div>';
        }

        html += '<tr>'
          + '<td class="sp-td-name">' + mod.name + nameExtra + '</td>'
          + '<td class="sp-td-ects">' + mod.ects + '</td>'
          + '<td class="sp-td-pruef">' + mod.pruefung + '</td>'
          + '<td class="sp-td-wab">' + (mod.wab ? 'Ja' : '--') + '</td>'
          + '<td class="sp-td-note"><input type="number" class="sp-grade-input" data-module="' + mod.id + '" value="' + gradeVal + '" min="1.0" max="5.0" step="0.1" placeholder="--"></td>'
          + '<td class="sp-td-status"><select class="sp-status-select ' + statusClass + '" data-module="' + mod.id + '">'
            + '<option value="offen"' + (status === 'offen' ? ' selected' : '') + '>Offen</option>'
            + '<option value="bestanden"' + (status === 'bestanden' ? ' selected' : '') + '>Bestanden</option>'
            + '<option value="nicht-bestanden"' + (status === 'nicht-bestanden' ? ' selected' : '') + '>Nicht best.</option>'
          + '</select></td>'
          + '</tr>';
      });

      html += '</tbody></table></div>';
    });

    body.innerHTML = html;
  },

  renderStudienplanStats(stats) {
    this.el('spAverage').textContent = stats.gradedEcts > 0 ? stats.average.toFixed(2) : '--';
    this.el('spEctsComplete').textContent = stats.completedEcts + ' / ' + stats.totalEcts;
    this.el('studienplanSummary').textContent = stats.completedEcts + ' / ' + stats.totalEcts + ' ECTS';
    const pct = stats.totalEcts > 0 ? Math.round((stats.completedEcts / stats.totalEcts) * 100) : 0;
    this.el('spProgressFill').style.width = pct + '%';
  },

  showStudienplan() {
    this.el('studienplanOverlay').classList.add('visible');
  },

  hideStudienplan() {
    this.el('studienplanOverlay').classList.remove('visible');
  },
};



