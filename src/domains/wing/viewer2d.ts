/**
 * Visualizador 2D del Perfil NACA con D3.js
 * Extraído y modularizado desde legacy_index.html.
 */

import * as d3 from 'd3';
import { generarNACA } from './naca';

export function renderProfile2D(container: HTMLElement, nacaCode: string): void {
  container.innerHTML = '';

  const width = container.clientWidth || 300;
  const height = container.clientHeight || 120;
  const margin = { top: 8, bottom: 8, left: 12, right: 12 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const naca = generarNACA(nacaCode, 120);
  const { x_u, y_u, x_l, y_l } = naca;

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', '#05070c')
    .style('border-radius', '6px');

  const xScale = d3
    .scaleLinear()
    .domain([-0.05, 1.05])
    .range([margin.left, w + margin.left]);

  const maxY = Math.max(0.15, d3.max(y_u) || 0.1);
  const minY = Math.min(-0.15, d3.min(y_l) || -0.1);

  const yScale = d3
    .scaleLinear()
    .domain([minY - 0.02, maxY + 0.02])
    .range([h + margin.top, margin.top]);

  const line = d3
    .line<[number, number]>()
    .x(d => xScale(d[0]))
    .y(d => yScale(d[1]))
    .curve(d3.curveCatmullRom);

  // Línea de Cuerda
  svg
    .append('line')
    .attr('x1', xScale(0))
    .attr('y1', yScale(0))
    .attr('x2', xScale(1))
    .attr('y2', yScale(0))
    .attr('stroke', '#16202f')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3');

  // Superficie Superior
  const dataU: [number, number][] = x_u.map((x, i) => [x, y_u[i]]);
  svg
    .append('path')
    .datum(dataU)
    .attr('d', line)
    .attr('stroke', '#60a5fa')
    .attr('stroke-width', 2)
    .attr('fill', 'none');

  // Superficie Inferior
  const dataL: [number, number][] = x_l.map((x, i) => [x, y_l[i]]);
  svg
    .append('path')
    .datum(dataL)
    .attr('d', line)
    .attr('stroke', '#22d3ee')
    .attr('stroke-width', 2)
    .attr('fill', 'none');

  // Relleno transparente
  const fullPoly: [number, number][] = [...dataU, ...dataL.reverse()];
  svg
    .append('path')
    .datum(fullPoly)
    .attr('d', line)
    .attr('fill', 'rgba(96, 165, 250, 0.1)');
}
