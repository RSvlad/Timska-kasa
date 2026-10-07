// UI: Дугме за промену језика — приказује језик на који се прелази.

import { useLocale, useT } from "@shared/i18n/I18nProvider";
import {
  LOCALE_BADGES,
  LOCALE_NAMES,
  LOCALE_TAGS,
  LOCALES,
  type Locale,
} from "@shared/i18n/locale";
import { sharedMessages } from "./messages";

function nextLocale(current: Locale): Locale {
  return LOCALES[(LOCALES.indexOf(current) + 1) % LOCALES.length];
}

export function LanguageSwitcher({ className = "ghost icon-btn lang-switch" }) {
  const { locale, setLocale } = useLocale();
  const t = useT(sharedMessages);
  const next = nextLocale(locale);
  const label = t("language.switchTo", { language: LOCALE_NAMES[next] });

  return (
    <button
      className={className}
      title={label}
      aria-label={label}
      lang={LOCALE_TAGS[next]}
      onClick={() => setLocale(next)}
    >
      {LOCALE_BADGES[next]}
    </button>
  );
}
