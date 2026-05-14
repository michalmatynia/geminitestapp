import { NextResponse } from 'next/server';

import { readEcommerceProviderSettings, type ProviderSettings } from '@/lib/providerSettings';

export const dynamic = 'force-dynamic';

type PublicInpostSettings = {
  enabled: boolean;
  geowidgetToken: string;
};

function envGeowidgetToken(): string {
  return process.env['NEXT_PUBLIC_INPOST_GEO_WIDGET_TOKEN']?.trim() ?? '';
}

function envStripePublishableKey(): string {
  return process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']?.trim() ?? '';
}

function envPayPalClientId(): string {
  return process.env['NEXT_PUBLIC_PAYPAL_CLIENT_ID']?.trim() ?? '';
}

function envPayPalMode(): 'sandbox' | 'live' {
  return process.env['PAYPAL_MODE']?.trim() === 'live' ? 'live' : 'sandbox';
}

function publicInpostSettings(settings: ProviderSettings | null): PublicInpostSettings {
  if (settings === null) return { enabled: true, geowidgetToken: envGeowidgetToken() };
  const inpost = settings.shipping.inpost;
  const dbToken = inpost.geowidgetToken.trim();
  const token = dbToken.length > 0 ? dbToken : envGeowidgetToken();
  return {
    enabled: inpost.enabled,
    geowidgetToken: inpost.enabled ? token : '',
  };
}

export async function GET(): Promise<NextResponse> {
  const settings = await readEcommerceProviderSettings();
  const inpost = publicInpostSettings(settings);

  const stripeEnabled = settings !== null
    ? settings.payment.stripe.enabled
    : false;
  const stripePublishableKey = stripeEnabled
    ? (settings?.payment.stripe.publishableKey.trim() || envStripePublishableKey())
    : '';

  const paypalEnabled = settings !== null
    ? settings.payment.paypal.enabled
    : false;
  const paypalClientId = paypalEnabled
    ? (settings?.payment.paypal.clientId.trim() || envPayPalClientId())
    : '';
  const paypalMode: 'sandbox' | 'live' = settings?.payment.paypal.mode ?? envPayPalMode();

  return NextResponse.json(
    {
      payment: {
        payu: {
          enabled: settings?.payment.payu.enabled !== false,
        },
        stripe: {
          enabled: stripeEnabled,
          publishableKey: stripePublishableKey,
        },
        paypal: {
          enabled: paypalEnabled,
          clientId: paypalClientId,
          mode: paypalMode,
        },
      },
      shipping: {
        dpd: {
          enabled: settings?.shipping.dpd.enabled !== false,
        },
        inpost: {
          enabled: inpost.enabled,
          geowidgetToken: inpost.geowidgetToken,
        },
        pocztaPolska: {
          enabled: settings?.shipping.pocztaPolska.enabled !== false,
        },
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
