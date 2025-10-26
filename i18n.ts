import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  // Get locale from environment variable or default to 'en'
  const locale = process.env.DEFAULT_LOCALE || 'en'

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
