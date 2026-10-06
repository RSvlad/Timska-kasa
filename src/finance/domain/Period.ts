// Bounded Context: Finance
// Value Object: Период — полуотворен интервал [from, to) над датумом и временом записа.

export type PeriodPreset = "данас" | "овај месец" | "ова година" | "све";

export interface Period {
  readonly from: Date;
  readonly to: Date; // искључиво: први тренутак након периода
}

const DAY_INPUT_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;

export function periodBounds(preset: PeriodPreset): Period | null {
  const now = new Date();
  if (preset === "све") return null;
  if (preset === "данас") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) };
  }
  if (preset === "овај месец") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear() + 1, 0, 1),
  };
}

function parseDayInput(input: string): Date | null {
  const match = DAY_INPUT_FORMAT.exec(input);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 ? date : null;
}

// Прима вредности `<input type="date">` (YYYY-MM-DD); крајњи дан је укључен у период.
export function periodFromDayInputs(firstDay: string, lastDay: string): Period | null {
  const from = parseDayInput(firstDay);
  const last = parseDayInput(lastDay);
  if (!from || !last || from > last) return null;
  return { from, to: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1) };
}

export function lastDayOf(period: Period): Date {
  return new Date(period.to.getFullYear(), period.to.getMonth(), period.to.getDate() - 1);
}

export function toDayInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
