export const formatMoney = (value: number | null, compact = false) => {
  if (value === null) return "No disponible";
  if (compact && Math.abs(value) >= 1_000_000) {
    return `Bs ${(value / 1_000_000).toLocaleString("es-BO", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} MM`;
  }
  return `Bs ${value.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatPercent = (value: number | null) =>
  value === null
    ? "No disponible"
    : `${value.toLocaleString("es-BO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })}%`;

export const formatNumber = (value: number | null, unit = "") =>
  value === null
    ? "No disponible"
    : `${value.toLocaleString("es-BO", { maximumFractionDigits: 2 })}${
        unit ? ` ${unit}` : ""
      }`;

export const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value));
