import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { importModuleSchema } from "@/lib/validators/imports";

const templates = {
  VENTAS:
    "fecha,documento,producto_codigo,producto_nombre,categoria,sucursal_codigo,sucursal_nombre,region,canal_codigo,canal_nombre,empleado_codigo,empleado_nombre,cantidad,venta_bruta,descuento,devolucion,costo,meta_venta\n2026-07-01,FAC-001,PROD-01,Paceña Pilsener,Cervezas,SUC-01,La Paz,Occidente,TRAD,Tradicional,EMP-01,Ana Pérez,100,7000,100,0,4000,7500\n",
  FINANZAS:
    "fecha,cuenta_codigo,cuenta_nombre,tipo_cuenta,nivel,centro_costo_codigo,centro_costo_nombre,sucursal_codigo,sucursal_nombre,region,escenario_codigo,escenario_nombre,importe,debito,credito\n2026-07-31,4100,Ingresos por ventas,INGRESO,1,CC-101,Comercial,SUC-01,La Paz,Occidente,REAL,Real,7000,7000,0\n",
  DESEMPENO:
    "fecha,kpi_codigo,kpi_nombre,unidad_medida,sentido,unidad_codigo,unidad_nombre,empleado_codigo,empleado_nombre,valor_meta,valor_real\n2026-07-31,DES-01,Cumplimiento de meta,%,MAYOR_MEJOR,UNI-01,Ventas,EMP-01,Ana Pérez,100,96\n",
};

export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }
  const moduleResult = importModuleSchema.safeParse(
    new URL(request.url).searchParams.get("module"),
  );
  if (!moduleResult.success) {
    return NextResponse.json({ message: "Módulo inválido" }, { status: 400 });
  }
  return new NextResponse(`\uFEFF${templates[moduleResult.data]}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=plantilla_${moduleResult.data.toLowerCase()}.csv`,
    },
  });
}
