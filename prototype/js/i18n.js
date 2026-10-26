/* ===========================================================================
   TH / EN language switch (D77).

   The English sentence is the key:

     T('Task moved to {status}', { status: label })

   In English the key is returned with its {placeholders} filled. In Thai the
   template in js/i18n-th.js is used instead — word order is the translator's
   to choose, which is why every sentence that joins names and words is a
   template with named slots rather than string concatenation. A key with no
   Thai entry falls back to English, so a missing translation shows English
   rather than breaking the screen; I18n.misses() lists them for the tests.

   Mock data (task titles, comments, people's names) is data, not interface,
   and stays as seeded.
   =========================================================================== */

(function (global) {
  'use strict';

  var TH = {};          /* filled by js/i18n-th.js */
  var NOUN_TH = {};     /* plural() nouns: 'task' -> 'งาน' */
  var missed = {};
  var softMissed = {};

  function locale() {
    var S = global.AppState;
    return S && S.getState() && S.getState().locale === 'th' ? 'th' : 'en';
  }

  function fill(template, vars) {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, function (all, name) {
      return vars[name] === undefined || vars[name] === null ? all : String(vars[name]);
    });
  }

  function t(key, vars) {
    if (key === null || key === undefined) return key;
    key = String(key);
    if (locale() === 'th') {
      if (Object.prototype.hasOwnProperty.call(TH, key)) return fill(TH[key], vars);
      if (/[A-Za-z]/.test(key)) missed[key] = true;
    }
    return fill(key, vars);
  }

  /* The soft lookup UI.el() applies to every string it renders: an exact
     dictionary hit is translated, anything else passes through untouched.
     That is what lets a plain literal like 'Add Task' translate without being
     wrapped, while a task title or a person's name is never altered. Built
     sentences cannot rely on this — they go through t() with a template. */
  function soft(value) {
    if (typeof value !== 'string' || locale() !== 'th') return value;
    if (Object.prototype.hasOwnProperty.call(TH, value)) return TH[value];
    /* Most of these are data (names, task titles) and are meant to pass
       through; the translation check filters those out and flags the rest. */
    if (/[A-Za-z]{2}/.test(value)) softMissed[value] = true;
    return value;
  }

  /* A lookup table whose values translate on read — STATUS_LABEL[status] and
     friends keep working at every call site, in whichever language is on. */
  function labels(map) {
    var out = {};
    Object.keys(map).forEach(function (k) {
      Object.defineProperty(out, k, {
        enumerable: true,
        get: function () { return t(map[k]); }
      });
    });
    return out;
  }

  /* "3 tasks" / "3 งาน" — Thai has no plural, so the noun is just translated. */
  function plural(count, word) {
    if (locale() === 'th') {
      var noun = NOUN_TH[word];
      if (noun === undefined) { missed['noun:' + word] = true; noun = word; }
      return count + ' ' + noun;
    }
    if (count === 1) return count + ' ' + word;
    var es = /(s|x|z|ch|sh)$/i.test(word);
    return count + ' ' + word + (es ? 'es' : 's');
  }

  function add(dictionary, nouns) {
    Object.keys(dictionary || {}).forEach(function (k) { TH[k] = dictionary[k]; });
    Object.keys(nouns || {}).forEach(function (k) { NOUN_TH[k] = nouns[k]; });
  }

  function setLocale(next) {
    global.AppState.setState({ locale: next === 'th' ? 'th' : 'en' });
    document.documentElement.lang = next === 'th' ? 'th' : 'en';
  }

  global.I18n = {
    t: t,
    soft: soft,
    labels: labels,
    plural: plural,
    locale: locale,
    setLocale: setLocale,
    add: add,
    misses: function () { return Object.keys(missed); },
    softMisses: function () { return Object.keys(softMissed); },
    clearMisses: function () { missed = {}; softMissed = {}; }
  };
  global.T = t;
}(window));
