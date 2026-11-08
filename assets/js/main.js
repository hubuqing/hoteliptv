/* ==========================================================================
   Site interactions — zero dependencies
   ========================================================================== */
(function () {
  'use strict';

  /* Small message table for runtime feedback (form / callback) */
  var MSG = {
    en: { err: 'Please complete the required fields with valid information.', ok: 'Thank you! Your request has been prepared.', send: 'Send by email', cb: 'Thanks! Our engineering team will contact you shortly.', sending: 'Sending your request…', ok2: 'Thanks! We have received your request and our team will contact you shortly.', fail: 'Online submission is unavailable right now. Please send it by email instead.' },
    zh: { err: '请完整填写必填项并确认信息有效。', ok: '谢谢！您的申请已准备好。', send: '通过邮件发送', cb: '谢谢！工程团队将尽快与您联系。', sending: '正在提交…', ok2: '谢谢！我们已收到您的申请，团队会尽快与您联系。', fail: '在线提交暂不可用，请改用下方邮件链接发送。' },
    es: { err: 'Complete los campos obligatorios con datos válidos.', ok: '¡Gracias! Su solicitud está preparada.', send: 'Enviar por correo', cb: '¡Gracias! Nuestro equipo de ingeniería le contactará en breve.', sending: 'Enviando su solicitud…', ok2: '¡Gracias! Hemos recibido su solicitud y nuestro equipo le contactará en breve.', fail: 'El envío en línea no está disponible. Utilice el enlace de correo de abajo.' },
    fr: { err: 'Veuillez compléter les champs obligatoires avec des informations valides.', ok: 'Merci ! Votre demande est prête.', send: 'Envoyer par e-mail', cb: 'Merci ! Notre équipe ingénierie vous contactera très prochainement.', sending: 'Envoi de votre demande…', ok2: 'Merci ! Nous avons reçu votre demande et notre équipe vous contactera rapidement.', fail: 'Le formulaire en ligne est indisponible. Utilisez le lien de courriel ci-dessous.' },
    de: { err: 'Bitte füllen Sie die Pflichtfelder gültig aus.', ok: 'Vielen Dank! Ihre Anfrage ist vorbereitet.', send: 'Per E-Mail senden', cb: 'Vielen Dank! Unser Engineering-Team meldet sich in Kürze.', sending: 'Anfrage wird gesendet…', ok2: 'Vielen Dank! Wir haben Ihre Anfrage erhalten und melden uns in Kürze.', fail: 'Die Online-Übermittlung ist derzeit nicht verfügbar. Bitte nutzen Sie den E-Mail-Link unten.' },
    ar: { err: 'يرجى إكمال الحقول المطلوبة بمعلومات صحيحة.', ok: 'شكراً لك! تم تجهيز طلبك.', send: 'إرسال عبر البريد', cb: 'شكراً لك! سيتواصل معك فريقنا الهندسي قريباً.', sending: 'جارٍ إرسال طلبك…', ok2: 'شكراً لك! استلمنا طلبك وسيتواصل معك فريقنا قريباً.', fail: 'الإرسال عبر الموقع غير متاح حالياً، يرجى استخدام رابط البريد أدناه.' }
  };
  function msg(k) { return (MSG[window.currentLang] || MSG.en)[k] || MSG.en[k]; }

  /* ---------- header shadow + back to top ---------- */
  var header = document.getElementById('siteHeader');
  var backTop = document.getElementById('backTop');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 20);
    if (backTop) backTop.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (backTop) backTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById('navToggle');
  var mobile = document.getElementById('mobileMenu');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var open = mobile.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobile.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        mobile.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- active nav link on scroll ---------- */
  var SECTIONS = ['hero', 'solutions', 'stories', 'features', 'integrations', 'pricing', 'faq', 'book-demo'];
  var navAnchors = document.querySelectorAll('.nav-links a, .mobile-menu a');
  function updateActive() {
    var y = (window.scrollY || window.pageYOffset) + 160;
    var current = SECTIONS[0];
    for (var i = 0; i < SECTIONS.length; i++) {
      var el = document.getElementById(SECTIONS[i]);
      if (el && el.offsetTop <= y) current = SECTIONS[i];
    }
    for (var j = 0; j < navAnchors.length; j++) {
      var a = navAnchors[j];
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    }
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.setAttribute('aria-expanded', 'false');
    q.addEventListener('click', function () {
      var open = item.classList.contains('open');
      faqItems.forEach(function (other) {
        other.classList.remove('open');
        var oq = other.querySelector('.faq-q');
        if (oq) oq.setAttribute('aria-expanded', 'false');
      });
      if (!open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------- demo step switchers ---------- */
  document.querySelectorAll('[data-steps]').forEach(function (block) {
    var buttons = block.querySelectorAll('[data-step-buttons] button');
    var bar = block.querySelector('.demo-progress i');
    if (!buttons.length) return;
    buttons.forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (bar) bar.style.width = ((idx + 1) / buttons.length * 100) + '%';
      });
    });
    if (bar) bar.style.width = (1 / buttons.length * 100) + '%';
  });

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 60) + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- stat counters ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var suffix = (el.textContent.indexOf('+') !== -1) ? '+' : '';
    var start = performance.now(), dur = 1100;
    function frame(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- lead API (Cloudflare Pages Function at /api/leads) ---------- */
  var API = '/api/leads';
  var formOpenedAt = Date.now();

  function postLead(payload) {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, data: j };
      });
    });
  }

  function mailtoFor(d) {
    var body = [
      'Name: ' + (d.name || '-'),
      'Hotel: ' + (d.hotel || '-'),
      'Email: ' + (d.email || '-'),
      'Phone: ' + (d.phone || '-'),
      'Property type: ' + (d.type || '-'),
      'Rooms: ' + (d.rooms || '-'),
      'Message: ' + (d.message || '-')
    ].join('\n');
    return 'mailto:hubuqing@huibu8.net?subject=' +
      encodeURIComponent('Hotel IPTV Demo Request - ' + (d.hotel || d.email || 'Website')) +
      '&body=' + encodeURIComponent(body);
  }

  function showText(box, text) {
    if (!box) return;
    box.textContent = text;
    box.classList.add('show');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showFallback(box, d) {
    if (!box) return;
    box.innerHTML = '';
    var p = document.createElement('span');
    p.textContent = msg('fail') + ' ';
    var a = document.createElement('a');
    a.href = mailtoFor(d);
    a.textContent = msg('send') + ' →';
    a.style.fontWeight = '700';
    a.style.textDecoration = 'underline';
    box.appendChild(p);
    box.appendChild(a);
    box.classList.add('show');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- demo form ---------- */
  var form = document.getElementById('demoForm');
  var errorBox = document.getElementById('formError');
  var successBox = document.getElementById('formSuccess');
  if (form) {
    var submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorBox) errorBox.classList.remove('show');
      if (successBox) successBox.classList.remove('show');

      var name = form.querySelector('#fName');
      var hotel = form.querySelector('#fHotel');
      var email = form.querySelector('#fEmail');
      var phone = form.querySelector('#fPhone');
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (!name.value.trim() || !hotel.value.trim() || !emailOk || !phone.value.trim()) {
        if (errorBox) { errorBox.textContent = msg('err'); errorBox.classList.add('show'); }
        (!name.value.trim() ? name : !hotel.value.trim() ? hotel : !emailOk ? email : phone).focus();
        return;
      }

      var d = new FormData(form);
      var payload = {
        name: d.get('name'), hotel: d.get('hotel'), email: d.get('email'), phone: d.get('phone'),
        type: d.get('type'), rooms: d.get('rooms'), message: d.get('message'),
        website: d.get('website'), source: 'demo',
        lang: window.currentLang || 'en', _ts: formOpenedAt
      };

      if (submitBtn) submitBtn.disabled = true;
      showText(successBox, msg('sending'));

      postLead(payload).then(function (res) {
        if (submitBtn) submitBtn.disabled = false;
        if (res.status === 200 && res.data.ok) {
          showText(successBox, msg('ok2'));
          form.reset();
        } else {
          showFallback(successBox, payload);
        }
        formOpenedAt = Date.now();
      }).catch(function () {
        if (submitBtn) submitBtn.disabled = false;
        showFallback(successBox, payload);
        formOpenedAt = Date.now();
      });
    });
  }

  /* ---------- callback form ---------- */
  var cbForm = document.getElementById('callbackForm');
  if (cbForm) {
    cbForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('cbInput');
      var btn = cbForm.querySelector('button');
      var val = input.value.trim();
      if (!val) { input.focus(); return; }
      var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      var payload = {
        name: '-', hotel: '-',
        email: isEmail ? val : '',
        phone: isEmail ? '' : val,
        message: 'Callback request from website',
        website: '', source: 'callback',
        lang: window.currentLang || 'en', _ts: formOpenedAt
      };
      var note = cbForm.parentNode.querySelector('.cb-note');
      if (!note) {
        note = document.createElement('p');
        note.className = 'cb-note';
        note.style.cssText = 'width:100%;margin:.6rem 0 0;font-size:.8rem;color:#A7F3D0';
        cbForm.parentNode.appendChild(note);
      }
      if (btn) btn.disabled = true;
      note.textContent = msg('sending');

      postLead(payload).then(function (res) {
        if (btn) btn.disabled = false;
        if (res.status === 200 && res.data.ok) {
          note.textContent = msg('ok2');
          input.value = '';
        } else {
          note.textContent = msg('fail');
        }
        formOpenedAt = Date.now();
      }).catch(function () {
        if (btn) btn.disabled = false;
        note.textContent = msg('fail');
        formOpenedAt = Date.now();
      });
    });
  }

  /* ---------- footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- refresh runtime strings when language changes ---------- */
  window.addEventListener('i18n:change', function () {
    if (errorBox && errorBox.classList.contains('show')) errorBox.textContent = msg('err');
    updateActive();
  });
})();
