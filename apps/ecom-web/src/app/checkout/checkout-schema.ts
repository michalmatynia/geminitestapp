import { z } from 'zod';
import type { EcomLocale } from '@/lib/locales';

export function buildCheckoutInfoSchema(locale: EcomLocale): z.AnyZodObject {
  const req = locale === 'pl' ? 'To pole jest wymagane.' : 'This field is required.';
  const emailInvalid = locale === 'pl' ? 'Wpisz poprawny adres email.' : 'Enter a valid email address.';
  const phoneInvalid = locale === 'pl' ? 'Wpisz poprawny numer telefonu.' : 'Enter a valid phone number.';

  return z.object({
    email: z.string().min(1, req).email(emailInvalid),
    firstName: z.string().min(1, req),
    lastName: z.string().min(1, req),
    address: z.string().min(1, req),
    apartment: z.string().optional(),
    city: z.string().min(1, req),
    postcode: z.string().min(1, req),
    country: z.string().min(1, req),
    phone: z.string().optional().refine(
      (val) => val === undefined || val.trim() === '' || /^[+\d][\d\s\-()+.]{5,}$/.test(val.trim()),
      { message: phoneInvalid },
    ),
  });
}

export type CheckoutInfoData = z.infer<ReturnType<typeof buildCheckoutInfoSchema>>;
