import { describe, expect, it } from "vitest";
import { achievement, grossMargin, growth, higherIsBetter, safeDivide } from "@/lib/kpi/formulas";

describe("fórmulas KPI", () => {
  it("evita divisiones por cero", () => expect(safeDivide(10, 0)).toBeNull());
  it("calcula margen bruto", () => expect(grossMargin(100, 60)).toBe(40));
  it("calcula crecimiento", () => expect(growth(120, 100)).toBe(20));
  it("calcula cumplimiento", () => expect(achievement(95, 100)).toBe(95));
  it("aplica el semáforo configurable", () => {
    expect(higherIsBetter(101, 100, 90)).toBe("VERDE");
    expect(higherIsBetter(94, 100, 90)).toBe("AMARILLO");
    expect(higherIsBetter(80, 100, 90)).toBe("ROJO");
  });
});
