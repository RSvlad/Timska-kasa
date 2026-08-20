// Bounded Context: Finance
// Entity: Фонд — именована алокација новца из Тимске касе.
// Није Aggregate Root — живи унутар Finance bounded context-а.
// Видети context/domain-model.md и ADR-017.

import type { Amount } from "@finance/domain/Amount";

export interface Fund {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly capacity: Amount;   // лимит фонда (value + currency)
  readonly reserved: number;   // тренутно алоцирано; 0 ≤ reserved ≤ capacity.value
  readonly createdAt: Date;
}

// Инваријанте (провера на application слоју пре сваке мутације):
// 1. reserved >= 0
// 2. reserved <= capacity.value
// 3. При повећању reserved: delta ≤ слободна_каса_у_датој_валути
