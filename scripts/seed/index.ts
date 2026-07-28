import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    ["ADMINISTRADOR", "Configuración y seguridad"],
    ["ANALISTA_BI", "Integración, KPI y análisis"],
    ["VENTAS", "Consulta del módulo comercial"],
    ["FINANZAS", "Consulta del módulo financiero"],
    ["DESEMPENO", "Consulta del desempeño organizacional"],
    ["GERENCIA", "Visión ejecutiva y reportes"],
    ["AUDITOR", "Consulta de trazabilidad"],
  ] as const;
  for (const [nombre, descripcion] of roles) {
    await prisma.rol.upsert({ where: { nombre }, update: { descripcion }, create: { nombre, descripcion } });
  }
  for (const escenario of [
    { codigo: "REAL", nombre: "Real" },
    { codigo: "PRESUPUESTO", nombre: "Presupuesto" },
  ]) {
    await prisma.dimEscenario.upsert({ where: { codigo: escenario.codigo }, update: escenario, create: escenario });
  }
  for (const canal of [
    { codigo: "TRAD", nombre: "Tradicional", tipo: "COMERCIAL" },
    { codigo: "MOD", nombre: "Moderno", tipo: "COMERCIAL" },
    { codigo: "DIST", nombre: "Distribuidor", tipo: "COMERCIAL" },
  ]) {
    await prisma.dimCanal.upsert({ where: { codigo: canal.codigo }, update: canal, create: canal });
  }
  console.log("Datos maestros SIBI CBN creados.");
}

main().finally(() => prisma.$disconnect());
