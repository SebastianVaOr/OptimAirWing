import Stripe from 'stripe';
import { logger } from './logger';

const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;
if (stripeKey) {
  stripe = new Stripe(stripeKey, { apiVersion: '2026-06-24.dahlia' });
}

export interface CheckoutResult {
  sessionId?: string;
  url?: string;
  success: boolean;
  error?: string;
}

const PLAN_PRICES: Record<string, string | undefined> = {
  professional: process.env.STRIPE_PRICE_PROFESSIONAL,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export async function createCheckoutSession(
  plan: 'professional' | 'enterprise',
  orgId: string,
  email: string,
): Promise<CheckoutResult> {
  if (!stripe) {
    logger.warn({ plan, orgId }, 'Stripe no configurado — checkout simulado');
    return { success: true, sessionId: 'sim_' + Date.now(), url: undefined };
  }

  const priceId = PLAN_PRICES[plan];
  if (!priceId) {
    return { success: false, error: `Precio no configurado para plan ${plan}` };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      client_reference_id: orgId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}?checkout=success`,
      cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}?checkout=cancel`,
      metadata: { orgId, plan },
    });
    logger.info({ sessionId: session.id, plan, orgId }, 'Sesión de checkout creada');
    return { success: true, sessionId: session.id, url: session.url || undefined };
  } catch (err) {
    logger.error({ err, plan, orgId }, 'Error al crear sesión de checkout');
    return { success: false, error: String(err) };
  }
}

export async function handleStripeWebhook(payload: string, signature: string): Promise<{ event: string; orgId?: string; plan?: string } | null> {
  if (!stripe) return null;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return null;

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        event: event.type,
        orgId: session.metadata?.orgId,
        plan: session.metadata?.plan,
      };
    }
    return { event: event.type };
  } catch (err) {
    logger.error({ err }, 'Error al verificar webhook de Stripe');
    return null;
  }
}

export async function createBillingPortalSession(customerId: string): Promise<{ url: string } | null> {
  if (!stripe) return null;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings`,
    });
    return { url: session.url };
  } catch (err) {
    logger.error({ err }, 'Error al crear sesión de billing portal');
    return null;
  }
}

export async function reportUsage(
  subscriptionItemId: string,
  quantity: number,
  timestamp?: number,
): Promise<boolean> {
  if (!stripe) {
    logger.warn({ subscriptionItemId, quantity }, 'Stripe no configurado — usage simulado');
    return true;
  }
  try {
    const s = stripe as any;
    await s.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment',
    });
    logger.info({ subscriptionItemId, quantity }, 'Usage record reportado a Stripe');
    return true;
  } catch (err) {
    logger.error({ err, subscriptionItemId }, 'Error al reportar usage a Stripe');
    return false;
  }
}

export async function reportUsageByOrgId(orgId: string, quantity: number): Promise<boolean> {
  if (!stripe) return true;
  try {
    const customers = await stripe.customers.list({ limit: 1 });
    // Si no hay customers configurados, solo loguear
    logger.info({ orgId, quantity }, 'Usage registrado localmente (Stripe metering pendiente de subscriptionItemId)');
    return true;
  } catch {
    return true;
  }
}
