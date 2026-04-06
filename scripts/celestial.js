/* ================================================================
 * Celestial Calendar — Foundry VTT Module v1.2.0
 * Author:  Tonyb29 | https://github.com/Tonyb29
 * Repo:    https://github.com/Tonyb29/Celestial-Calendar
 * License: MIT
 *
 * Tracks moon phases, conjunctions, eclipses, and celestial events
 * for any fantasy world. Ships with Eldoria (two moons: Luna & Selene).
 * Import a custom calendar from the DnD Parser Toolkit via Module Settings.
 * Optionally syncs with Simple Calendar for automatic date tracking.
 * ================================================================ */
(function () {
  'use strict';

  var MODULE_ID = 'celestial-calendar';

  // ── Default calendar: Eldoria ─────────────────────────────────────────────
  // Luna (30d) + Selene (50d) → synodic period 75d, lunar eclipses every 150d
  var ELDORIA = {
    id: 'eldoria',
    name: 'Eldoria',
    daysPerYear: 360,
    moons: [
      {
        id: 'luna', name: 'Luna', orbitDays: 30, size: 'large',
        color: '#e2e8f0', startPhase: 0,
        description: 'The great silver moon. Governs tides, seasons, and divine magic.',
      },
      {
        id: 'selene', name: 'Selene', orbitDays: 50, size: 'small',
        color: '#93c5fd', startPhase: 0,
        description: 'The smaller blue moon. Governs arcane currents and prophecy.',
      },
    ],
    // Boons and pitfalls are intentionally empty in this default.
    // Add your own via Module Settings → Custom Calendar JSON (exported from DnD Parser Toolkit).
    eventEffects: {
      conjunction: { boons: [], pitfalls: [] },
      opposition:  { boons: [], pitfalls: [] },
      fullMoon:    { boons: [], pitfalls: [] },
      newMoon:     { boons: [], pitfalls: [] },
      eclipse:     { boons: [], pitfalls: [] },
    },
  };

  // ── Calendar resolution ───────────────────────────────────────────────────
  function getCalendar() {
    try {
      var json = game.settings.get(MODULE_ID, 'calendarData');
      if (json && json.trim().length > 10) {
        var parsed = JSON.parse(json);
        if (parsed && Array.isArray(parsed.moons) && parsed.moons.length > 0) return parsed;
      }
    } catch (e) { /* fall through to default */ }
    return ELDORIA;
  }

  // ── Phase math ────────────────────────────────────────────────────────────
  // phase ∈ [0,1): 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
  function moonPhase(moon, day) {
    return (((day / moon.orbitDays) + moon.startPhase) % 1 + 1) % 1;
  }

  // 0 at new moon, 1 at full moon
  function illumination(phase) {
    return 1 - Math.abs(2 * phase - 1);
  }

  function illuminationPct(phase) {
    return Math.round(illumination(phase) * 100);
  }

  function phaseName(phase) {
    var p = ((phase % 1) + 1) % 1;
    if (p < 0.03 || p > 0.97) return 'New Moon';
    if (p < 0.22) return 'Waxing Crescent';
    if (p < 0.28) return 'First Quarter';
    if (p < 0.47) return 'Waxing Gibbous';
    if (p < 0.53) return 'Full Moon';
    if (p < 0.72) return 'Waning Gibbous';
    if (p < 0.78) return 'Last Quarter';
    return 'Waning Crescent';
  }

  function phaseDist(a, b) {
    var d = Math.abs(a - b);
    return Math.min(d, 1 - d);
  }

  function phaseSpread(phases) {
    if (phases.length < 2) return 0;
    var max = 0;
    for (var i = 0; i < phases.length; i++) {
      for (var j = i + 1; j < phases.length; j++) {
        max = Math.max(max, phaseDist(phases[i], phases[j]));
      }
    }
    return max;
  }

  // ── SVG helpers ───────────────────────────────────────────────────────────
  var MOON_RADIUS = { tiny: 10, small: 15, medium: 22, large: 30 };

  // Lit-area SVG path centered at origin, radius r
  function moonPhasePath(r, phase) {
    var p = ((phase % 1) + 1) % 1;
    if (p < 0.01 || p > 0.99) return '';
    if (Math.abs(p - 0.5) < 0.01) {
      return 'M ' + (-r) + ' 0 A ' + r + ' ' + r + ' 0 1 1 ' + r + ' 0 A ' + r + ' ' + r + ' 0 1 1 ' + (-r) + ' 0 Z';
    }
    var waxing     = p < 0.5;
    var ex         = Math.cos(p * 2 * Math.PI) * r;
    var absEx      = Math.abs(ex);
    var outerSweep = waxing ? 1 : 0;
    var innerSweep = waxing ? (ex >= 0 ? 0 : 1) : (ex <= 0 ? 1 : 0);
    if (absEx < 1) {
      return 'M 0 ' + (-r) + ' A ' + r + ' ' + r + ' 0 0 ' + outerSweep + ' 0 ' + r + ' L 0 ' + (-r) + ' Z';
    }
    return 'M 0 ' + (-r) + ' A ' + r + ' ' + r + ' 0 0 ' + outerSweep + ' 0 ' + r
      + ' A ' + absEx + ' ' + r + ' 0 0 ' + innerSweep + ' 0 ' + (-r) + ' Z';
  }

  // Small moon icon SVG (for moon cards)
  function moonIconSVG(moon, day, size) {
    var r     = Math.floor(size / 2) - 2;
    var phase = moonPhase(moon, day);
    var cx    = size / 2, cy = size / 2;
    var lit   = moonPhasePath(r, phase);
    var litPath = lit
      ? '<g transform="translate(' + cx + ',' + cy + ')"><path d="' + lit + '" fill="' + moon.color + '"/></g>'
      : '';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size
      + '" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#060810"/>'
      + litPath
      + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + moon.color + '" stroke-width="1" opacity="0.35"/>'
      + '</svg>';
  }

  // Deterministic star field
  function seeded(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // Full night sky SVG panel
  function nightSkySVG(calendar, day) {
    var W = 336, H = 130;
    var moons = calendar.moons;

    var stars = '';
    for (var si = 0; si < 90; si++) {
      var sx = (seeded(si * 3)     * W).toFixed(1);
      var sy = (seeded(si * 3 + 1) * H).toFixed(1);
      var sr = (seeded(si * 3 + 2) * 0.9 + 0.2).toFixed(2);
      var so = (seeded(si * 7 + 5) * 0.5 + 0.25).toFixed(2);
      stars += '<circle cx="' + sx + '" cy="' + sy + '" r="' + sr + '" fill="#fff" opacity="' + so + '"/>';
    }

    var moonSvgs = '';
    var step = W / (moons.length + 1);
    for (var mi = 0; mi < moons.length; mi++) {
      var moon  = moons[mi];
      var r     = MOON_RADIUS[moon.size] || 20;
      var mx    = step * (mi + 1);
      var my    = H / 2 + (mi % 2 === 1 ? 14 : -14);
      var phase = moonPhase(moon, day);
      var ill   = illumination(phase);
      var lit   = moonPhasePath(r, phase);

      // Glow halo
      var glowOp = (ill * 0.35 + 0.04).toFixed(2);
      moonSvgs += '<circle cx="' + mx + '" cy="' + my + '" r="' + (r + 9) + '" fill="' + moon.color + '" opacity="' + glowOp + '" filter="url(#cel-glow)"/>';
      // Shadow disk
      moonSvgs += '<circle cx="' + mx + '" cy="' + my + '" r="' + r + '" fill="#060810"/>';
      // Lit area
      if (lit) {
        moonSvgs += '<g transform="translate(' + mx + ',' + my + ')"><path d="' + lit + '" fill="' + moon.color + '"/></g>';
      }
      // Rim
      moonSvgs += '<circle cx="' + mx + '" cy="' + my + '" r="' + r + '" fill="none" stroke="' + moon.color + '" stroke-width="1" opacity="0.3"/>';
      // Name label
      moonSvgs += '<text x="' + mx + '" y="' + (my + r + 11) + '" text-anchor="middle" font-size="9" fill="' + moon.color + '" opacity="0.75" font-family="Georgia,serif">' + moon.name + '</text>';
    }

    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'
      + '<defs>'
      + '<radialGradient id="cel-sky" cx="50%" cy="40%">'
      + '<stop offset="0%" stop-color="#0c1225"/>'
      + '<stop offset="100%" stop-color="#020408"/>'
      + '</radialGradient>'
      + '<filter id="cel-glow">'
      + '<feGaussianBlur stdDeviation="5" result="blur"/>'
      + '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'
      + '</filter>'
      + '</defs>'
      + '<rect width="' + W + '" height="' + H + '" rx="6" fill="url(#cel-sky)"/>'
      + stars
      + moonSvgs
      + '</svg>';
  }

  // ── Event detection ───────────────────────────────────────────────────────
  function getTodayEvents(calendar, day) {
    var moons   = calendar.moons;
    var phases  = moons.map(function (m) { return moonPhase(m, day); });
    var phasesP = moons.map(function (m) { return moonPhase(m, day - 1); });
    var phasesN = moons.map(function (m) { return moonPhase(m, day + 1); });
    var events  = [];

    // Full moons (local illumination maximum)
    moons.forEach(function (moon, i) {
      var ill = illumination(phases[i]);
      if (ill > 0.97 && ill >= illumination(phasesP[i]) && ill >= illumination(phasesN[i])) {
        events.push({ label: moon.name + ' — Full Moon', icon: '🌕', color: '#fde68a', type: 'fullMoon' });
      }
    });

    // New moons (local dist-to-new minimum)
    moons.forEach(function (moon, i) {
      var d  = Math.min(phases[i], 1 - phases[i]);
      var dP = Math.min(phasesP[i], 1 - phasesP[i]);
      var dN = Math.min(phasesN[i], 1 - phasesN[i]);
      if (d < 0.03 && d <= dP && d <= dN) {
        events.push({ label: moon.name + ' — New Moon', icon: '🌑', color: '#94a3b8', type: 'newMoon' });
      }
    });

    if (moons.length >= 2) {
      var spread  = phaseSpread(phases);
      var spreadP = phaseSpread(phasesP);
      var spreadN = phaseSpread(phasesN);
      var isPeak  = spread <= spreadP && spread <= spreadN;

      if (spread < 0.06 && isPeak) {
        var moonNames   = moons.map(function (m) { return m.name; }).join(' & ');
        var allNearFull = phases.every(function (p) { return illumination(p) > 0.94; });
        if (allNearFull) {
          // Lunar eclipse: full-moon conjunction — planet's shadow falls across all moons
          events.push({ label: 'Lunar Eclipse — ' + moonNames + ' pass through the world\'s shadow', icon: '◎', color: '#f87171', type: 'eclipse' });
        } else {
          events.push({ label: moonNames + ' Conjunction', icon: '✦', color: '#c084fc', type: 'conjunction' });
        }
      }

      // Opposition (2-moon worlds only)
      if (moons.length === 2) {
        var dist  = phaseDist(phases[0], phases[1]);
        var distP = phaseDist(phasesP[0], phasesP[1]);
        var distN = phaseDist(phasesN[0], phasesN[1]);
        if (dist > 0.47 && dist >= distP && dist >= distN) {
          events.push({ label: moons[0].name + ' & ' + moons[1].name + ' Opposition', icon: '↔', color: '#60a5fa', type: 'opposition' });
        }
      }
    }

    return events;
  }

  // ── Year event scan ───────────────────────────────────────────────────────
  function getYearEvents(calendar, year) {
    var startDay = (year - 1) * calendar.daysPerYear;
    var endDay   = year * calendar.daysPerYear - 1;
    var events   = [];
    var seen     = {};

    for (var d = startDay; d <= endDay; d++) {
      getTodayEvents(calendar, d).forEach(function (e) {
        var key = e.type + '-' + d;
        if (!seen[key]) {
          seen[key] = true;
          events.push({ day: d, yearDay: d - startDay + 1, type: e.type, label: e.label, icon: e.icon, color: e.color });
        }
      });
    }

    return events.sort(function (a, b) { return a.day - b.day; });
  }

  function findNextEvent(calendar, currentDay) {
    var year       = Math.floor((currentDay - 1) / calendar.daysPerYear) + 1;
    var yearEvents = getYearEvents(calendar, year);
    var next       = yearEvents.filter(function (e) { return e.day > currentDay; });
    if (next.length > 0) return next[0];
    var nextYear = getYearEvents(calendar, year + 1);
    return nextYear.length > 0 ? nextYear[0] : null;
  }

  function findPrevEvent(calendar, currentDay) {
    var year       = Math.floor((currentDay - 1) / calendar.daysPerYear) + 1;
    var yearEvents = getYearEvents(calendar, year);
    var prev       = yearEvents.filter(function (e) { return e.day < currentDay; });
    if (prev.length > 0) return prev[prev.length - 1];
    if (year > 1) {
      var prevYear = getYearEvents(calendar, year - 1);
      return prevYear.length > 0 ? prevYear[prevYear.length - 1] : null;
    }
    return null;
  }

  // ── Day helpers ───────────────────────────────────────────────────────────
  function dayToYearDay(cal, day) {
    return ((day - 1) % cal.daysPerYear) + 1;
  }

  function dayToYear(cal, day) {
    return Math.floor((day - 1) / cal.daysPerYear) + 1;
  }

  function getCurrentDay() {
    if (typeof SimpleCalendar !== 'undefined' && SimpleCalendar.api) {
      try {
        var cal    = getCalendar();
        var dt     = SimpleCalendar.api.currentDateTime();
        var offset = game.settings.get(MODULE_ID, 'dayOffset') || 0;
        var doy    = dt.dayOfTheYear !== undefined ? dt.dayOfTheYear : (dt.day || 0);
        return Math.max(1, dt.year * cal.daysPerYear + doy + 1 + offset);
      } catch (e) { /* fall through */ }
    }
    return game.settings.get(MODULE_ID, 'currentDay') || 1;
  }

  function setCurrentDay(day) {
    game.settings.set(MODULE_ID, 'currentDay', Math.max(1, day));
  }

  // ── Boons & pitfalls ─────────────────────────────────────────────────────
  function getBP(calendar, events) {
    var boons = [], pitfalls = [];
    events.forEach(function (e) {
      var fx = calendar.eventEffects && calendar.eventEffects[e.type];
      if (fx) {
        (fx.boons    || []).forEach(function (b) { boons.push(b);    });
        (fx.pitfalls || []).forEach(function (p) { pitfalls.push(p); });
      }
    });
    return { boons: boons, pitfalls: pitfalls };
  }

  // ── Foundry Application ───────────────────────────────────────────────────
  class CelestialCalendarApp extends Application {
    constructor() {
      super();
      this._day      = getCurrentDay();
      this._scActive = false;
    }

    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        id:        MODULE_ID + '-panel',
        title:     '✦ Celestial Calendar',
        template:  'modules/' + MODULE_ID + '/templates/panel.hbs',
        width:     370,
        height:    'auto',
        resizable: true,
        popOut:    true,
        classes:   ['cel-app'],
      });
    }

    getData() {
      var cal     = getCalendar();
      var day     = this._day;
      var year    = dayToYear(cal, day);

      var moonData = cal.moons.map(function (moon) {
        var phase = moonPhase(moon, day);
        return {
          id:        moon.id,
          name:      moon.name,
          color:     moon.color,
          orbitDays: moon.orbitDays,
          phaseName: phaseName(phase),
          illum:     illuminationPct(phase),
          svgIcon:   moonIconSVG(moon, day, 52),
        };
      });

      var events          = getTodayEvents(cal, day);
      var bp              = getBP(cal, events);
      var yearEventsCount = getYearEvents(cal, year).length;

      return {
        calName:         cal.name,
        day:             dayToYearDay(cal, day),
        year:            year,
        moons:           moonData,
        skyHtml:         nightSkySVG(cal, day),
        events:          events,
        hasEvents:       events.length > 0,
        boons:           bp.boons,
        pitfalls:        bp.pitfalls,
        hasBP:           bp.boons.length > 0 || bp.pitfalls.length > 0,
        yearEventsCount: yearEventsCount,
        scActive:        this._scActive,
      };
    }

    activateListeners(html) {
      super.activateListeners(html);
      var self = this;
      var cal  = getCalendar();

      html.find('[data-action="nav"]').on('click', function () {
        var delta = parseInt(this.dataset.delta, 10);
        self._day = Math.max(1, self._day + delta);
        if (!self._scActive) setCurrentDay(self._day);
        self.render(false);
      });

      html.find('[data-action="prev-event"]').on('click', function () {
        var prev = findPrevEvent(cal, self._day);
        if (prev) { self._day = prev.day; if (!self._scActive) setCurrentDay(self._day); self.render(false); }
      });

      html.find('[data-action="next-event"]').on('click', function () {
        var next = findNextEvent(cal, self._day);
        if (next) { self._day = next.day; if (!self._scActive) setCurrentDay(self._day); self.render(false); }
      });

      html.find('[data-action="reset"]').on('click', function () {
        self._day = getCurrentDay();
        self.render(false);
      });

      html.find('[data-action="edit-calendar"]').on('click', function () {
        openEditor();
      });
    }

    syncToSC() {
      this._scActive = true;
      this._day      = getCurrentDay();
      if (this.rendered) this.render(false);
    }
  }

  // ── Calendar Editor Application ───────────────────────────────────────────
  var EVENT_TYPES = [
    { type: 'fullMoon',    label: 'Full Moon',    icon: '🌕', color: '#fde68a' },
    { type: 'newMoon',     label: 'New Moon',     icon: '🌑', color: '#94a3b8' },
    { type: 'conjunction', label: 'Conjunction',  icon: '✦',  color: '#c084fc' },
    { type: 'opposition',  label: 'Opposition',   icon: '↔',  color: '#60a5fa' },
    { type: 'eclipse',     label: 'Eclipse',      icon: '◎',  color: '#f87171' },
  ];

  class CelestialEditorApp extends Application {
    constructor() {
      super();
      // Work on a deep copy so Cancel discards all changes
      this._cal = JSON.parse(JSON.stringify(getCalendar()));
    }

    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        id:        MODULE_ID + '-editor',
        title:     '⚙ Celestial Calendar — Edit World',
        template:  'modules/' + MODULE_ID + '/templates/editor.hbs',
        width:     500,
        height:    'auto',
        resizable: true,
        popOut:    true,
        classes:   ['cel-app', 'cel-editor'],
      });
    }

    getData() {
      var cal = this._cal;
      // Ensure eventEffects exists for all types
      EVENT_TYPES.forEach(function (et) {
        if (!cal.eventEffects) cal.eventEffects = {};
        if (!cal.eventEffects[et.type]) cal.eventEffects[et.type] = { boons: [], pitfalls: [] };
      });
      return {
        calName:     cal.name,
        daysPerYear: cal.daysPerYear,
        moons: cal.moons.map(function (m, i) {
          return {
            index:      i,
            id:         m.id,
            name:       m.name,
            orbitDays:  m.orbitDays,
            size:       m.size,
            color:      m.color,
            startPhase: m.startPhase || 0,
          };
        }),
        eventTypes: EVENT_TYPES.map(function (et) {
          var fx = cal.eventEffects[et.type] || { boons: [], pitfalls: [] };
          return {
            type:     et.type,
            label:    et.label,
            icon:     et.icon,
            color:    et.color,
            boons:    fx.boons.join('\n'),
            pitfalls: fx.pitfalls.join('\n'),
          };
        }),
      };
    }

    // Read current form values back into this._cal (called before any re-render)
    _syncFromForm(html) {
      var cal = this._cal;
      var $h  = (typeof jQuery !== 'undefined' && html instanceof HTMLElement) ? jQuery(html) : html;
      if (!$h || typeof $h.find !== 'function') return;

      cal.name       = ($h.find('[name="calName"]').val()      || '').trim() || cal.name;
      cal.daysPerYear = parseInt($h.find('[name="daysPerYear"]').val(), 10) || cal.daysPerYear;

      cal.moons.forEach(function (moon, i) {
        moon.name       = ($h.find('[name="moon-name-'  + i + '"]').val() || '').trim() || moon.name;
        moon.orbitDays  = parseInt($h.find('[name="moon-orbit-' + i + '"]').val(), 10) || moon.orbitDays;
        moon.size       = $h.find('[name="moon-size-'  + i + '"]').val() || moon.size;
        moon.color      = $h.find('[name="moon-color-' + i + '"]').val() || moon.color;
        moon.startPhase = parseFloat($h.find('[name="moon-start-' + i + '"]').val()) || 0;
      });

      EVENT_TYPES.forEach(function (et) {
        var boons    = ($h.find('[name="boons-'    + et.type + '"]').val() || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        var pitfalls = ($h.find('[name="pitfalls-' + et.type + '"]').val() || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        cal.eventEffects[et.type] = { boons: boons, pitfalls: pitfalls };
      });
    }

    activateListeners(html) {
      super.activateListeners(html);
      var self = this;
      var $h   = (typeof jQuery !== 'undefined' && html instanceof HTMLElement) ? jQuery(html) : html;

      // Set select values (Handlebars has no reliable eq helper across all FVT versions)
      self._cal.moons.forEach(function (moon, i) {
        $h.find('[name="moon-size-' + i + '"]').val(moon.size);
      });

      // Add moon
      $h.find('[data-action="add-moon"]').on('click', function () {
        self._syncFromForm($h);
        self._cal.moons.push({
          id: 'moon' + Date.now(),
          name: 'New Moon',
          orbitDays: 28,
          size: 'medium',
          color: '#e2e8f0',
          startPhase: 0,
          description: '',
        });
        self.render(false);
      });

      // Remove moon
      $h.find('[data-action="remove-moon"]').on('click', function () {
        var idx = parseInt(this.dataset.index, 10);
        self._syncFromForm($h);
        self._cal.moons.splice(idx, 1);
        if (self._cal.moons.length === 0) {
          ui.notifications.warn('Celestial Calendar | At least one moon is required.');
          self._cal.moons.push({ id: 'moon1', name: 'Moon', orbitDays: 30, size: 'medium', color: '#e2e8f0', startPhase: 0, description: '' });
        }
        self.render(false);
      });

      // Save
      $h.find('[data-action="save"]').on('click', function () {
        self._syncFromForm($h);
        var cal = self._cal;
        if (!cal.name || cal.moons.length === 0) {
          ui.notifications.warn('Celestial Calendar | World needs a name and at least one moon.');
          return;
        }
        game.settings.set(MODULE_ID, 'calendarData', JSON.stringify(cal));
        ui.notifications.info('Celestial Calendar | "' + cal.name + '" saved.');
        if (_panel && _panel.rendered) _panel.render(false);
        self.close();
      });

      // Cancel
      $h.find('[data-action="cancel"]').on('click', function () {
        self.close();
      });
    }
  }

  // ── Module lifecycle ──────────────────────────────────────────────────────
  var _panel  = null;
  var _editor = null;

  function openPanel() {
    if (!_panel) _panel = new CelestialCalendarApp();
    if (_panel.rendered) _panel.close();
    else _panel.render(true);
  }

  function openEditor() {
    if (!_editor || !_editor.rendered) _editor = new CelestialEditorApp();
    _editor.render(true);
  }

  Hooks.once('init', function () {
    game.settings.register(MODULE_ID, 'currentDay', {
      name:    'Current Campaign Day',
      hint:    'The current absolute campaign day. Ignored when Simple Calendar is active.',
      scope:   'world',
      config:  true,
      type:    Number,
      default: 1,
      onChange: function () {
        if (_panel && _panel.rendered) { _panel._day = getCurrentDay(); _panel.render(false); }
      },
    });

    game.settings.register(MODULE_ID, 'dayOffset', {
      name:    'Simple Calendar Day Offset',
      hint:    'Days to add or subtract when converting Simple Calendar dates to campaign days.',
      scope:   'world',
      config:  true,
      type:    Number,
      default: 0,
    });

    game.settings.register(MODULE_ID, 'calendarData', {
      name:    'Custom Calendar JSON',
      hint:    'Paste the exported JSON from DnD Parser Toolkit → Celestial Calculator → Settings to use your custom world. Leave blank to use Eldoria (default).',
      scope:   'world',
      config:  true,
      type:    String,
      default: '',
      onChange: function () {
        if (_panel && _panel.rendered) _panel.render(false);
      },
    });

    console.log('Celestial Calendar | Module initialised. Default world: Eldoria.');
  });

  Hooks.once('ready', function () {
    var mod = game.modules.get(MODULE_ID);
    if (mod) {
      mod.api = {
        openPanel:      openPanel,
        getCurrentDay:  getCurrentDay,
        setCurrentDay:  setCurrentDay,
        getCalendar:    getCalendar,
        getTodayEvents: getTodayEvents,
        getYearEvents:  getYearEvents,
      };
    }

    Hooks.on('simple-calendar-date-time-change', function () {
      if (_panel) _panel.syncToSC();
    });

    ui.notifications.info('✦ Celestial Calendar loaded. Click the moon button in the Journal tab sidebar.');
  });

  // ── Scene controls button (primary access — works standalone like Simple Calendar) ──
  // Fires on v11/v12. getSceneControls fires on v13+. We register both defensively.
  function addSceneControlButton(controls) {
    try {
      if (!Array.isArray(controls)) return;
      if (controls.some(function (c) { return c.name === MODULE_ID; })) return;
      controls.push({
        name:        MODULE_ID,
        title:       '✦ Celestial Calendar',
        icon:        'fas fa-moon',
        layer:       'tokens',
        tools: [{
          name:    'open-panel',
          title:   'Open Night Sky',
          icon:    'fas fa-moon',
          button:  true,
          onClick: function () { openPanel(); },
        }],
      });
    } catch (e) {
      console.warn('Celestial Calendar | Could not add scene control button:', e);
    }
  }

  Hooks.on('getSceneControlButtons', addSceneControlButton); // v11 / v12
  Hooks.on('getSceneControls',       addSceneControlButton); // v13+

  // ── Journal sidebar button (secondary access, best-effort across versions) ──
  // v11/v12: html is a jQuery object.
  // v13: html is a native HTMLElement — wrap it if jQuery is present.
  function injectSidebarButton(html) {
    try {
      var root = (typeof jQuery !== 'undefined' && html instanceof HTMLElement)
        ? jQuery(html) : html;
      if (!root || typeof root.find !== 'function') return;
      if (root.find('.cel-journal-btn').length > 0) return;

      // Try selectors in order from most-specific (v12) to broadest (v13 fallback)
      var $target = root.find([
        '.directory-header .header-actions',
        '.directory-header .action-buttons',
        '.directory-header .controls',
        '.directory-header',
      ].join(', ')).first();

      if (!$target.length) return;

      var $btn = jQuery('<button>', {
        type:  'button',
        class: 'cel-journal-btn',
        title: 'Celestial Calendar — Night Sky',
        html:  '<i class="fas fa-moon"></i>',
      });
      $btn.on('click', function (e) { e.preventDefault(); e.stopPropagation(); openPanel(); });
      $target.append($btn);
    } catch (e) {
      console.warn('Celestial Calendar | Could not inject journal sidebar button:', e);
    }
  }

  Hooks.on('renderJournalDirectory', function (app, html) { injectSidebarButton(html); });
  Hooks.on('renderSidebarTab',       function (app, html) {
    if (!app || !app.constructor) return;
    if (app.constructor.name !== 'JournalDirectory') return;
    injectSidebarButton(html);
  });

})();
