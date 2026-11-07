// UI: Дугме "Инсталирај апликацију" — приказује се само кад прегледач нуди инсталацију.

import { useT } from "@shared/i18n/I18nProvider";
import { promptInstall, useCanInstall } from "@shared/pwa/installPrompt";
import { sharedMessages } from "./messages";

export function InstallAppButton({ className = "ghost install-btn" }) {
  const canInstall = useCanInstall();
  const t = useT(sharedMessages);

  if (!canInstall) return null;

  return (
    <button className={className} onClick={() => void promptInstall()}>
      <span aria-hidden="true">📲</span> {t("pwa.install")}
    </button>
  );
}
