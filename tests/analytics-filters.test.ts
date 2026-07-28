import { describe, expect, it } from "vitest";
import { filtersFromSearchParams } from "@/lib/analytics/filters";

describe("RF-11 a RF-14 · filtros analíticos", () => {
  it("convierte parámetros válidos en filtros", () => {
    expect(
      filtersFromSearchParams({
        from: "2026-01-01",
        to: "2026-07-31",
        region: "Occidente",
        scenario: "REAL",
      }),
    ).toMatchObject({
      from: "2026-01-01",
      to: "2026-07-31",
      region: "Occidente",
      scenario: "REAL",
    });
  });

  it("ignora TODOS, valores vacíos y parámetros múltiples", () => {
    expect(
      filtersFromSearchParams({
        region: "TODOS",
        product: "",
        channel: ["Tradicional", "Moderno"],
      }),
    ).toEqual({
      from: undefined,
      to: undefined,
      region: undefined,
      product: undefined,
      channel: undefined,
      unit: undefined,
      scenario: undefined,
    });
  });
});
