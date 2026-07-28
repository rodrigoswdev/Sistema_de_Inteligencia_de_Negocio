import type { AnalyticsFilters } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

const value = (input: string | string[] | undefined) =>
  typeof input === "string" && input !== "" && input !== "TODOS"
    ? input
    : undefined;

export function filtersFromSearchParams(
  params: SearchParams,
): AnalyticsFilters {
  return {
    from: value(params.from),
    to: value(params.to),
    region: value(params.region),
    product: value(params.product),
    channel: value(params.channel),
    unit: value(params.unit),
    scenario: value(params.scenario),
  };
}
