import { getRequestConfig } from 'next-intl/server';

interface LocaleMessages {
  suggested: string[];
}

const locales = ['en', 'es'] as const;
const defaultLocale = 'es';

function resolveLocale(locale: string | undefined): string {
  return locales.includes(locale as (typeof locales)[number])
    ? locale as string
    : defaultLocale;
}

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const resolvedLocale = resolveLocale(locale ?? await requestLocale);
  const allMessages = (await import('./data/content.json')).default as Record<string, LocaleMessages>;

  return {
    locale: resolvedLocale,
    messages: allMessages[resolvedLocale]
  };
});
