/* Cloudflare Pages Function: /api/leads
 *
 * POST  - receive demo / callback form submissions
 * GET   - list recent leads (requires Authorization: Bearer <ADMIN_TOKEN>)
 *
 * Bindings (Cloudflare Dashboard > Workers & Pages > <project> > Settings > Functions):
 *   LEADS           KV namespace, variable name must be exactly "LEADS"
 *   RESEND_API_KEY  secret, optional - enables email notification
 *   ADMIN_TOKEN     secret, required for the GET endpoint
 *   LEAD_TO_EMAIL   optional, defaults to hubuqing@huibu8.net
 *   MAIL_FROM       optional, defaults to onboarding@resend.dev
 *
 * If neither LEADS nor RESEND_API_KEY is configured the endpoint returns 503
 * with BACKEND_NOT_CONFIGURED, and the front end falls back to a mailto link.
 */

var DEFAULT_TO = 'hubuqing@huibu8.net';
var DEFAULT_FROM = 'HuiBu Website <onboarding@resend.dev>';
var MAX_BODY = 16 * 1024;
var MAX_FIELD = 500;
var MAX_MESSAGE = 4000;
var RATE_WINDOW = 600;   // seconds
var RATE_LIMIT = 8;      // submissions per IP per window

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer'
    }
  });
}

function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max || MAX_FIELD);
}

function sameOrigin(request) {
  var origin = request.headers.get('origin');
  if (!origin) return true; // same-origin form posts may omit Origin
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch (e) {
    return false;
  }
}

function clientIp(request) {
  return clean(
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') || 'unknown', 80
  ).split(',')[0].trim();
}

async function readBody(request) {
  var ct = request.headers.get('content-type') || '';
  var raw = await request.text();
  if (raw.length > MAX_BODY) throw new Error('TOO_LARGE');
  if (ct.indexOf('application/json') >= 0) {
    try { return JSON.parse(raw || '{}'); } catch (e) { throw new Error('BAD_JSON'); }
  }
  var out = {};
  new URLSearchParams(raw).forEach(function (v, k) { out[k] = v; });
  return out;
}

function validate(b) {
  var source = clean(b.source, 40) || 'demo';
  var name = clean(b.name, 120);
  var hotel = clean(b.hotel, 160);
  var email = clean(b.email, 200);
  var phone = clean(b.phone, 80);
  var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  // The callback strip has a single "phone or email" field.
  if (source === 'callback') {
    if (!email && !phone) return { error: 'MISSING_FIELDS' };
    if (email && !emailOk) return { error: 'INVALID_EMAIL' };
    return {
      name: name || '-', hotel: hotel || '-',
      email: email || '-', phone: phone || '-',
      type: '', rooms: '', message: clean(b.message, MAX_MESSAGE),
      source: source, lang: clean(b.lang, 10) || 'en'
    };
  }

  if (!name || !hotel || !email || !phone) return { error: 'MISSING_FIELDS' };
  if (!emailOk) return { error: 'INVALID_EMAIL' };
  return {
    name: name, hotel: hotel, email: email, phone: phone,
    type: clean(b.type, 80), rooms: clean(b.rooms, 40),
    message: clean(b.message, MAX_MESSAGE),
    source: source, lang: clean(b.lang, 10) || 'en'
  };
}

async function rateOk(env, ip) {
  if (!env.LEADS || typeof env.LEADS.get !== 'function') return true;
  var key = 'rate:' + ip;
  var cur = 0;
  try { cur = Number(await env.LEADS.get(key)) || 0; } catch (e) { /* ignore */ }
  if (cur >= RATE_LIMIT) return false;
  try { await env.LEADS.put(key, String(cur + 1), { expirationTtl: RATE_WINDOW }); } catch (e) { /* ignore */ }
  return true;
}

