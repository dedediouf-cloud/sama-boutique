export function getNextDueDate(reference: Date, interval: "monthly" | "annual" = "monthly"): Date {
  const date = new Date(reference);
  date.setMonth(date.getMonth() + (interval === "annual" ? 12 : 1));
  date.setDate(5);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addMonths(reference: Date, months: number): Date {
  const date = new Date(reference);
  date.setMonth(date.getMonth() + months);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getAnnualAmount(monthlyAmount: number, discountPercent: number): number {
  const yearly = monthlyAmount * 12;
  return Math.round(yearly * (1 - discountPercent / 100));
}
