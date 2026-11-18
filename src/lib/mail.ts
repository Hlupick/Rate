import 'server-only'

/**
 * Outgoing mail. Two real transports are supported:
 * - resend: HTTPS API, no SMTP ports needed (preferred when a domain is set up);
 * - smtp:   classic mailbox (Yandex/Mail.ru app password), works without a domain.
 * "console" prints the letter to the container log and is used for local work.
 */
type Provider = 'resend' | 'smtp' | 'console' | 'none'

export type Mail = {
  to: string
  subject: string
  text: string
  html: string
}

function resolveProvider(): Provider {
  const raw = (process.env.MAIL_PROVIDER ?? '').trim().toLowerCase()
  if (raw === 'resend' || raw === 'smtp' || raw === 'console') return raw
  if ((process.env.RESEND_API_KEY ?? '').trim()) return 'resend'
  if ((process.env.SMTP_HOST ?? '').trim()) return 'smtp'
  // Local work prints codes to the log; production without a provider keeps the
  // old instant signup instead of locking everyone out.
  return process.env.NODE_ENV === 'production' ? 'none' : 'console'
}

/** True when the verification flow can actually deliver a code somewhere. */
export function isMailConfigured(): boolean {
  return resolveProvider() !== 'none'
}

export function mailFrom(): string {
  return (process.env.MAIL_FROM ?? 'Rate <no-reply@localhost>').trim()
}

export async function sendMail(mail: Mail): Promise<boolean> {
  const provider = resolveProvider()
  if (provider === 'none') {
    console.error('[mail] провайдер не настроен: письмо не отправлено')
    return false
  }
  if (provider === 'console') {
    console.log(`[mail:console] to=${mail.to} subject="${mail.subject}"\n${mail.text}`)
    return true
  }
  if (provider === 'resend') return sendWithResend(mail)
  return sendWithSmtp(mail)
}

async function sendWithResend(mail: Mail): Promise<boolean> {
  const key = (process.env.RESEND_API_KEY ?? '').trim()
  if (!key) {
    console.error('[mail] MAIL_PROVIDER=resend, но RESEND_API_KEY пуст')
    return false
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    })
    if (!response.ok) {
      console.error(`[mail] Resend ответил ${response.status}: ${await response.text()}`)
      return false
    }
    return true
  } catch (error) {
    console.error('[mail] Resend недоступен:', error)
    return false
  }
}

let smtpTransport: import('nodemailer').Transporter | null = null

async function sendWithSmtp(mail: Mail): Promise<boolean> {
  try {
    if (!smtpTransport) {
      const nodemailer = (await import('nodemailer')).default
      smtpTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: (process.env.SMTP_SECURE ?? 'true') !== 'false',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    }
    await smtpTransport.sendMail({
      from: mailFrom(),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    })
    return true
  } catch (error) {
    console.error('[mail] SMTP не отправил письмо:', error)
    return false
  }
}

/* -------------------------------- templates -------------------------------- */

function letter(heading: string, lead: string, code: string, footnote: string): Mail['html'] {
  return `<!doctype html>
<html lang="ru"><body style="margin:0;padding:24px;background:#111111;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:420px;margin:0 auto;background:#181818;border:1px solid #2a2a2a;border-radius:16px;padding:28px 24px;color:#f2f2f2">
<div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#9a9a9a">Rate</div>
<div style="margin-top:14px;font-size:19px;font-weight:700">${heading}</div>
<p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:#c9c9c9">${lead}</p>
<div style="margin:22px 0;padding:16px;border-radius:12px;background:#0f0f0f;border:1px solid #333;text-align:center;font-size:32px;font-weight:700;letter-spacing:9px;color:#ffffff">${code}</div>
<p style="margin:0;font-size:13px;line-height:1.5;color:#9a9a9a">${footnote}</p>
</div>
</body></html>`
}

export function verificationLetter(to: string, code: string): Mail {
  const subject = `Код подтверждения Rate: ${code}`
  const text = [
    'Rate — подтверждение почты',
    '',
    `Код: ${code}`,
    '',
    'Код действует 10 минут и срабатывает один раз.',
    'Если вы не регистрировались в Rate, просто проигнорируйте это письмо.',
  ].join('\n')
  return {
    to,
    subject,
    text,
    html: letter(
      'Подтвердите почту',
      'Введите этот код на странице регистрации:',
      code,
      'Код действует 10 минут и срабатывает один раз. Если вы не регистрировались в Rate, просто проигнорируйте это письмо.',
    ),
  }
}

export function passwordResetLetter(to: string, code: string): Mail {
  const subject = `Восстановление пароля Rate: ${code}`
  const text = [
    'Rate — сброс пароля',
    '',
    `Код: ${code}`,
    '',
    'Код действует 10 минут и срабатывает один раз.',
    'Если вы не запрашивали сброс, просто проигнорируйте письмо — пароль останется прежним.',
  ].join('\n')
  return {
    to,
    subject,
    text,
    html: letter(
      'Сброс пароля',
      'Введите этот код, чтобы задать новый пароль:',
      code,
      'Код действует 10 минут и срабатывает один раз. Если вы не запрашивали сброс, просто проигнорируйте письмо — пароль останется прежним.',
    ),
  }
}
