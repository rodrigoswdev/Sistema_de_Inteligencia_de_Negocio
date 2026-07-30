const latin1 = (value: string) =>
  value
    .normalize("NFC")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

const escapePdf = (value: string) =>
  latin1(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const display = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return new Intl.NumberFormat("es-BO", {
      maximumFractionDigits: 2,
    }).format(value);
  }
  return String(value);
};

const truncate = (value: unknown, length: number) => {
  const output = display(value);
  return output.length > length ? `${output.slice(0, length - 1)}…` : output;
};

export interface ProfessionalDocumentOptions {
  title: string;
  subtitle?: string;
  metadata?: string[];
  rows: Array<Record<string, unknown>>;
}

function pdfText(
  value: string,
  x: number,
  y: number,
  size = 9,
  font = "F1",
  color = "0.14 0.23 0.33",
) {
  return `${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(value)}) Tj ET`;
}

function assemblePdf(objects: Buffer[]) {
  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1");
  const chunks: Uint8Array[] = [header];
  const offsets = [0];
  let position = header.length;
  objects.forEach((object, index) => {
    offsets.push(position);
    const prefix = Buffer.from(`${index + 1} 0 obj\n`, "latin1");
    const suffix = Buffer.from("\nendobj\n", "latin1");
    chunks.push(prefix, object, suffix);
    position += prefix.length + object.length + suffix.length;
  });

  const xrefPosition = position;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefPosition}`,
    "%%EOF",
  ].join("\n");
  chunks.push(Buffer.from(`${xref}\n`, "latin1"));
  return Buffer.concat(chunks);
}

export function createProfessionalPdf(options: ProfessionalDocumentOptions) {
  const sourceRows = options.rows.length
    ? options.rows
    : [{ Resultado: "No existen datos para los filtros seleccionados." }];
  const columns = Object.keys(sourceRows[0]).slice(0, 8);
  const rowsPerPage = 20;
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(sourceRows.length / rowsPerPage)) },
    (_, page) => sourceRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
  );
  const tableWidth = 734;
  const columnWidth = tableWidth / Math.max(columns.length, 1);
  const characterLimit = Math.max(9, Math.floor(columnWidth / 4.8));

  const streams = pages.map((rows, pageIndex) => {
    const commands = [
      "0.063 0.165 0.263 rg 0 523 842 72 re f",
      "0.949 0.549 0.157 rg 0 519 842 4 re f",
      pdfText("SIBI CBN", 54, 570, 10, "F2", "1 1 1"),
      pdfText(options.title, 54, 544, 18, "F2", "1 1 1"),
      pdfText(
        options.subtitle ?? "Sistema Integral de Business Intelligence",
        54,
        500,
        9,
      ),
      ...((options.metadata ?? []).slice(0, 4).map((item, index) =>
        pdfText(item, 54, 483 - index * 13, 7.5, "F1", "0.35 0.43 0.51"),
      )),
      "0.91 0.94 0.96 rg 54 411 734 25 re f",
    ];

    columns.forEach((column, index) => {
      commands.push(
        pdfText(
          truncate(column, characterLimit),
          59 + index * columnWidth,
          420,
          7.2,
          "F2",
        ),
      );
    });

    rows.forEach((row, rowIndex) => {
      const y = 395 - rowIndex * 17;
      if (rowIndex % 2 === 1) {
        commands.push(`0.97 0.98 0.99 rg 54 ${y - 5} 734 16 re f`);
      }
      commands.push(`0.88 0.91 0.94 RG 54 ${y - 6} m 788 ${y - 6} l S`);
      columns.forEach((column, index) => {
        commands.push(
          pdfText(
            truncate(row[column], characterLimit),
            59 + index * columnWidth,
            y,
            6.8,
          ),
        );
      });
    });

    commands.push(
      pdfText(
        `Documento generado el ${new Date().toLocaleString("es-BO", {
          timeZone: "America/La_Paz",
        })}`,
        54,
        24,
        7,
        "F1",
        "0.45 0.51 0.58",
      ),
      pdfText(
        `Página ${pageIndex + 1} de ${pages.length}`,
        706,
        24,
        7,
        "F1",
        "0.45 0.51 0.58",
      ),
      pdfText(
        "Documento confidencial · Uso interno",
        335,
        24,
        7,
        "F2",
        "0.45 0.51 0.58",
      ),
    );
    return Buffer.from(commands.join("\n"), "latin1");
  });

  const pageCount = streams.length;
  const fontRegularId = pageCount * 2 + 3;
  const fontBoldId = pageCount * 2 + 4;
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1"),
    Buffer.from(
      `<< /Type /Pages /Kids [${streams.map((_, index) => `${index + 3} 0 R`).join(" ")}] /Count ${pageCount} >>`,
      "latin1",
    ),
  ];

  streams.forEach((_stream, index) => {
    const contentId = pageCount + 3 + index;
    objects.push(
      Buffer.from(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
        "latin1",
      ),
    );
  });
  streams.forEach((stream) => {
    objects.push(
      Buffer.concat([
        Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "latin1"),
        stream,
        Buffer.from("\nendstream", "latin1"),
      ]),
    );
  });
  objects.push(
    Buffer.from(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "latin1",
    ),
    Buffer.from(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      "latin1",
    ),
  );
  return assemblePdf(objects);
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const columnName = (index: number) => {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
};

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const crc32 = (data: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

function zipWorkbook(entries: Array<{ name: string; content: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate =
    ((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.content, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

const inlineCell = (reference: string, value: unknown, style = 0) =>
  `<c r="${reference}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;

