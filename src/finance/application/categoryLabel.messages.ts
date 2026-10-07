import { defineMessages } from "@shared/i18n/messages";

export const categoryLabelMessages = defineMessages({
  sr: {
    "category.system.unknown": "Непознато",
  },
  en: {
    "category.system.unknown": "Unknown",
  },
});

export type CategoryLabelKey = keyof (typeof categoryLabelMessages)["sr"];
