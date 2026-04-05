/* ================================================================
 * Celestial Calendar — Foundry VTT Module v1.0.0
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
    eventEffects: {
      conjunction: {
        boons: [
          'Healing spells restore an additional 1d8 hit points',
          'Once before the next conjunction, a creature may reroll one failed d20',
        ],
        pitfalls: [
          'Wild magic surges trigger on a 1–3 (instead of 1) on the Wild Magic table',
          'Restless night: werewolves, fiends, and undead are more aggressive',
        ],
      },
      opposition: {
        boons: [
          "Luna's Favor: creatures gain temporary HP equal to 1d10 + character level at dusk",
          "Selene's Insight: advantage on Insight and Arcana checks until dawn",
          'Sharper senses: advantage on Perception checks that rely on sight',
        ],
        pitfalls: [
          'Frayed focus: concentration checks require a DC 10 save each turn, even without damage',
          'Volatile emotions: social interactions are unpredictable — advantage AND disadvantage',
        ],
      },
      fullMoon: {
        boons: [
          "Luna's light: bright moonlight extends to 80 ft, even near open windows indoors",
        ],
        pitfalls: [
          'Lycanthropes must succeed on a DC 15 Wisdom saving throw or be forced to transform',
        ],
      },
      newMoon: {
        boons: [
          'Shadows deepen: rogues and rangers have advantage on Stealth checks outdoors',
        ],
        pitfalls: [
          'Blindsight fails: creatures relying on moonlight for navigation move at half speed outdoors',
        ],
      },
      eclipse: {
        boons: [
          'Blood moon: divination spells cast tonight reveal one additional true detail beyond their normal scope',
          'Lycanthropes who embrace the crimson light may transform voluntarily with no save required',
        ],
        pitfalls: [
          'Undead regain 1d6 hit points at the start of their turns for the duration of the eclipse',
          'The darkened moons unsettle all creatures: Wisdom saving throws have disadvantage until dawn',
        ],
      },
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
    }

    syncToSC() {
      this._scActive = true;
      this._day      = getCurrentDay();
      if (this.rendered) this.render(false);
    }
  }

  // ── Module lifecycle ──────────────────────────────────────────────────────
  var _panel = null;

  function openPanel() {
    if (!_panel) _panel = new CelestialCalendarApp();
    if (_panel.rendered) _panel.close();
    else _panel.render(true);
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
        openPanel:     openPanel,
        getCurrentDay: getCurrentDay,
        setCurrentDay: setCurrentDay,
        getCalendar:   getCalendar,
        getTodayEvents: getTodayEvents,
        getYearEvents:  getYearEvents,
      };
    }

    Hooks.on('simple-calendar-date-time-change', function () {
      if (_panel) _panel.syncToSC();
    });

    ui.notifications.info('✦ Celestial Calendar loaded. Click the moon button in the Journal sidebar.');
  });

  // Moon button in the Journal sidebar
  Hooks.on('renderJournalDirectory', function (app, html) {
    if (html.find('.cel-journal-btn').length) return;
    var btn = $('<button class="cel-journal-btn" title="Celestial Calendar — Night Sky"><i class="fas fa-moon"></i></button>');
    btn.on('click', function (e) { e.preventDefault(); openPanel(); });
    html.find('.directory-header .action-buttons, .directory-header .header-actions').first().append(btn);
  });

})();
