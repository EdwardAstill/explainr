import type { BlockAttr } from "../blocks";

export interface CsvData {
  headers: string[];
  rows: string[][];
}

export function parseCSV(content: string): CsvData {
  const lines = content.split(/\r?\n/);
  const nonEmpty = lines.filter(l => l.trim() !== "");
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(nonEmpty[0]!);
  const rows = nonEmpty.slice(1).map(parseLine);
  return { headers, rows };
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let field = "";
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i).trim());
        break;
      }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

export function renderCsvViewer(content: string, _filename: string, attrs: BlockAttr[]): string {
  const data = parseCSV(content);
  const rowsAttr = attrs.find(a => a.key === "rows")?.value;
  const maxRows = typeof rowsAttr === "string" ? parseInt(rowsAttr, 10) || 100 : 100;
  const filter = attrs.find(a => a.key === "filter")?.value !== "false";
  const heightAttr = attrs.find(a => a.key === "height")?.value;
  const height = typeof heightAttr === "string" ? Math.max(200, Math.min(1000, parseInt(heightAttr, 10) || 400)) : 400;

  const id = `csv-${Math.random().toString(36).slice(2, 8)}`;
  const json = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
  // Use escaped closing tag only when data itself contained </script to avoid
  // injecting the literal string into the document. Browsers accept <\/script>
  // as an end-of-script boundary in this edge case.
  const closeTag = json.includes("<\\/script") ? "<\\/script>" : "</script>";

  return `<div class="csv-viewer" data-csv-id="${id}" data-rows="${maxRows}" data-filter="${filter}" style="height:${height}px">` +
    `<div class="csv-toolbar">${filter ? `<input class="csv-filter" type="text" placeholder="Filter rows…" aria-label="Filter rows">` : ""}</div>` +
    `<div class="csv-table-wrap"><table class="csv-table"></table></div>` +
    `<div class="csv-pagination"></div>` +
    `</div>` +
    `\n<script type="application/json" id="csv-data-${id}">${json}${closeTag}`;
}
