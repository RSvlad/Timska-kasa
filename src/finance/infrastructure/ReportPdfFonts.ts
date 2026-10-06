import type { jsPDF } from "jspdf";
import regularFontUrl from "./fonts/Roboto-Regular.ttf?url";
import boldFontUrl from "./fonts/Roboto-Bold.ttf?url";
import { FONT } from "@finance/infrastructure/reportPdfCommon";

const BASE64_CHUNK = 0x8000;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

async function loadFont(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Фонт за PDF није учитан. Провери везу и покушај поново.");
  return toBase64(await response.arrayBuffer());
}

// Подразумеване jsPDF фонтове не садрже ћирилицу, па се уграђује Roboto.
export async function registerReportFonts(doc: jsPDF): Promise<void> {
  const [regular, bold] = await Promise.all([loadFont(regularFontUrl), loadFont(boldFontUrl)]);
  doc.addFileToVFS("Roboto-Regular.ttf", regular);
  doc.addFont("Roboto-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", bold);
  doc.addFont("Roboto-Bold.ttf", FONT, "bold");
}
