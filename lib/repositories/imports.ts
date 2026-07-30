import "server-only";

import type {
  Modulo,
  NivelSemaforo,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { demoLoads } from "@/lib/data/demo";
import { isDemoMode } from "@/lib/config";
import type {
  ImportError,
  LoadView,
  RawImportRow,
  ValidatedImport,
} from "@/lib/imports/types";
import { prisma } from "@/lib/prisma";
import { addDemoSalesRows } from "@/lib/repositories/analytics";
import type { ImportModule } from "@/lib/validators/imports";
import { validateImport } from "@/lib/imports/validation";

const globalImports = globalThis as unknown as {
  sibiDemoImports?: Map<
    string,
    LoadView & { rows: RawImportRow[]; sourceId?: string }
  >;
};

type DemoLoad = LoadView & { rows: RawImportRow[]; sourceId?: string };

const demoStore: Map<string, DemoLoad> =
  globalImports.sibiDemoImports ??
  new Map<string, DemoLoad>(
    demoLoads.map((load) => [
      load.id,
      {
        ...load,
        period: load.date.slice(0, 7),
        total: load.valid + load.errors,
        errorDetails: [],
        rows: [],
      } as DemoLoad,
    ]),
  );
globalImports.sibiDemoImports = demoStore;

const quality = (valid: number, total: number) =>
  total === 0 ? 0 : Number(((valid / total) * 100).toFixed(2));

function demoView(load: DemoLoad): LoadView {
  return {
    id: load.id,
    date: load.date,
    module: load.module,
    period: load.period,
    file: load.file,
    status: load.status,
    total: load.total,
    valid: load.valid,
    errors: load.errors,
    quality: load.quality,
    errorDetails: load.errorDetails,
  };
}

function serializeLoad(row: {
  id: string;
  fechaInicio: Date;
  modulo: Modulo;
  periodo: string;
  archivo: string | null;
  estado: string;
  filasTotales: number;
  filasValidas: number;
  filasError: number;
  errores?: Array<{
    numeroFila: number | null;
    campo: string | null;
    codigoError: string;
    mensaje: string;
    valorOriginal: string | null;
  }>;
}): LoadView {
  return {
    id: row.id,
    date: row.fechaInicio.toISOString(),
    module: row.modulo as ImportModule,
    period: row.periodo,
    file: row.archivo ?? "Sin nombre",
    status: row.estado as LoadView["status"],
    total: row.filasTotales,
    valid: row.filasValidas,
    errors: row.filasError,
    quality: quality(row.filasValidas, row.filasTotales),
    errorDetails: row.errores?.map((error) => ({
      row: error.numeroFila ?? undefined,
      field: error.campo ?? undefined,
      code: error.codigoError as ImportError["code"],
      message: error.mensaje,
      value: error.valorOriginal ?? undefined,
    })),
  };
}

export async function listLoads(): Promise<LoadView[]> {
  if (isDemoMode()) {
    return [...demoStore.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(demoView);
  }
  const rows = await prisma.cargaDato.findMany({
    orderBy: { fechaInicio: "desc" },
    take: 100,
    include: { errores: { orderBy: { numeroFila: "asc" }, take: 25 } },
  });
  return rows.map(serializeLoad);
}

async function resolveProductContext(
  authUserId: string,
  module: ImportModule,
  sourceId?: string,
) {
  const profile = await prisma.usuario.findUnique({
    where: { authUserId },
    select: { id: true },
  });
  if (!profile) throw new Error("No existe el perfil local del usuario.");
  const source = sourceId
    ? await prisma.fuenteDato.findFirst({
        where: { id: BigInt(sourceId), modulo: module, estado: "ACTIVO" },
      })
    : await prisma.fuenteDato.findFirst({
        where: { modulo: module, estado: "ACTIVO" },
        orderBy: { id: "asc" },
      });
  if (!source) {
    throw new Error(`No existe una fuente activa para el módulo ${module}.`);
  }
  return { profileId: profile.id, sourceId: source.id };
}

function errorData(loadId: string, errors: ImportError[]) {
  return errors.map((error) => ({
    cargaId: loadId,
    numeroFila: error.row,
    campo: error.field,
    codigoError: error.code,
    mensaje: error.message,
    valorOriginal: error.value,
  }));
}

export async function registerAndProcessImport(input: {
  authUserId: string;
  fileName: string;
  period: string;
  sourceId?: string;
  checksum: string;
  validation: ValidatedImport;
}) {
  const total = input.validation.rows.length;
  const invalidRows = new Set(
    input.validation.errors.flatMap((error) =>
      error.row ? [error.row] : [],
    ),
  ).size;
  const valid = input.validation.errors.length === 0 ? total : total - invalidRows;

  if (isDemoMode()) {
    if (
      [...demoStore.values()].some(
        (load) =>
          load.module === input.validation.module &&
          load.period === input.period &&
          load.file === input.fileName &&
          load.status === "COMPLETADA",
      )
    ) {
      throw new Error("Este archivo ya fue consolidado para el mismo periodo.");
    }
    const id = crypto.randomUUID();
    const load: LoadView & { rows: RawImportRow[]; sourceId?: string } = {
      id,
      date: new Date().toISOString(),
      module: input.validation.module,
      period: input.period,
      file: input.fileName,
      status:
        input.validation.errors.length > 0 ? "CON_ERRORES" : "COMPLETADA",
      total,
      valid,
      errors: input.validation.errors.length,
      quality: quality(valid, total),
      errorDetails: input.validation.errors.slice(0, 100),
      rows: input.validation.rows,
      sourceId: input.sourceId,
    };
    demoStore.set(id, load);
    if (
      input.validation.module === "VENTAS" &&
      input.validation.errors.length === 0
    ) {
      addDemoSalesRows(input.validation.rows);
    }
    return demoView(load);
  }

  const context = await resolveProductContext(
    input.authUserId,
    input.validation.module,
    input.sourceId,
  );
  const duplicate = await prisma.cargaDato.findFirst({
    where: {
      modulo: input.validation.module,
      periodo: input.period,
      checksum: input.checksum,
      estado: "COMPLETADA",
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error(
      `El mismo archivo ya fue consolidado en la carga ${duplicate.id}.`,
    );
  }
  const load = await prisma.cargaDato.create({
    data: {
      fuenteId: context.sourceId,
      modulo: input.validation.module,
      periodo: input.period,
      archivo: input.fileName,
      checksum: input.checksum,
      datosOrigen: input.validation.rows as Prisma.InputJsonValue,
      estado: "VALIDANDO",
      filasTotales: total,
      filasValidas: valid,
      filasError: input.validation.errors.length,
      iniciadoPor: context.profileId,
    },
  });
  if (input.validation.errors.length > 0) {
    await prisma.$transaction([
      prisma.errorCarga.createMany({
        data: errorData(load.id, input.validation.errors),
      }),
      prisma.cargaDato.update({
        where: { id: load.id },
        data: { estado: "CON_ERRORES", fechaFin: new Date() },
      }),
    ]);
    return (await getLoad(load.id))!;
  }
  return transformLoad(load.id, input.validation.module, input.validation.rows);
}

type Transaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

function dateParts(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  return {
    fechaId: year * 10000 + month * 100 + date.getUTCDate(),
    fecha: date,
    dia: date.getUTCDate(),
    mes: month,
    nombreMes: new Intl.DateTimeFormat("es-BO", {
      month: "long",
      timeZone: "UTC",
    }).format(date),
    trimestre: Math.ceil(month / 3),
    anio: year,
    esCierreMes:
      new Date(Date.UTC(year, month, 0)).getUTCDate() === date.getUTCDate(),
  };
}

async function ensureDate(tx: Transaction, value: string) {
  const parts = dateParts(value);
  return tx.dimFecha.upsert({
    where: { fechaId: parts.fechaId },
    update: {},
    create: parts,
  });
}

const number = (row: RawImportRow, field: string) => Number(row[field] || 0);

async function transformSales(
  tx: Transaction,
  loadId: string,
  rows: RawImportRow[],
) {
  for (const row of rows) {
    const date = await ensureDate(tx, row.fecha);
    const product = await tx.dimProducto.upsert({
      where: { codigo: row.producto_codigo },
      update: { nombre: row.producto_nombre, categoria: row.categoria },
      create: {
        codigo: row.producto_codigo,
        nombre: row.producto_nombre,
        categoria: row.categoria,
      },
    });
    const branch = await tx.dimSucursal.upsert({
      where: { codigo: row.sucursal_codigo },
      update: { nombre: row.sucursal_nombre, region: row.region },
      create: {
        codigo: row.sucursal_codigo,
        nombre: row.sucursal_nombre,
        region: row.region,
      },
    });
    const channel = await tx.dimCanal.upsert({
      where: { codigo: row.canal_codigo },
      update: { nombre: row.canal_nombre },
      create: { codigo: row.canal_codigo, nombre: row.canal_nombre },
    });
    const employee = row.empleado_codigo
      ? await tx.dimEmpleado.upsert({
          where: { codigo: row.empleado_codigo },
          update: { nombre: row.empleado_nombre || row.empleado_codigo },
          create: {
            codigo: row.empleado_codigo,
            nombre: row.empleado_nombre || row.empleado_codigo,
          },
        })
      : null;
    const gross = number(row, "venta_bruta");
    const discount = number(row, "descuento");
    const returnValue = number(row, "devolucion");
    const cost = number(row, "costo");
    const net = gross - discount - returnValue;
    await tx.factVenta.upsert({
      where: {
        documento_productoId: {
          documento: row.documento,
          productoId: product.productoId,
        },
      },
      update: {
        fechaId: date.fechaId,
        sucursalId: branch.sucursalId,
        canalId: channel.canalId,
        empleadoId: employee?.empleadoId,
        cantidad: number(row, "cantidad"),
        ventaBruta: gross,
        descuento: discount,
        devolucion: returnValue,
        ventaNeta: net,
        costo: cost,
        margen: net - cost,
        metaVenta: number(row, "meta_venta"),
        cargaId: loadId,
      },
      create: {
        fechaId: date.fechaId,
        productoId: product.productoId,
        sucursalId: branch.sucursalId,
        canalId: channel.canalId,
        empleadoId: employee?.empleadoId,
        documento: row.documento,
        cantidad: number(row, "cantidad"),
        ventaBruta: gross,
        descuento: discount,
        devolucion: returnValue,
        ventaNeta: net,
        costo: cost,
        margen: net - cost,
        metaVenta: number(row, "meta_venta"),
        cargaId: loadId,
      },
    });
  }
}

async function transformFinances(
  tx: Transaction,
  loadId: string,
  rows: RawImportRow[],
) {
  await tx.factFinanza.deleteMany({ where: { cargaId: loadId } });
  for (const row of rows) {
    const date = await ensureDate(tx, row.fecha);
    const account = await tx.dimCuenta.upsert({
      where: { codigo: row.cuenta_codigo },
      update: {
        nombre: row.cuenta_nombre,
        tipo: row.tipo_cuenta,
        nivel: number(row, "nivel"),
      },
      create: {
        codigo: row.cuenta_codigo,
        nombre: row.cuenta_nombre,
        tipo: row.tipo_cuenta,
        nivel: number(row, "nivel"),
      },
    });
    const costCenter = row.centro_costo_codigo
      ? await tx.dimCentroCosto.upsert({
          where: { codigo: row.centro_costo_codigo },
          update: {
            nombre:
              row.centro_costo_nombre || row.centro_costo_codigo,
          },
          create: {
            codigo: row.centro_costo_codigo,
            nombre:
              row.centro_costo_nombre || row.centro_costo_codigo,
          },
        })
      : null;
    const branch = row.sucursal_codigo
      ? await tx.dimSucursal.upsert({
          where: { codigo: row.sucursal_codigo },
          update: {
            nombre: row.sucursal_nombre || row.sucursal_codigo,
            region: row.region || "Sin región",
          },
          create: {
            codigo: row.sucursal_codigo,
            nombre: row.sucursal_nombre || row.sucursal_codigo,
            region: row.region || "Sin región",
          },
        })
      : null;
    const scenario = await tx.dimEscenario.upsert({
      where: { codigo: row.escenario_codigo },
      update: { nombre: row.escenario_nombre },
      create: {
        codigo: row.escenario_codigo,
        nombre: row.escenario_nombre,
      },
    });
    await tx.factFinanza.create({
      data: {
        fechaId: date.fechaId,
        cuentaId: account.cuentaId,
        centroCostoId: costCenter?.centroCostoId,
        sucursalId: branch?.sucursalId,
        escenarioId: scenario.escenarioId,
        importe: number(row, "importe"),
        debito: number(row, "debito"),
        credito: number(row, "credito"),
        cargaId: loadId,
      },
    });
  }
}

async function transformPerformance(
  tx: Transaction,
  loadId: string,
  rows: RawImportRow[],
) {
  for (const row of rows) {
    const date = await ensureDate(tx, row.fecha);
    const kpi = await tx.dimKpi.upsert({
      where: { codigo: row.kpi_codigo },
      update: {
        nombre: row.kpi_nombre,
        unidadMedida: row.unidad_medida,
        sentido: row.sentido as
          | "MAYOR_MEJOR"
          | "MENOR_MEJOR"
          | "RANGO"
          | "INFORMATIVO",
      },
      create: {
        codigo: row.kpi_codigo,
        nombre: row.kpi_nombre,
        modulo: "DESEMPENO",
        unidadMedida: row.unidad_medida,
        sentido: row.sentido as
          | "MAYOR_MEJOR"
          | "MENOR_MEJOR"
          | "RANGO"
          | "INFORMATIVO",
      },
    });
    const unit = await tx.dimUnidad.upsert({
      where: { codigo: row.unidad_codigo },
      update: { nombre: row.unidad_nombre },
      create: { codigo: row.unidad_codigo, nombre: row.unidad_nombre },
    });
    const employee = row.empleado_codigo
      ? await tx.dimEmpleado.upsert({
          where: { codigo: row.empleado_codigo },
          update: { nombre: row.empleado_nombre || row.empleado_codigo },
          create: {
            codigo: row.empleado_codigo,
            nombre: row.empleado_nombre || row.empleado_codigo,
          },
        })
      : null;
    const target = number(row, "valor_meta");
    const actual = number(row, "valor_real");
    const achievement = target === 0 ? 0 : (actual / target) * 100;
    const status: NivelSemaforo =
      achievement >= 100
        ? "VERDE"
        : achievement >= 90
          ? "AMARILLO"
          : "ROJO";
    await tx.factDesempeno.upsert({
      where: {
        fechaId_kpiId_unidadId: {
          fechaId: date.fechaId,
          kpiId: kpi.kpiId,
          unidadId: unit.unidadId,
        },
      },
      update: {
        empleadoId: employee?.empleadoId,
        valorMeta: target,
        valorReal: actual,
        cumplimiento: achievement,
        estado: status,
        cargaId: loadId,
      },
      create: {
        fechaId: date.fechaId,
        kpiId: kpi.kpiId,
        unidadId: unit.unidadId,
        empleadoId: employee?.empleadoId,
        valorMeta: target,
        valorReal: actual,
        cumplimiento: achievement,
        estado: status,
        cargaId: loadId,
      },
    });
  }
}

async function transformLoad(
  loadId: string,
  module: ImportModule,
  rows: RawImportRow[],
) {
  try {
    await prisma.cargaDato.update({
      where: { id: loadId },
      data: { estado: "TRANSFORMANDO", fechaFin: null },
    });
    await prisma.$transaction(
      async (tx) => {
        if (module === "VENTAS") await transformSales(tx, loadId, rows);
        if (module === "FINANZAS") await transformFinances(tx, loadId, rows);
        if (module === "DESEMPENO")
          await transformPerformance(tx, loadId, rows);
        await tx.cargaDato.update({
          where: { id: loadId },
          data: { estado: "COMPLETADA", fechaFin: new Date() },
        });
      },
      { timeout: 120_000 },
    );
  } catch (error) {
    await prisma.cargaDato.update({
      where: { id: loadId },
      data: { estado: "FALLIDA", fechaFin: new Date() },
    });
    throw error;
  }
  return (await getLoad(loadId))!;
}

export async function getLoad(id: string) {
  if (isDemoMode()) {
    const load = demoStore.get(id);
    if (!load) return null;
    return demoView(load);
  }
  const row = await prisma.cargaDato.findUnique({
    where: { id },
    include: { errores: { orderBy: { numeroFila: "asc" }, take: 100 } },
  });
  return row ? serializeLoad(row) : null;
}

export async function retryLoad(id: string) {
  if (isDemoMode()) {
    const load = demoStore.get(id);
    if (!load) throw new Error("Carga no encontrada.");
    const validation = validateImport(load.module, load.rows);
    load.errors = validation.errors.length;
    load.errorDetails = validation.errors.slice(0, 100);
    load.valid =
      validation.errors.length === 0
        ? load.total
        : Math.max(0, load.total - new Set(validation.errors.map((e) => e.row)).size);
    load.quality = quality(load.valid, load.total);
    load.status =
      validation.errors.length === 0 ? "COMPLETADA" : "CON_ERRORES";
    return demoView(load);
  }
  const load = await prisma.cargaDato.findUnique({ where: { id } });
  if (!load) throw new Error("Carga no encontrada.");
  if (!["CON_ERRORES", "FALLIDA"].includes(load.estado)) {
    throw new Error("Solo se pueden reintentar cargas con errores o fallidas.");
  }
  if (!Array.isArray(load.datosOrigen)) {
    throw new Error("La carga no conserva datos de origen para el reintento.");
  }
  const rows = load.datosOrigen as RawImportRow[];
  const validation = validateImport(
    load.modulo as ImportModule,
    rows,
    load.periodo,
  );
  await prisma.errorCarga.deleteMany({ where: { cargaId: id } });
  if (validation.errors.length > 0) {
    await prisma.$transaction([
      prisma.errorCarga.createMany({
        data: errorData(id, validation.errors),
      }),
      prisma.cargaDato.update({
        where: { id },
        data: {
          estado: "CON_ERRORES",
          filasError: validation.errors.length,
          fechaFin: new Date(),
        },
      }),
    ]);
    return (await getLoad(id))!;
  }
  await prisma.cargaDato.update({
    where: { id },
    data: { filasValidas: rows.length, filasError: 0 },
  });
  return transformLoad(id, load.modulo as ImportModule, rows);
}