const numberCell = (reference: string, value: number, style: number) =>
  `<c r="${reference}" s="${style}"><v>${Number.isFinite(value) ? value : 0}</v></c>`;

function worksheetXml(
  rows: Array<Record<string, unknown>>,
  options: ProfessionalDocumentOptions,
) {
  const safeRows = rows.length
    ? rows
    : [{ Resultado: "No existen datos para los filtros seleccionados." }];
  const headers = Object.keys(safeRows[0]);
  const metadata = [
    ...(options.metadata ?? []),
    `Generado: ${new Date().toLocaleString("es-BO", {
      timeZone: "America/La_Paz",
    })}`,
  ];
  const headerRow = metadata.length + 5;
  const lastColumn = columnName(Math.max(headers.length - 1, 0));
  const titleRows = [
    `<row r="1" ht="30" customHeight="1">${inlineCell("A1", options.title, 1)}</row>`,
    `<row r="2" ht="22" customHeight="1">${inlineCell("A2", options.subtitle ?? "Sistema Integral de Business Intelligence", 2)}</row>`,
    ...metadata.map((item, index) => {
      const row = index + 3;
      return `<row r="${row}">${inlineCell(`A${row}`, item, 3)}</row>`;
    }),
    `<row r="${headerRow - 1}" ht="8" customHeight="1"/>`,
    `<row r="${headerRow}" ht="22" customHeight="1">${headers
      .map((header, index) =>
        inlineCell(`${columnName(index)}${headerRow}`, header, 4),
      )
      .join("")}</row>`,
  ];
  const dataRows = safeRows.map((row, rowIndex) => {
    const excelRow = headerRow + rowIndex + 1;
    const cells = headers.map((header, columnIndex) => {
      const reference = `${columnName(columnIndex)}${excelRow}`;
      const value = row[header];
      if (typeof value === "number") {
        const currency = /\bBs\b/i.test(header);
        const style = currency
          ? rowIndex % 2
            ? 10
            : 9
          : rowIndex % 2
            ? 8
            : 7;
        return numberCell(reference, value, style);
      }
      return inlineCell(reference, value, rowIndex % 2 ? 6 : 5);
    });
    return `<row r="${excelRow}">${cells.join("")}</row>`;
  });
  const widths = headers
    .map((header, index) => {
      const longest = Math.max(
        header.length,
        ...safeRows
          .slice(0, 300)
          .map((row) => display(row[header]).length),
      );
      return `<col min="${index + 1}" max="${index + 1}" width="${Math.min(32, Math.max(11, longest + 2))}" customWidth="1"/>`;
    })
    .join("");
  const merges = [
    `A1:${lastColumn}1`,
    `A2:${lastColumn}2`,
    ...metadata.map((_, index) => `A${index + 3}:${lastColumn}${index + 3}`),
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
 <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
 <dimension ref="A1:${lastColumn}${headerRow + safeRows.length}"/>
 <sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
 <sheetFormatPr defaultRowHeight="18"/>
 <cols>${widths}</cols>
 <sheetData>${titleRows.join("")}${dataRows.join("")}</sheetData>
 <mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
 <autoFilter ref="A${headerRow}:${lastColumn}${headerRow + safeRows.length}"/>
 <pageMargins left="0.3" right="0.3" top="0.6" bottom="0.6" header="0.25" footer="0.25"/>
 <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
 <headerFooter><oddHeader>&amp;L&amp;BSIBI CBN&amp;B&amp;RReporte BI</oddHeader><oddFooter>&amp;LConfidencial · Uso interno&amp;CPágina &amp;P de &amp;N&amp;R${xmlEscape(new Date().toLocaleDateString("es-BO"))}</oddFooter></headerFooter>
</worksheet>`;
}

function summaryXml(options: ProfessionalDocumentOptions) {
  const numericTotals = Object.keys(options.rows[0] ?? {})
    .filter((header) =>
      options.rows.some((row) => typeof row[header] === "number"),
    )
    .slice(0, 8)
    .map((header) => ({
      header,
      total: options.rows.reduce(
        (sum, row) =>
          sum + (typeof row[header] === "number" ? row[header] : 0),
        0,
      ),
    }));
  const metrics = [
    { label: "Registros incluidos", value: options.rows.length },
    ...numericTotals.map((item) => ({
      label: `Total · ${item.header}`,
      value: item.total,
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
 <sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
 <sheetFormatPr defaultRowHeight="20"/>
 <cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="22" customWidth="1"/></cols>
 <sheetData>
  <row r="1" ht="34" customHeight="1">${inlineCell("A1", options.title, 1)}</row>
  <row r="2" ht="24" customHeight="1">${inlineCell("A2", "Resumen ejecutivo del documento", 2)}</row>
  <row r="4">${inlineCell("A4", "Indicador", 4)}${inlineCell("B4", "Resultado", 4)}</row>
  ${metrics
    .map(
      (metric, index) =>
        `<row r="${index + 5}" ht="24" customHeight="1">${inlineCell(`A${index + 5}`, metric.label, index % 2 ? 6 : 5)}${numberCell(`B${index + 5}`, metric.value, index % 2 ? 8 : 7)}</row>`,
    )
    .join("")}
 </sheetData>
 <mergeCells count="2"><mergeCell ref="A1:B1"/><mergeCell ref="A2:B2"/></mergeCells>
 <pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.25" footer="0.25"/>
</worksheet>`;
}

export function createSpreadsheet(
  rows: Array<Record<string, unknown>>,
  options: Partial<Omit<ProfessionalDocumentOptions, "rows">> = {},
) {
  const document: ProfessionalDocumentOptions = {
    title: options.title ?? "SIBI CBN · Reporte BI",
    subtitle:
      options.subtitle ?? "Sistema Integral de Business Intelligence",
    metadata: options.metadata,
    rows,
  };
  const created = new Date().toISOString();
  const entries = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(document.title)}</dc:title><dc:creator>SIBI CBN</dc:creator><dc:subject>Reporte de inteligencia de negocios</dc:subject><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SIBI CBN</Application><Company>Cervecería Boliviana Nacional</Company></Properties>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Datos" sheetId="2" r:id="rId2"/></sheets><calcPr calcId="191029"/></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00 &quot;Bs&quot;"/></numFmts><fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFF28C28"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF102A43"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D75BD"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F6F9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFDBE4EC"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="11"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: summaryXml(document),
    },
    {
      name: "xl/worksheets/sheet2.xml",
      content: worksheetXml(rows, document),
    },
  ];
  return zipWorkbook(entries);
}
