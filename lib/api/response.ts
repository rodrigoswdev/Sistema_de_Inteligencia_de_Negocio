import { NextResponse } from "next/server";
import type { AnalyticsFilters, ApiEnvelope } from "@/lib/types";

export function requestId() {
  return crypto.randomUUID();
}

export function ok<T>(
  data: T,
  message = "Operación completada.",
  filters?: AnalyticsFilters,
) {
  const id = requestId();
  const body: ApiEnvelope<T> = {
    data,
    meta: {
      requestId: id,
      generatedAt: new Date().toISOString(),
      simulated: process.env.DEMO_MODE !== "false",
      filters,
    },
    message,
    errors: [],
    requestId: id,
  };
  return NextResponse.json(body);
}

export function fail(
  message: string,
  status = 400,
  errors: Array<{ field?: string; code: string; message: string }> = [
    { code: "REQUEST_ERROR", message },
  ],
) {
  const id = requestId();
  return NextResponse.json(
    {
      data: null,
      meta: {
        requestId: id,
        generatedAt: new Date().toISOString(),
        simulated: process.env.DEMO_MODE !== "false",
      },
      message,
      errors,
      requestId: id,
    },
    { status },
  );
}

export function filtersFromUrl(url: string): AnalyticsFilters {
  const params = new URL(url).searchParams;
  return {
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    region: params.get("region") ?? undefined,
    product: params.get("product") ?? undefined,
    channel: params.get("channel") ?? undefined,
    unit: params.get("unit") ?? undefined,
    scenario: params.get("scenario") ?? undefined,
  };
}
