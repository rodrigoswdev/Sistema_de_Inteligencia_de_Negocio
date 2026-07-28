import type { TrafficLight } from "@/lib/types";

export const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const safeDivide = (numerator: number, denominator: number) =>
  denominator === 0 ? null : numerator / denominator;

export const netSales = (gross: number, discounts: number, returns: number) =>
  gross - discounts - returns;

export const grossMargin = (net: number, cost: number) => {
  const ratio = safeDivide(net - cost, net);
  return ratio === null ? null : round(ratio * 100);
};

export const growth = (current: number, previous: number) => {
  const ratio = safeDivide(current - previous, previous);
  return ratio === null ? null : round(ratio * 100);
};

export const achievement = (real: number, target: number) => {
  const ratio = safeDivide(real, target);
  return ratio === null ? null : round(ratio * 100);
};

export const averageTicket = (net: number, documents: number) => {
  const ratio = safeDivide(net, documents);
  return ratio === null ? null : round(ratio);
};

export const ebitda = (income: number, costs: number, opex: number) =>
  income - costs - opex;

export const budgetVariance = (real: number, budget: number) => {
  const ratio = safeDivide(real - budget, budget);
  return ratio === null ? null : round(ratio * 100);
};

export function higherIsBetter(
  value: number | null,
  green: number,
  yellow: number,
): TrafficLight {
  if (value === null) return "NEUTRO";
  if (value >= green) return "VERDE";
  if (value >= yellow) return "AMARILLO";
  return "ROJO";
}

export function lowerIsBetter(
  value: number | null,
  green: number,
  yellow: number,
): TrafficLight {
  if (value === null) return "NEUTRO";
  if (value <= green) return "VERDE";
  if (value <= yellow) return "AMARILLO";
  return "ROJO";
}
