import { defineMessages } from "@shared/i18n/messages";

export const appMessages = defineMessages({
  sr: {
    "app.name": "Тимска каса",
    "app.loading": "Учитавање…",
    "nav.dashboard": "Стање",
    "nav.records": "Записи",
    "nav.funds": "Фондови",
    "nav.categories": "Категорије",
    "auth.signOut": "Одјава",
    "auth.signOutButton": "Одјави се",
    "auth.denied": "Приступ одбијен: налог {email} није на листи дозвољених корисника.",
    "auth.prompt": "Пријавите се да бисте наставили",
    "auth.signIn": "Пријави се преко Google налога",
    "auth.error.loadFailed": "Учитавање налога није успело. Покушајте поново.",
    "auth.error.popupBlocked":
      "Прегледач је блокирао прозор за пријаву. Дозволите искачуће прозоре.",
    "auth.error.signInFailed": "Пријава није успела. Покушајте поново.",
    "auth.error.signOutFailed": "Одјава није успела. Покушајте поново.",
  },
  en: {
    "app.name": "Team Fund",
    "app.loading": "Loading…",
    "nav.dashboard": "Balance",
    "nav.records": "Records",
    "nav.funds": "Funds",
    "nav.categories": "Categories",
    "auth.signOut": "Sign out",
    "auth.signOutButton": "Sign out",
    "auth.denied": "Access denied: the account {email} is not on the list of allowed users.",
    "auth.prompt": "Sign in to continue",
    "auth.signIn": "Sign in with Google",
    "auth.error.loadFailed": "Could not load your account. Please try again.",
    "auth.error.popupBlocked": "Your browser blocked the sign-in window. Please allow pop-ups.",
    "auth.error.signInFailed": "Sign-in failed. Please try again.",
    "auth.error.signOutFailed": "Sign-out failed. Please try again.",
  },
});
