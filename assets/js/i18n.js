/* ==========================================================================
   i18n engine  —  zero dependencies
   - English source text lives directly in index.html (SEO friendly, crawlable)
   - Locale files register themselves at window.LOCALES[code]
   - Missing keys gracefully fall back to the English source text
   - Supports: **bold** markup, placeholder translation, RTL, hreflang,
     canonical URL, document title / description, localStorage + ?lang=
   ========================================================================== */
(function () {
  'use strict';

  window.LOCALES = window.LOCALES || {};

  var LANGS = [
    { code: 'en', label: 'English',      native: 'English',     dir: 'ltr', short: 'EN' },
    { code: 'zh', label: 'Chinese',      native: '简体中文',      dir: 'ltr', short: 'ZH' },
    { code: 'es', label: 'Spanish',      native: 'Español',     dir: 'ltr', short: 'ES' },
    { code: 'fr', label: 'French',       native: 'Français',    dir: 'ltr', short: 'FR' },
    { code: 'de', label: 'German',       native: 'Deutsch',     dir: 'ltr', short: 'DE' },
    { code: 'ar', label: 'Arabic',       native: 'العربية',      dir: 'rtl', short: 'AR' }
  ];

  var FALLBACK = 'en';
  var STORAGE_KEY = 'hb_lang';

  function byCode(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return null;
  }

  /* Resolve "a.b.0" style paths so locale files can use nested arrays */
  function resolve(obj, path) {
    if (!obj) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
    var parts = path.split('.'), cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function markup(text) {
    return String(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  /* Remember the original English markup once */
  function captureOriginals() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].dataset.i18nOriginal === undefined) {
        nodes[i].dataset.i18nOriginal = nodes[i].innerHTML;
      }
    }
    var ph = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < ph.length; j++) {
      if (ph[j].dataset.i18nOriginalPlaceholder === undefined) {
        ph[j].dataset.i18nOriginalPlaceholder = ph[j].getAttribute('placeholder') || '';
      }
    }
  }

  function translate(lang) {
    var dict = window.LOCALES[lang] || {};
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], key = el.dataset.i18n;
      var val = resolve(dict, key);
      if (val === undefined || val === null || val === '') {
        el.innerHTML = el.dataset.i18nOriginal;
        continue;
      }
      var html = markup(val);
      var arrow = el.querySelector('.arrow');
      if (arrow && html.indexOf('class="arrow"') === -1) html += arrow.outerHTML;
      el.innerHTML = html;
    }

    var phs = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < phs.length; j++) {
      var p = phs[j], v = resolve(dict, p.dataset.i18nPlaceholder);
      p.setAttribute('placeholder', v === undefined ? p.dataset.i18nOriginalPlaceholder : v);
    }

    /* document meta */
    var metaTitle = resolve(dict, 'meta.title');
    if (metaTitle) document.title = metaTitle;
    var metaDesc = resolve(dict, 'meta.description');
    if (metaDesc) {
      var m = document.querySelector('meta[name="description"]');
      if (m) m.setAttribute('content', metaDesc);
      var og = document.querySelector('meta[property="og:description"]');
      if (og) og.setAttribute('content', metaDesc);
      var ogt = document.querySelector('meta[property="og:title"]');
      if (ogt && metaTitle) ogt.setAttribute('content', metaTitle);
    }
  }

  function updateLinks(lang) {
    var url = new URL(window.location.href);
    var base = url.origin + url.pathname;
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', base + (lang === FALLBACK ? '' : '?lang=' + lang));
    var alts = document.querySelectorAll('link[rel="alternate"][hreflang]');
    for (var i = 0; i < alts.length; i++) {
      var h = alts[i].getAttribute('hreflang');
      alts[i].setAttribute('href', base + (h === 'x-default' ? '' : '?lang=' + h));
    }
  }

  function buildMenu(current) {
    var menu = document.getElementById('langMenu');
    if (!menu) return;
    menu.innerHTML = '';
    LANGS.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      if (l.code === current) b.className = 'active';
      b.innerHTML = '<span>' + l.native + '</span><span class="native">' + l.short + '</span>';
      b.addEventListener('click', function () { setLang(l.code); closeMenu(); });
      menu.appendChild(b);
    });
  }

  function closeMenu() {
    var sw = document.getElementById('langSwitch'), btn = document.getElementById('langBtn');
    if (sw) sw.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function setLang(lang, persist) {
    var meta = byCode(lang);
    if (!meta) lang = FALLBACK, meta = byCode(FALLBACK);
    captureOriginals();
    translate(lang);

    var html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', meta.dir);

    var code = document.getElementById('langCode');
    if (code) code.textContent = meta.short;
    buildMenu(lang);
    updateLinks(lang);

    if (persist !== false) {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
      var url = new URL(window.location.href);
      if (lang === FALLBACK) url.searchParams.delete('lang');
      else url.searchParams.set('lang', lang);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    window.currentLang = lang;
    window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } }));
  }

  function detectLang() {
    var url = new URL(window.location.href);
    var q = url.searchParams.get('lang');
    if (q && byCode(q)) return q;
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved && byCode(saved)) return saved;
    /* A global B2B site defaults to English (x-default). Visitors choose
       their language explicitly; the choice is remembered for next time. */
    return FALLBACK;
  }

  function init() {
    captureOriginals();
    setLang(detectLang(), false);

    var sw = document.getElementById('langSwitch'), btn = document.getElementById('langBtn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = sw.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    document.addEventListener('click', function (e) {
      if (sw && !sw.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

    window.addEventListener('popstate', function () { setLang(detectLang(), false); });
  }

  window.I18N = {
    langs: LANGS,
    setLang: setLang,
    t: function (key) { return resolve(window.LOCALES[window.currentLang] || {}, key); },
    get lang() { return window.currentLang || FALLBACK; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
