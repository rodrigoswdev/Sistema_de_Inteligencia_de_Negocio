const clean = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");

const escapePdf = (value: string) =>
  clean(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const truncate = (value: unknown, length: number) => {
  const text = String(value ?? "—");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
};

interface ProfessionalPdfOptions {
  title: string;
  subtitle?: string;
  metadata?: string[];
  rows: Array<Record<string, unknown>>;
}

function text(
  value: string,
  x: number,
  y: number,
  size = 9,
  font = "F1",
  color = "0.14 0.23 0.33",
) {
  return `${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(value)}) Tj ET`;
}

export function createProfessionalPdf(options: ProfessionalPdfOptions) {
  const columns = Object.keys(options.rows[0] ?? { Resultado: "" }).slice(0, 5);
  const sourceRows = options.rows.length
    ? options.rows
    : [{ Resultado: "No hay datos para los filtros seleccionados" }];
  const rowsPerPage = 24;
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(sourceRows.length / rowsPerPage)) },
    (_, page) => sourceRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
  );
  const width = 504 / Math.max(columns.length, 1);
  const streams = pages.map((rows, pageIndex) => {
    const commands = [
      "0.063 0.165 0.263 rg 0 770 612 72 re f",
      "0.949 0.549 0.157 rg 0 766 612 4 re f",
      text("SIBI CBN", 54, 813, 10, "F2", "1 1 1"),
      text(options.title, 54, 790, 17, "F2", "1 1 1"),
      text(options.subtitle ?? "Reporte de inteligencia de negocios", 54, 747, 9),
      ...((options.metadata ?? []).slice(0, 3).map((item, index) =>
        text(item, 54, 730 - index * 14, 8, "F1", "0.35 0.43 0.51"),
      )),
      "0.91 0.94 0.96 rg 54 665 504 24 re f",
    ];
    columns.forEach((column, index) => {
      commands.push(
        text(truncate(column, 17), 59 + index * width, 673, 8, "F2"),
      );
    });
    rows.forEach((row, rowIndex) => {
      const y = 646 - rowIndex * 23;
      if (rowIndex % 2 === 1) {
        commands.push(`0.97 0.98 0.99 rg 54 ${y - 6} 504 21 re f`);
      }
      commands.push(`0.88 0.91 0.94 RG 54 ${y - 7} m 558 ${y - 7} l S`);
      columns.forEach((column, index) => {
        commands.push(
          text(truncate(row[column], 18), 59 + index * width, y, 7.5),
        );
      });
    });
    commands.push(
      text(
        `Generado ${new Date().toLocaleString("es-BO", {
          timeZone: "America/La_Paz",
        })}`,
        54,
        30,
        7,
        "F1",
        "0.45 0.51 0.58",
      ),
      text(
        `Pagina ${pageIndex + 1} de ${pages.length}`,
        490,
        30,
        7,
        "F1",
        "0.45 0.51 0.58",
      ),
    );
    return commands.join("\n");
  });

  const pageCount = streams.length;
  const fontRegularId = pageCount * 2 + 3;
  const fontBoldId = pageCount * 2 + 4;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${streams.map((_, index) => `${index + 3} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  ];
  streams.forEach((_stream, index) => {
    const contentId = pageCount + 3 + index;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
  });
  streams.forEach((stream) => {
    objects.push(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

export function createSimplePdf(lines: string[]) {
  return createProfessionalPdf({
    title: lines[0] ?? "Reporte SIBI CBN",
    rows: lines.slice(1).map((line) => ({ Detalle: line })),
  });
}

const xmlEscape = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function createSpreadsheet(
  rows: Array<Record<string, unknown>>,
  options: { title?: string; subtitle?: string; metadata?: string[] } = {},
) {
  const safeRows = rows.length
    ? rows
    : [{ Resultado: "No hay datos para los filtros seleccionados" }];
  const headers = Object.keys(safeRows[0]);
  const cell = (value: unknown, style?: string) =>
    `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${
      typeof value === "number" ? "Number" : "String"
    }">${xmlEscape(value)}</Data></Cell>`;
  const columnWidths = headers
    .map((header) => {
      const longest = Math.max(
        header.length,
        ...safeRows.slice(0, 200).map((row) =>
          String(row[header] ?? "").length,
        ),
      );
      return `<Column ss:AutoFitWidth="0" ss:Width="${Math.min(220, Math.max(75, longest * 7))}"/>`;
    })
    .join("");
  const metadata = [
    ...(options.metadata ?? []),
    `Generado: ${new Date().toLocaleString("es-BO", {
      timeZone: "America/La_Paz",
    })}`,
  ];
  const metadataRows = metadata
    .map(
      (item) =>
        `<Row><Cell ss:MergeAcross="${Math.max(headers.length - 1, 0)}" ss:StyleID="Metadata"><Data ss:Type="String">${xmlEscape(item)}</Data></Cell></Row>`,
    )
    .join("");
  const dataRows = safeRows
    .map(
      (row, rowIndex) =>
        `<Row ss:StyleID="${rowIndex % 2 ? "Alternate" : "Data"}">${headers
          .map((header) => cell(row[header]))
          .join("")}</Row>`,
    )
    .join("");

  return Buffer.from(
    `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:x="urn:schemas-microsoft-com:office:excel">
 <Styles>
  <Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="18" ss:Color="#FFFFFF"/><Interior ss:Color="#102A43" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="Subtitle"><Font ss:Bold="1" ss:Size="11" ss:Color="#F28C28"/><Interior ss:Color="#102A43" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Metadata"><Font ss:Size="9" ss:Color="#526B7F"/></Style>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1D75BD" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#102A43"/></Borders></Style>
  <Style ss:ID="Data"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBE4EC"/></Borders></Style>
  <Style ss:ID="Alternate"><Interior ss:Color="#F3F6F9" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBE4EC"/></Borders></Style>
 </Styles>
 <Worksheet ss:Name="Reporte SIBI CBN">
  <Table>
   ${columnWidths}
   <Row ss:Height="30"><Cell ss:MergeAcross="${Math.max(headers.length - 1, 0)}" ss:StyleID="Title"><Data ss:Type="String">${xmlEscape(options.title ?? "SIBI CBN · Reporte BI")}</Data></Cell></Row>
   <Row ss:Height="22"><Cell ss:MergeAcross="${Math.max(headers.length - 1, 0)}" ss:StyleID="Subtitle"><Data ss:Type="String">${xmlEscape(options.subtitle ?? "Inteligencia de negocios")}</Data></Cell></Row>
   ${metadataRows}
   <Row ss:Height="8"/>
   <Row>${headers.map((header) => cell(header, "Header")).join("")}</Row>
   ${dataRows}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/><FrozenNoSplit/><SplitHorizontal>${metadata.length + 4}</SplitHorizontal><TopRowBottomPane>${metadata.length + 4}</TopRowBottomPane>
   <AutoFilter x:Range="R${metadata.length + 5}C1:R${metadata.length + 5}C${headers.length}" xmlns="urn:schemas-microsoft-com:office:excel"/>
   <Selected/>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`,
    "utf8",
  );
}