async function sendMail(env, lead) {
  var lines = [
    'New website enquiry - ' + lead.source,
    '',
    'Name:           ' + lead.name,
    'Hotel:          ' + lead.hotel,
    'Email:          ' + lead.email,
    'Phone:          ' + lead.phone,
    'Property type:  ' + (lead.type || '-'),
    'Rooms:          ' + (lead.rooms || '-'),
    'Language:       ' + lead.lang,
    'Received:       ' + lead.createdAt,
    'IP:             ' + lead.ip,
    '',
    'Message:',
    lead.message || '-'
  ];
  var payload = {
    from: env.MAIL_FROM || DEFAULT_FROM,
    to: [env.LEAD_TO_EMAIL || DEFAULT_TO],
    subject: 'Hotel IPTV Demo Request - ' + lead.hotel,
    text: lines.join('\n')
  };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) payload.reply_to = lead.email;

  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer ' + env.RESEND_API_KEY
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('MAIL_HTTP_' + res.status);
}

export async function onRequestPost(context) {
  var request = context.request;
  var env = context.env || {};

  if (!sameOrigin(request)) return json({ ok: false, error: 'BAD_ORIGIN' }, 403);

  var b;
  try {
    b = await readBody(request);
  } catch (e) {
    return json({ ok: false, error: e.message === 'TOO_LARGE' ? 'TOO_LARGE' : 'BAD_BODY' }, 400);
  }

  // Honeypot: bots fill the hidden "website" field. Fail silently.
  if (clean(b.website, 200)) return json({ ok: true, id: 'ok' });
  // Reject submissions fired faster than a human can type.
  var ts = Number(b._ts || 0);
  if (ts && Date.now() - ts < 1500) return json({ ok: true, id: 'ok' });

  var v = validate(b);
  if (v.error) return json({ ok: false, error: v.error }, 400);

  var hasKV = !!(env.LEADS && typeof env.LEADS.put === 'function');
  var hasMail = !!env.RESEND_API_KEY;
  if (!hasKV && !hasMail) return json({ ok: false, error: 'BACKEND_NOT_CONFIGURED' }, 503);

  if (!await rateOk(env, clientIp(request))) {
    return json({ ok: false, error: 'RATE_LIMITED' }, 429);
  }

  var now = new Date();
  var id = now.toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
  var lead = {
    id: id,
    createdAt: now.toISOString(),
    source: v.source,
    lang: v.lang,
    name: v.name,
    hotel: v.hotel,
    email: v.email,
    phone: v.phone,
    type: v.type,
    rooms: v.rooms,
    message: v.message,
    ip: clientIp(request),
    ua: clean(request.headers.get('user-agent') || '', 300)
  };

  var stored = false;
  var mailed = false;
  var mailError = '';

  if (hasKV) {
    try {
      await env.LEADS.put('lead:' + id, JSON.stringify(lead));
      stored = true;
    } catch (e) { /* delivery may still succeed by email */ }
  }
  if (hasMail) {
    try {
      await sendMail(env, lead);
      mailed = true;
    } catch (e) {
      mailError = String((e && e.message) || e);
    }
  }
  if (!stored && !mailed) {
    return json({ ok: false, error: 'DELIVERY_FAILED', detail: mailError }, 502);
  }
  return json({ ok: true, id: id, stored: stored, mailed: mailed });
}

export async function onRequestGet(context) {
  var env = context.env || {};
  var request = context.request;

  if (!env.ADMIN_TOKEN) return json({ ok: false, error: 'ADMIN_NOT_CONFIGURED' }, 503);
  if ((request.headers.get('authorization') || '') !== 'Bearer ' + env.ADMIN_TOKEN) {
    return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
  }
  if (!env.LEADS || typeof env.LEADS.list !== 'function') {
    return json({ ok: false, error: 'KV_NOT_CONFIGURED' }, 503);
  }

  var list = await env.LEADS.list({ prefix: 'lead:' });
  var keys = (list.keys || []).map(function (k) { return k.name; }).sort().reverse().slice(0, 200);
  var items = [];
  for (var i = 0; i < keys.length; i++) {
    try {
      var raw = await env.LEADS.get(keys[i]);
      if (raw) items.push(JSON.parse(raw));
    } catch (e) { /* skip malformed record */ }
  }
  return json({ ok: true, count: items.length, items: items });
}
