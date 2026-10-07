import { useCallback } from "react";
import type { Category } from "@finance/domain/Category";
import { categoryLabel } from "@finance/application/categoryLabel";
import { useLocale } from "@shared/i18n/I18nProvider";

export function useCategoryLabel(): (category: Category) => string {
  const { locale } = useLocale();
  return useCallback((category: Category) => categoryLabel(category, locale), [locale]);
}
