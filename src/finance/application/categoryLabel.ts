// Application: назив категорије за приказ. Системске категорије се преводе по ID-у,
// остале (кориснички унос) приказују сачуван назив. ID-еви су исти као у seedSystemCategories.ts.

import type { Category } from "@finance/domain/Category";
import {
  categoryLabelMessages,
  type CategoryLabelKey,
} from "@finance/application/categoryLabel.messages";
import type { Locale } from "@shared/i18n/locale";
import { translate } from "@shared/i18n/messages";

const SYSTEM_LABEL_KEYS: Readonly<Record<string, CategoryLabelKey>> = {
  "system-unknown-income": "category.system.unknown",
  "system-unknown-expense": "category.system.unknown",
};

export function categoryLabel(category: Category, locale: Locale): string {
  const key = SYSTEM_LABEL_KEYS[category.id];
  return key ? translate(categoryLabelMessages, locale, key) : category.name;
}
