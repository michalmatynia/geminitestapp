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

function envBankTransferDetails(): { enabled: boolean; accountName: string; iban: string; bic: string; bankName: string } {
  const iban = process.env['BANK_TRANSFER_IBAN']?.trim() ?? '';
  const accountName = process.env['BANK_TRANSFER_ACCOUNT_NAME']?.trim() ?? '';
  const enabledEnv = process.env['BANK_TRANSFER_ENABLED']?.trim() === 'true';
  const hasDetails = iban !== '' && accountName !== '';

  return {
    enabled: enabledEnv || hasDetails,
    accountName,
    iban,
    bic: process.env['BANK_TRANSFER_BIC']?.trim() ?? '',
    bankName: process.env['BANK_TRANSFER_BANK_NAME']?.trim() ?? '',
  };
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

  const envStripeKey = envStripePublishableKey();
  const stripeEnabled = settings !== null
    ? settings.payment.stripe.enabled
    : envStripeKey !== '';

  let stripePublishableKey = '';
  if (stripeEnabled) {
    const dbKey = settings?.payment.stripe.publishableKey.trim() ?? '';
    stripePublishableKey = dbKey !== '' ? dbKey : envStripeKey;
  }

  const envPayPalId = envPayPalClientId();
  const paypalEnabled = settings !== null
    ? settings.payment.paypal.enabled
    : envPayPalId !== '';

  let paypalClientId = '';
  if (paypalEnabled) {
    const dbId = settings?.payment.paypal.clientId.trim() ?? '';
    paypalClientId = dbId !== '' ? dbId : envPayPalId;
  }

  const paypalMode: 'sandbox' | 'live' = settings?.payment.paypal.mode ?? envPayPalMode();

  const bankTransfer = envBankTransferDetails();

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
        bankTransfer: {
          enabled: bankTransfer.enabled,
          accountName: bankTransfer.accountName,
          iban: bankTransfer.iban,
          bic: bankTransfer.bic,
          bankName: bankTransfer.bankName,
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
