'use strict';

// Transactional email via the SMTP credentials injected by the host
// (ServerHoster → Cloudflare Email: smtp.mx.cloudflare.net:465, user "api_token").
// No-ops when SMTP env is absent so the contact form never breaks in dev.
const nodemailer = require('nodemailer');

let cachedTransport;
let tried = false;

function getTransport() {
  if (tried) return cachedTransport;
  tried = true;
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !pass) {
    cachedTransport = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT) || 465;
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS (Cloudflare SMTP)
    auth: { user: process.env.SMTP_USER || 'api_token', pass },
  });
  return cachedTransport;
}

function fromHeader() {
  const from = process.env.SMTP_FROM || '';
  const name = process.env.SMTP_FROM_NAME;
  return name ? `"${name}" <${from}>` : from;
}

/**
 * Notify the site owner of a new contact/brief lead. Best-effort — callers
 * should .catch() and must not block the HTTP response on it.
 */
async function sendLeadNotification(lead) {
  const transport = getTransport();
  if (!transport) return { skipped: true };
  const to = process.env.CONTACT_TO || 'hej@mast3kmedia.dk';
  const text = [
    'Ny henvendelse via mast3kmedia.dk',
    '',
    `Navn:      ${lead.name || '-'}`,
    `Firma:     ${lead.company || '-'}`,
    `E-mail:    ${lead.email || '-'}`,
    `Type:      ${lead.project_type || '-'}`,
    `Budget:    ${lead.budget || '-'}`,
    `Tidslinje: ${lead.timeline || '-'}`,
    `Kilde:     ${lead.source || '-'}`,
    '',
    'Mål:',
    lead.goal || '(ingen)',
    '',
    'Brief:',
    lead.brief || '(ingen)',
  ].join('\n');
  return transport.sendMail({
    from: fromHeader(),
    to,
    replyTo: lead.email || undefined,
    subject: `Ny henvendelse: ${lead.project_type || 'kontakt'}${lead.company ? ' — ' + lead.company : ''}`,
    text,
  });
}

module.exports = { getTransport, sendLeadNotification };
