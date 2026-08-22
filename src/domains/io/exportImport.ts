/**
 * Import/Export Module
 *
 * Enables interoperability with industry-standard tools:
 *   - Nastran BDF for FEA
 *   - STEP/IGES for CAD
 *   - CSV for data exchange
 *   - UIUC .dat for airfoil coordinates
 *   - JSON for API integration
 *
 * All exports run client-side. No server calls needed.
 */

export interface AirfoilCoordinates {
  name: string;
  coordinates: { x: number; y: number }[];
  n_points: number;
  is_closed: boolean;
}

// ─── IMPORT ────────────────────────────────────────────────────────

/**
 * Parse UIUC .dat airfoil coordinate file
 * Format: First line is name, subsequent lines are x y pairs (whitespace separated)
 * Comment lines starting with # are ignored.
 */
export function importUIUCDat(fileContent: string): AirfoilCoordinates {
  const lines = fileContent.split('\n');
  let name = 'unknown';
  const coordinates: { x: number; y: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    if (i === 0 || (i <= 1 && coordinates.length === 0)) {
      name = line;
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!isNaN(x) && !isNaN(y)) {
        coordinates.push({ x, y });
      }
    }
  }

  return {
    name,
    coordinates,
    n_points: coordinates.length,
    is_closed: true,
  };
}

/**
 * Parse CSV data (CL/CD polars)
 */
export function importCSV(fileContent: string): Record<string, number>[] {
  const lines = fileContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data: Record<string, number>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, number> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = parseFloat(values[j]) || 0;
    }
    data.push(row);
  }

  return data;
}

// ─── EXPORT ────────────────────────────────────────────────────────

/**
 * Export airfoil to CSV format
 */
export function exportToCSV(
  data: Record<string, number>[],
  headers?: string[]
): string {
  const cols = headers ?? Object.keys(data[0] ?? {});
  const lines = [cols.join(',')];
  for (const row of data) {
    lines.push(cols.map(c => String(row[c] ?? '')).join(','));
  }
  return lines.join('\n');
}

/**
 * Export to Nastran BDF format
 */
export function exportNastranBDF(params: {
  nodes: { id: number; x: number; y: number; z: number }[];
  elements: { id: number; property_id: number; nodes: number[] }[];
  material: { E: number; nu: number; rho: number };
  forces: { node_id: number; fx: number; fy: number; fz: number }[];
}): string {
  const lines: string[] = [];

  lines.push('CEND');
  lines.push('BULK');

  // GRID cards
  for (const node of params.nodes) {
    lines.push(
      `GRID    ${String(node.id).padEnd(8)}        ${node.x.toExponential(6)}  ${node.y.toExponential(6)}  ${node.z.toExponential(6)}`
    );
  }

  // CQUAD4 cards
  for (const elem of params.elements) {
    const nodeStr = elem.nodes.map(n => String(n).padEnd(8)).join('');
    lines.push(
      `CQUAD4  ${String(elem.id).padEnd(8)}${String(elem.property_id).padEnd(8)}${nodeStr}`
    );
  }

  // MAT1 card
  const mat = params.material;
  lines.push(
    `MAT1    1       ${mat.E.toExponential(6)}  ${mat.nu}          ${mat.rho}`
  );

  // FORCE cards
  for (const force of params.forces) {
    lines.push(
      `FORCE   ${force.node_id}   0       ${force.fx.toExponential(6)}  ${force.fy.toExponential(6)}  ${force.fz.toExponential(6)}`
    );
  }

  lines.push('ENDDATA');

  return lines.join('\n');
}

/**
 * Export to JSON
 */
export function exportToJSON(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Download helper (browser)
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  if (typeof document === 'undefined') return;  // SSR guard

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
