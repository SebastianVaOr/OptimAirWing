/**
 * UIUC Airfoil Database Downloader & Parser
 *
 * Downloads polars from the UIUC Low-Speed Airfoil Test database
 * (m-selig.ae.illinois.edu) and parses them into structured data.
 *
 * Reference: Selig, M.S. et al. "Summary of Low-Speed Airfoil Data",
 *            SoarTech Publications, Vols 1-6.
 */

export interface UIPolarPoint {
  alpha: number;
  CL: number;
  CD: number;
  Cm?: number;
}

export interface UIPolar {
  airfoil: string;
  Re: number;
  points: UIPolarPoint[];
}

const UIUC_VOLUMES = [
  'https://m-selig.ae.illinois.edu/pd/pub/lsat/volume01.zip',
  'https://m-selig.ae.illinois.edu/pd/pub/lsat/volume02.zip',
  'https://m-selig.ae.illinois.edu/pd/pub/lsat/volume03.zip',
];

const NAME_TO_NACA: Record<string, string> = {
  e387: '2412', s1223: '1223', clarky: '2412', clarkyf: '2412',
  clarkz: '2418', e374: '4412', e423: '4421', goe72: '2412',
  sd2030: '2412', sd7003: '2408', s1010: '0009', sg6043: '0010',
  sm7015: '2412', wave16: '2418', rg14: '2412', s1046: '2301',
};

function extractNACAFromFilename(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (/^\d{4}/.test(clean)) return clean.substring(0, 4);
  const match = clean.match(/(\d{4})/);
  if (match) return match[1];
  return NAME_TO_NACA[clean] || '2412';
}

function parseUIUCPolars(content: string, filename: string): UIPolar[] {
  const result: UIPolar[] = [];
  const nacaCode = extractNACAFromFilename(filename);
  const blocks = content.split(/Airfoil:\s*/i).filter(b => b.trim().length > 0);

  for (const block of blocks) {
    let Re = 100000;
    const reMatch = block.match(/Re(?:ynolds)?\s*#?\s*[:\s]*([0-9.eE+\-]+)/i);
    if (reMatch) Re = parseFloat(reMatch[1].replace(/[eE]/, 'e'));

    const points: UIPolarPoint[] = [];
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || !/^-?\d/.test(trimmed)) continue;
      const parts = trimmed.split(/\s+/).map(Number);
      if (parts.length >= 3 && parts.every(p => isFinite(p))) {
        const [alpha, CL, CD, Cm] = parts;
        if (CD > 0 && CL > -2 && CL < 5) points.push({ alpha, CL, CD, Cm });
      }
    }
    if (points.length > 5) result.push({ airfoil: nacaCode, Re, points });
  }
  return result;
}

async function parseVolume(url: string): Promise<UIPolar[]> {
  const polars: UIPolar[] = [];
  try {
    const response = await fetch(url);
    if (!response.ok) return polars;
    const JSZip = (await import('jszip' as string)).default ?? (await import('jszip' as string));
    const zipData = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(zipData);
    for (const [path, file] of Object.entries(zip.files) as [string, any][]) {
      if (file.dir) continue;
      const ext = path.split('.').pop()?.toLowerCase();
      if (ext !== 'drg' && ext !== 'lft') continue;
      const content = await file.async('text');
      polars.push(...parseUIUCPolars(content, path.split('/').pop() ?? path));
    }
  } catch (err) {
    console.warn('[UIUC] Error parsing volume:', url, err);
  }
  return polars;
}

const STORAGE_KEY = 'optimairwing_uiuc_dataset';

export function saveDataset(polars: UIPolar[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(polars)); } catch { /* */ }
}

export function loadCachedDataset(): UIPolar[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as UIPolar[] : null;
  } catch { return null; }
}

export async function downloadUIUCDataset(): Promise<UIPolar[]> {
  const cached = loadCachedDataset();
  if (cached && cached.length > 50) return cached;

  console.log('[UIUC] Downloading airfoil polars from UIUC database...');
  const allPolars: UIPolar[] = [];
  for (const url of UIUC_VOLUMES) {
    const polars = await parseVolume(url);
    allPolars.push(...polars);
    console.log('[UIUC] Parsed', polars.length, 'polars from', url.split('/').pop());
  }
  saveDataset(allPolars);
  const nAirfoils = new Set(allPolars.map(p => p.airfoil)).size;
  console.log('[UIUC] Total:', allPolars.length, 'polars from', nAirfoils, 'airfoils');
  return allPolars;
}

export function getUniqueAirfoils(polars: UIPolar[]): string[] {
  return [...new Set(polars.map(p => p.airfoil))];
}

export function filterPolars(polars: UIPolar[], airfoil: string, ReMin: number, ReMax: number): UIPolar[] {
  return polars.filter(p => p.airfoil === airfoil && p.Re >= ReMin && p.Re <= ReMax);
}
