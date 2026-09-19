// Infrastructure: Firestore одбија `undefined` вредности у addDoc/setDoc.
// Опциона поља (нпр. `description`, `fundId`) се зато уклањају пре уписа.

export function omitUndefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
