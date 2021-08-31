import {
  dictionary,
  locale,
  _
} from 'svelte-i18n';

function setupI18n({ withLocale: _locale, translations }) {
  dictionary.set(translations);
  locale.set(_locale);
}

export { _, setupI18n };
