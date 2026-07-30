import { Resend } from 'resend';
import { logger } from './logger';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'noreply@optimairwing.app';

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

export interface EmailResult {
  success: boolean;
  error?: string;
}

export async function sendWelcomeEmail(email: string, orgName: string): Promise<EmailResult> {
  if (!resend) {
    logger.warn({ email, orgName }, 'Resend no configurado — email de bienvenida omitido');
    return { success: false, error: 'EMAIL_NOT_CONFIGURED' };
  }
  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Bienvenido a OptimAirWing',
      html: `<h1>Bienvenido a OptimAirWing, ${orgName}</h1>
<p>Tu cuenta ha sido creada exitosamente.</p>
<p>Ya puedes empezar a diseñar y optimizar tus alas con nuestro motor de simulación aerodinámica.</p>
<hr>
<p>Equipo OptimAirWing</p>`,
    });
    logger.info({ email }, 'Email de bienvenida enviado');
    return { success: true };
  } catch (err) {
    logger.error({ err, email }, 'Error al enviar email de bienvenida');
    return { success: false, error: String(err) };
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<EmailResult> {
  if (!resend) {
    logger.warn({ email }, 'Resend no configurado — email de reset omitido');
    return { success: false, error: 'EMAIL_NOT_CONFIGURED' };
  }
  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Recuperación de contraseña — OptimAirWing',
      html: `<h1>Recuperación de contraseña</h1>
<p>Has solicitado restablecer tu contraseña.</p>
<p><a href="${resetUrl}">Haz clic aquí para restablecerla</a></p>
<p>Este enlace expira en 1 hora.</p>
<hr>
<p>Equipo OptimAirWing</p>`,
    });
    logger.info({ email }, 'Email de reset enviado');
    return { success: true };
  } catch (err) {
    logger.error({ err, email }, 'Error al enviar email de reset');
    return { success: false, error: String(err) };
  }
}
