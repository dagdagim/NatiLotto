export const BRAND = {
  NAME: 'Nati Lotto',
  TAGLINE: 'Your Chance. Your Moment.',
  TAGLINE_AM: 'የእርስዎ ዕድል! የእርስዎ ቅጽበት!',
  SUPPORT_EMAIL: 'support@natilotto.et',
  SUPPORT_PHONE: '+251 911 000 000',
  CURRENCY: 'ETB',
  DEFAULT_COUNTRY: 'ET',
} as const;

export const DRAW_RULES = {
  MIN_TICKET_PRICE_ETB: 10,
  MAX_TICKET_PRICE_ETB: 10000,
  MAX_TICKETS_PER_USER_DEFAULT: 25,
  MAX_TICKETS_PER_DRAW_MAX: 100000,
  DEFAULT_COUNTDOWN_SECONDS_BEFORE_DRAW: 10,
  ROLLING_ANIMATION_DURATION_MS: 3500,
} as const;

export const SYSTEM_FEES = {
  TRANSACTION_FEE_PERCENT: 0, // Zero hidden fees
} as const;
