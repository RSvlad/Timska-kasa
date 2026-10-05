// Application: операције над Категоријама (UI не сме директно да зове repository).

import { createCategory, updateCategory } from "@finance/infrastructure/CategoryRepository";

export const addCategory = createCategory;
export const editCategory = updateCategory;
