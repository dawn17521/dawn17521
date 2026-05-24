export const OPEN_HOUR = 8; // 8:00 AM, first selectable slot
export const CLOSE_HOUR = 24; // midnight, end of the last slot (23:00 - 24:00)

export const PRICE_PER_HOUR = Number(process.env.PRICE_PER_HOUR ?? 50);
export const CURRENCY = process.env.CURRENCY ?? "CNY";

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function currencySymbol(currency: string = CURRENCY): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

export function formatPrice(amount: number, currency: string = CURRENCY): string {
  return `${currencySymbol(currency)}${amount}`;
}

/** Build the list of hour slots, e.g. [8, 9, ... 23]. Each is a 1-hour block. */
export function hourSlots(): number[] {
  const slots: number[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) slots.push(h);
  return slots;
}

export function formatHour(hour: number): string {
  const h = hour % 24;
  return `${String(h).padStart(2, "0")}:00`;
}

export function priceFor(startHour: number, endHour: number): number {
  const hours = Math.max(0, endHour - startHour);
  return hours * PRICE_PER_HOUR;
}
