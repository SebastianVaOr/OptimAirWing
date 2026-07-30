export const PARAM_TOOLTIPS: Record<string, string> = {
  nacaCode: 'Código NACA de 4 dígitos (ej: 2412). Primer dígito: combadura máxima %c. Segundo: posición combadura/10. Últimos dos: espesor máximo %t.',
  alpha: 'Ángulo de ataque en grados. Rango típico: -5° a 15°. Ángulos > 12° pueden entrar en pérdida (stall).',
  chordRoot: 'Cuerda en la raíz del ala (Cr). Afecta directamente el área alar y el alargamiento.',
  chordTip: 'Cuerda en la punta del ala (Ct). Relación de conicidad λ = Ct/Cr.',
  span: 'Envergadura total del ala (b). Determina el alargamiento AR = b²/S.',
  sweepAngle: 'Ángulo de flecha del ala en grados. Reduce la resistencia supersónica pero aumenta el momento flector.',
  twist: 'Ángulo de torsión geométrica (washout) en grados. Valores negativos reducen el ángulo de ataque en punta, mejorando pérdida suave.',
  factorOswald: 'Factor de eficiencia de Oswald (e). Ideal: 1.0. Típico: 0.7-0.85 para alas rectas, 0.85-0.95 para alas elípticas.',
  reynolds: 'Número de Reynolds basado en la cuerda media aerodinámica. Afecta la transición laminar-turbulenta y los coeficientes aerodinámicos.',
  mach: 'Número de Mach de vuelo. Efectos compresibles significativos > 0.3. No usar > 0.8 sin modelo de arrastre de onda.',
};
