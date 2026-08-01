import puppeteer from 'puppeteer';
import { logger } from './logger';

interface PdfReportData {
  title: string;
  date: string;
  params: Record<string, unknown>;
  results: Record<string, unknown>;
  nacaCode?: string;
  sector?: string;
}

function buildHtml(data: PdfReportData): string {
  const paramRows = Object.entries(data.params).map(([k, v]) =>
    `<tr><td style="padding:4px 8px;border:1px solid #333;color:#aaa;font-size:11px">${k}</td><td style="padding:4px 8px;border:1px solid #333;color:#fff;font-size:11px">${v ?? '-'}</td></tr>`
  ).join('');
  const resultRows = Object.entries(data.results).map(([k, v]) =>
    `<tr><td style="padding:4px 8px;border:1px solid #333;color:#aaa;font-size:11px">${k}</td><td style="padding:4px 8px;border:1px solid #333;color:#0ff;font-size:11px">${typeof v === 'number' ? v.toFixed(4) : v ?? '-'}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${data.title}</title>
<style>body{background:#0a0f18;font-family:monospace;padding:20px;color:#e8f1fb;}
h1{color:#0ff;font-size:16px;border-bottom:1px solid #16202f;padding-bottom:8px;}
h2{color:#8ea3bd;font-size:13px;margin-top:20px;}
table{width:100%;border-collapse:collapse;margin-top:8px;}
.footer{text-align:center;margin-top:30px;font-size:10px;color:#5b6f8c;border-top:1px solid #16202f;padding-top:10px;}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;background:#16202f;color:#8ea3bd;margin-right:4px;}
</style></head><body>
<h1>${data.title}</h1>
<p style="color:#5b6f8c;font-size:11px">${data.date}</p>
${data.nacaCode ? `<span class="tag">NACA ${data.nacaCode}</span>` : ''}
${data.sector ? `<span class="tag">${data.sector}</span>` : ''}

<h2>Parámetros de Entrada</h2>
<table>${paramRows}</table>

<h2>Resultados Aerodinámicos</h2>
<table>${resultRows}</table>

<div class="footer">Generado por OptimAirWing Engine — ${data.date}</div>
</body></html>`;
}

export async function generatePdf(data: PdfReportData): Promise<Buffer | null> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(buildHtml(data), { waitUntil: 'networkidle0' as any });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } catch (err) {
    logger.error({ err }, 'Error al generar PDF');
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
