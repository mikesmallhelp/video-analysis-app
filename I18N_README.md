# Internationalization (i18n) Setup

This application uses `next-intl` for internationalization support.

## Configuration

### Setting the Language

The application language is configured via the `DEFAULT_LOCALE` environment variable in your `.env` file:

```env
DEFAULT_LOCALE=en  # For English
# or
DEFAULT_LOCALE=fi  # For Finnish
```

**Note:** The language is configured server-side and applies to the entire application. There is no UI language selector.

### Available Languages

The application currently supports:
- **English** (`en`) - Default
- **Finnish** (`fi`)

## Language Files

Translation files are located in the `messages/` directory:
- `messages/en.json` - English translations
- `messages/fi.json` - Finnish translations

### Translation File Structure

Each language file contains:

```json
{
  "app": {
    "title": "Application title",
    "guideText": "Guide text for users"
  },
  "upload": {
    "title": "Upload section title",
    "description": "Upload section description",
    // ... more upload-related texts
  },
  "errors": {
    "invalidFile": "Error message",
    // ... more error messages
  },
  "prompts": {
    "start": "AI prompt start text",
    "end": "AI prompt end text"
  },
  "analyzes": [
    {
      "label": "Analysis task label",
      "description": "Analysis task description",
      "promptMiddle": "AI prompt middle text for this analysis"
    }
    // ... more analysis tasks
  ]
}
```

## Adding a New Language

1. Create a new JSON file in the `messages/` directory (e.g., `messages/de.json` for German)
2. Copy the structure from `messages/en.json`
3. Translate all text values to the new language
4. Set `DEFAULT_LOCALE=de` in your `.env` file

## Configuration Files

### Previous Configuration (Deprecated)

The old `video-analysis-config.json` file is **no longer used**. All UI texts and prompts have been moved to language files in the `messages/` directory.

### Migration

All text content from `video-analysis-config.json` has been migrated to:
- `app-title` → `app.title`
- `guide-text` → `app.guideText`
- `prompt-start` → `prompts.start`
- `prompt-end` → `prompts.end`
- `analyzes[].ui-label` → `analyzes[].label`
- `analyzes[].ui-description` → `analyzes[].description`
- `analyzes[].prompt-middle` → `analyzes[].promptMiddle`

## Technical Details

### Files Modified/Added

1. **Configuration:**
   - `i18n.ts` - i18n configuration
   - `next.config.mjs` - Added next-intl plugin
   - `.env.example` - Added DEFAULT_LOCALE variable

2. **Language Files:**
   - `messages/en.json` - English translations
   - `messages/fi.json` - Finnish translations

3. **Components:**
   - `app/layout.tsx` - Added NextIntlClientProvider
   - `app/page.tsx` - Uses useTranslations() hook
   - `app/api/analyze-video/route.ts` - Loads translations server-side

### How It Works

1. **Server-side:** The `DEFAULT_LOCALE` environment variable determines which language file to load
2. **Client-side:** Components use the `useTranslations()` hook to access translated strings
3. **API routes:** Load translation files directly using `fs.readFile()` based on the locale

## Example Usage in Code

### In React Components

```tsx
import { useTranslations } from 'next-intl'

export default function MyComponent() {
  const t = useTranslations()

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>{t('app.guideText')}</p>
    </div>
  )
}
```

### In API Routes

```ts
import { promises as fs } from 'fs'
import path from 'path'

const locale = process.env.DEFAULT_LOCALE || 'en'
const messagesPath = path.join(process.cwd(), `messages/${locale}.json`)
const messages = JSON.parse(await fs.readFile(messagesPath, 'utf8'))

// Use translations
const promptStart = messages.prompts.start
```

## Notes

- Language selection is **not available in the UI** - it must be configured via environment variable
- All AI prompts are also translated, allowing for language-specific AI interactions
- Changes to the `.env` file require a server restart to take effect
