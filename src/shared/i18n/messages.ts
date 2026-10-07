import type { Locale } from "./locale";

export type Messages<K extends string> = Record<Locale, Record<K, string>>;

export type MessageParams = Record<string, string | number>;

export function defineMessages<K extends string>(messages: Messages<K>): Messages<K> {
  return messages;
}

export function translate<K extends string>(
  messages: Messages<K>,
  locale: Locale,
  key: K,
  params?: MessageParams,
): string {
  const template = messages[locale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}
