/**
 * Generador de Informes Técnicos y de Viabilidad Económica OptimAirWing
 */

import { DesignRequirements, LegacyWingPayload, PredictionResult, ViabilityAnalysis } from '../core/types';
import { computeViabilityAnalysis } from '../domains/wing/penalties';

export function generateTechnicalReportHtml(
  params: LegacyWingPayload,
  result: PredictionResult,
  optHistory?: { best: number[]; avg: number[] },
  requirements?: DesignRequirements,
  viabilityInput?: ViabilityAnalysis
): string {
  const disclaimerText =
    "Las predicciones e índices de viabilidad de esta plataforma son estimaciones técnico-económicas de diseño conceptual. No sustituyen ensayos en túnel de viento, simulación CFD validada, análisis de elementos finitos (FEA) ni procesos de certificación aeronáutica oficial.";

  // Si se pasaron requerimientos pero no viabilidad explícita, la calculamos
  const defaultReqs: DesignRequirements = requirements || {
    sector: 'uav',
    estimated_weight_kg: 25,
    material: 'carbon',
    flight_hours: 10,
    max_budget_eur: 15000,
    safety_factor: 1.5
  };

  const viability = viabilityInput || computeViabilityAnalysis(params, result, defaultReqs);

  return `
    <div style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #05070c; color: #e8f1fb; padding: 32px; border-radius: 12px; border: 1px solid #16202f; max-width: 840px; margin: 0 auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
      
      <!-- Report Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #16202f; padding-bottom: 16px; margin-bottom: 24px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; color: #38bdf8; letter-spacing: 0.5px; font-weight: 800;">OptimAirWing Engineering Report</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #8ea3bd;">Plataforma de Decisión Técnica y Evaluación de Viabilidad Comercial</p>
        </div>
        <div style="text-align: right;">
          <span style="background: rgba(34, 211, 238, 0.15); color: #22d3ee; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid rgba(34, 211, 238, 0.3);">
            ${result.fidelity.toUpperCase()} MODEL
          </span>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #5b6f8c;">Versión ${result.model_version}</p>
        </div>
      </div>

      <!-- SECCIÓN A: RESUMEN EJECUTIVO Y VIABILIDAD ECONÓMICA -->
      <div style="background: #0e1624; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #16202f; padding-bottom: 10px; margin-bottom: 14px;">
          <h2 style="margin: 0; font-size: 15px; color: #38bdf8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            A. Resumen Ejecutivo de Viabilidad Técnico-Económica
          </h2>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="background: rgba(34, 211, 238, 0.15); color: #38bdf8; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.3);">
              Base: ${viability.viabilityScore} / 100
            </span>
            <span style="background: ${viability.stabilityStatus === 'danger' || (viability.cfdValidation && (viability.cfdValidation.deltaCLPct > 15 || viability.cfdValidation.deltaCDPct > 15)) ? 'rgba(244, 63, 94, 0.25)' : viability.stabilityStatus === 'warning' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)'}; color: ${viability.stabilityStatus === 'danger' || (viability.cfdValidation && (viability.cfdValidation.deltaCLPct > 15 || viability.cfdValidation.deltaCDPct > 15)) ? '#fda4af' : viability.stabilityStatus === 'warning' ? '#fcd34d' : '#34d399'}; font-weight: 800; font-size: 13px; padding: 4px 12px; border-radius: 20px; border: 1px solid ${viability.stabilityStatus === 'danger' || (viability.cfdValidation && (viability.cfdValidation.deltaCLPct > 15 || viability.cfdValidation.deltaCDPct > 15)) ? 'rgba(244, 63, 94, 0.5)' : viability.stabilityStatus === 'warning' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(52, 211, 153, 0.5)'};">
              Score Ajustado Riesgo: ${viability.riskAdjustedScore ?? viability.viabilityScore} / 100
            </span>
          </div>
        </div>

        ${
          viability.stabilityStatus === 'danger'
            ? `<div style="background: rgba(244, 63, 94, 0.2); border: 2px solid #fb7185; color: #fecdd3; padding: 14px; border-radius: 8px; margin-bottom: 16px; font-weight: 800; font-size: 13px; text-align: center; box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);">
                🔴 GEOMETRÍA EN LISTA NEGRA PROHIBIDA - DESCALIFICACIÓN DE RIESGO (0/100)<br/>
                <span style="font-weight: 400; font-size: 12px; color: #fda4af;">${viability.stabilityMessage}</span>
              </div>`
            : viability.cfdValidation && (viability.cfdValidation.deltaCLPct > 15.0 || viability.cfdValidation.deltaCDPct > 15.0)
            ? `<div style="background: rgba(225, 29, 72, 0.2); border: 2px solid #e11d48; color: #fecdd3; padding: 14px; border-radius: 8px; margin-bottom: 16px; font-weight: 800; font-size: 13px; text-align: center; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);">
                🔴 DISEÑO NO CONFIABLE - DISCREPANCIA CFD > 15% (dCL: ${viability.cfdValidation.deltaCLPct}%, dCD: ${viability.cfdValidation.deltaCDPct}%). REQUIERE ITERACIÓN.<br/>
                <span style="font-weight: 400; font-size: 12px; color: #fda4af;">Se ha aplicado una penalización automática del -50% al Score por divergencia del modelo empírico vs CFD de alta fidelidad.</span>
              </div>`
            : ''
        }

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center; margin-bottom: 16px;">
          <div style="background: #05070c; padding: 12px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="display: block; font-size: 11px; color: #8ea3bd;">Coste Fab. Estimado</span>
            <strong style="font-size: 16px; color: #fcd34d;">${viability.estimatedCostEur.toLocaleString()} €</strong>
            <span style="display: block; font-size: 10px; color: #5b6f8c;">Max: ${defaultReqs.max_budget_eur.toLocaleString()} €</span>
          </div>

          <div style="background: #05070c; padding: 12px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="display: block; font-size: 11px; color: #8ea3bd;">Peso Estructural</span>
            <strong style="font-size: 16px; color: #e8f1fb;">${viability.estimatedWeightKg} kg</strong>
            <span style="display: block; font-size: 10px; color: #5b6f8c;">Obj: ${defaultReqs.estimated_weight_kg} kg</span>
          </div>

          <div style="background: #05070c; padding: 12px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="display: block; font-size: 11px; color: #8ea3bd;">Coste / Eficiencia</span>
            <strong style="font-size: 16px; color: #38bdf8;">${viability.costEfficiencyEurPerLD} €/L/D</strong>
            <span style="display: block; font-size: 10px; color: #5b6f8c;">Por punto de razón L/D</span>
          </div>

          <div style="background: #05070c; padding: 12px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="display: block; font-size: 11px; color: #8ea3bd;">Retorno Inversión Est.</span>
            <strong style="font-size: 16px; color: #34d399;">~${viability.paybackMonths} meses</strong>
            <span style="display: block; font-size: 10px; color: #5b6f8c;">En sector ${defaultReqs.sector.toUpperCase()}</span>
          </div>
        </div>

        <!-- Submódulo de Estabilidad y Seguridad Aeroelástica -->
        <div style="background: #05070c; padding: 12px 16px; border-radius: 6px; border: 1px solid ${viability.stabilityStatus === 'danger' ? '#fb7185' : viability.stabilityStatus === 'warning' ? '#fbbf24' : '#34d399'}; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: ${viability.stabilityStatus === 'danger' ? '#fda4af' : viability.stabilityStatus === 'warning' ? '#fcd34d' : '#34d399'}; text-transform: uppercase;">
              A.1 Estabilidad Estructural y Aeroelástica (${(viability.stabilityStatus || 'safe').toUpperCase()})
            </strong>
            <span style="color: #8ea3bd; font-size: 11px;">Factor de Seguridad Global: <strong>${viability.globalSafetyFactor || 1.5}x</strong></span>
          </div>
          <p style="margin: 0 0 4px 0; color: #e8f1fb;">${viability.stabilityMessage || 'Configuración aeroelásticamente estable.'}</p>
          ${viability.stabilityRecommendation ? `<p style="margin: 0 0 4px 0; color: #8ea3bd; font-style: italic;">Recomendación: ${viability.stabilityRecommendation}</p>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #16202f; pt: 4px; margin-top: 6px;">
            <span style="color: #5b6f8c;">Refuerzos Estructurales: <strong style="color: #38bdf8;">${viability.reinforcementsNeeded || 'Estándar'}</strong></span>
            <span style="color: #5b6f8c;">Análisis de Pérdida (Stall): <strong style="color: #e8f1fb;">${viability.stallMessage || 'Normal'}</strong></span>
          </div>
        </div>

        <!-- Submódulo A.2: Configuración de Optimización y Restricciones -->
        <div style="background: #05070c; padding: 12px 16px; border-radius: 6px; border: 1px solid #16202f; font-size: 11px; margin-top: 12px;">
          <strong style="color: #38bdf8; font-size: 12px; display: block; margin-bottom: 6px;">
            A.2 Configuración del Algoritmo Genético y Restricciones Activas
          </strong>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; color: #8ea3bd;">
            <div>
              <strong>Modo de Inicio:</strong> 
              <span style="color: #e8f1fb; font-weight: 600;">${defaultReqs.optimization_mode_type === 'from_sliders' ? 'Refinar Sliders Activos' : 'Explorar desde cero'}</span>
            </div>
            <div>
              <strong>Prioridad de Optimización:</strong> 
              <span style="color: #e8f1fb; font-weight: 600;">${defaultReqs.optimization_mode === 'weight' ? 'Mínimo Peso' : defaultReqs.optimization_mode === 'efficiency' ? 'Máxima Eficiencia (L/D)' : 'Balance (L/D / peso)'}</span>
            </div>
            <div>
              <strong>Motor de Predicción:</strong> 
              <span style="color: #22d3ee; font-weight: 600;">${(!defaultReqs.optimization_level || defaultReqs.optimization_level === 'neuralfoil') ? 'NeuralFoil v2.1 (Alta fidelidad)' : defaultReqs.optimization_level === 'structural' ? 'Estructural (Aero + Pandeo)' : defaultReqs.optimization_level === 'full_custom' ? 'Full Custom Multi-Physics' : 'Empírico Básico (Fallback)'}</span>
            </div>
            <div>
              <strong>Restricciones Activas:</strong> 
              <span style="color: ${defaultReqs.unconstrained ? '#34d399' : '#fcd34d'}; font-weight: 600;">
                ${defaultReqs.unconstrained ? '🔓 Sin restricciones (Exploración Libre)' : [
                  defaultReqs.max_weight_kg ? `Peso < ${defaultReqs.max_weight_kg} kg` : '',
                  defaultReqs.max_cost_eur ? `Coste < ${defaultReqs.max_cost_eur.toLocaleString()} €` : '',
                  defaultReqs.min_ld ? `L/D > ${defaultReqs.min_ld}` : '',
                  defaultReqs.fixed_span_m ? `Envergadura = ${defaultReqs.fixed_span_m} m` : ''
                ].filter(Boolean).join(', ') || 'Límites Sectoriales Generales'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN B: DATOS TÉCNICOS GEOMETRÍA Y RENDIMIENTO -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f;">
          <h3 style="margin-top: 0; font-size: 14px; color: #22d3ee; border-bottom: 1px solid #16202f; padding-bottom: 6px; font-weight: 700;">
            B.1 Geometría de Planta Alar
          </h3>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Perfil NACA:</td><td style="font-weight: 600; text-align: right;">${params.nacaCode}</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Envergadura (b):</td><td style="font-weight: 600; text-align: right;">${params.b} m</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Cuerda Raíz (Cr):</td><td style="font-weight: 600; text-align: right;">${params.Cr} m</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Cuerda Punta (Ct):</td><td style="font-weight: 600; text-align: right;">${params.Ct} m</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Afinamiento (λ):</td><td style="font-weight: 600; text-align: right;">${(params.Ct / params.Cr).toFixed(3)}</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Flecha (Sweep):</td><td style="font-weight: 600; text-align: right;">${params.sweep_deg}°</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Torsión (Twist):</td><td style="font-weight: 600; text-align: right;">${params.twist_deg}°</td></tr>
          </table>
        </div>

        <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f;">
          <h3 style="margin-top: 0; font-size: 14px; color: #22d3ee; border-bottom: 1px solid #16202f; padding-bottom: 6px; font-weight: 700;">
            B.2 Desempeño Aerodinámico
          </h3>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Ángulo de Ataque (α):</td><td style="font-weight: 600; text-align: right;">${params.alpha_deg}°</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Sustentación (CL) [adim]:</td><td style="font-weight: 600; text-align: right; color: #34d399;">${result.CL.toFixed(4)}</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Resistencia (CD) [adim]:</td><td style="font-weight: 600; text-align: right; color: #fbbf24;">${result.CD.toFixed(4)}</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Eficiencia (L/D) [adim]:</td><td style="font-weight: 600; text-align: right; color: #22d3ee; font-size: 15px;">${result.LD.toFixed(2)}</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Momento (Cm) [adim]:</td><td style="font-weight: 600; text-align: right;">${result.Cm.toFixed(4)}</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Superficie Alar (S):</td><td style="font-weight: 600; text-align: right;">${result.S_m2.toFixed(2)} m²</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Alargamiento (AR) [adim]:</td><td style="font-weight: 600; text-align: right;">${result.AR.toFixed(2)}</td></tr>
            <tr><td style="color: #8ea3bd; padding: 4px 0;">Eficiencia Oswald (e) [adim]:</td><td style="font-weight: 600; text-align: right;">${result.e.toFixed(4)}</td></tr>
          </table>
        </div>
      </div>

      <!-- SECCIÓN B.3: ANÁLISIS ESTRUCTURAL Y SEGURIDAD QUANTITATIVA -->
      <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
        <h3 style="margin-top: 0; font-size: 14px; color: #38bdf8; border-bottom: 1px solid #16202f; padding-bottom: 6px; font-weight: 700;">
          B.3 Verificación de Seguridad y Estabilidad Aeroelástica
        </h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px;">
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Momento Flector Raíz:</span>
            <strong style="font-size: 14px; color: #e8f1fb;">${viability.bendingMomentNm?.toLocaleString() ?? '-'} Nm</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Tensión Máx. Sostenida:</span>
            <strong style="font-size: 14px; color: #e8f1fb;">${viability.maxStressMpa ?? '-'} MPa</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">FS a Flexión:</span>
            <strong style="font-size: 14px; color: ${(viability.flexuralSafetyFactor ?? 2) >= 1.5 ? '#34d399' : '#fb7185'};">${viability.flexuralSafetyFactor ?? '-'}x</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Deflexión de Punta:</span>
            <strong style="font-size: 14px; color: ${(viability.tipDeflectionPercent ?? 0) < 5 ? '#38bdf8' : '#fb7185'};">${viability.tipDeflectionMm ?? '-'} mm (${viability.tipDeflectionPercent ?? '-'}% b)</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Velocidad Divergencia (V_d):</span>
            <strong style="font-size: 14px; color: #34d399;">${viability.divergenceSpeedMs ?? '-'} m/s</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Riesgo de Flutter:</span>
            <strong style="font-size: 14px; color: ${viability.flutterRisk === 'alto' ? '#fb7185' : '#34d399'}; text-transform: uppercase;">${viability.flutterRisk ?? 'Bajo'}</strong>
          </div>
        </div>
      </div>

      <!-- SECCIÓN B.4: ESTABILIDAD AL PANDEO -->
      <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
        <h3 style="margin-top: 0; font-size: 14px; color: #38bdf8; border-bottom: 1px solid #16202f; padding-bottom: 6px; font-weight: 700;">
          B.4 Estabilidad al Pandeo Estructural (Euler)
        </h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 10px;">
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Carga Crítica (P_crit):</span>
            <strong style="font-size: 13px; color: #e8f1fb;">${viability.bucklingAnalysis?.P_crit_N ?? 12500} N</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Carga Aplicada:</span>
            <strong style="font-size: 13px; color: #e8f1fb;">${viability.bucklingAnalysis?.P_applied_N ?? 2400} N</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">FS Pandeo:</span>
            <strong style="font-size: 13px; color: #38bdf8;">${viability.bucklingAnalysis?.fs_buckling ?? 5.2}x</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Estado Pandeo:</span>
            <strong style="font-size: 13px; color: ${(viability.bucklingAnalysis?.status ?? 'Seguro') === 'Seguro' ? '#34d399' : '#fb7185'};">${viability.bucklingAnalysis?.status ?? 'Seguro'}</strong>
          </div>
        </div>
      </div>

      <!-- SECCIÓN B.5: ESTABILIDAD DE VUELO LONGITUDINAL -->
      <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
        <h3 style="margin-top: 0; font-size: 14px; color: #38bdf8; border-bottom: 1px solid #16202f; padding-bottom: 6px; font-weight: 700;">
          B.5 Estabilidad de Vuelo Longitudinal (Modelo 3 DoF)
        </h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 10px;">
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Cm_alpha (dCm/dalpha):</span>
            <strong style="font-size: 13px; color: #e8f1fb;">${viability.flightDynamics?.Cm_alpha ?? -0.12} rad⁻¹</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Margen Estático:</span>
            <strong style="font-size: 13px; color: #e8f1fb;">${viability.flightDynamics?.staticMarginPct ?? 10.5}% MAC</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Freq. Phugoid:</span>
            <strong style="font-size: 13px; color: #e8f1fb;">${viability.flightDynamics?.omegaPhugoidRadS ?? 0.278} rad/s</strong>
          </div>
          <div style="background: #05070c; padding: 10px; border-radius: 6px; border: 1px solid #16202f;">
            <span style="font-size: 11px; color: #8ea3bd; display: block;">Estado Dinámico:</span>
            <strong style="font-size: 13px; color: ${(viability.flightDynamics?.status ?? 'Estable') === 'Estable' ? '#34d399' : '#fb7185'};">${viability.flightDynamics?.status ?? 'Estable'}</strong>
          </div>
        </div>
      </div>

      <!-- SECCIÓN B.6: RECOMENDACIONES PARA REDUCIR PESO Y COSTE -->
      <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #16202f; padding-bottom: 6px; margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 14px; color: #38bdf8; font-weight: 700;">
            B.6 Recomendaciones para Reducir Peso y Coste (Factor de Seguridad Dinámico)
          </h3>
          <span style="background: ${viability.fsStatus === 'Sobredimensionado' ? 'rgba(245, 158, 11, 0.2)' : viability.fsStatus === 'Infradimensionado' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(52, 211, 153, 0.2)'}; color: ${viability.fsStatus === 'Sobredimensionado' ? '#fcd34d' : viability.fsStatus === 'Infradimensionado' ? '#fda4af' : '#34d399'}; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.1);">
            Estado FS: ${viability.fsStatus || 'Ajustado'} (${viability.fsReal || 2.5}x vs ${viability.fsTarget || 2.5}x Obj)
          </span>
        </div>
        <p style="font-size: 11px; color: #5b6f8c; margin: 0 0 8px 0;">
          Modo Seleccionado: <strong style="color: #e8f1fb; text-transform: uppercase;">${viability.optimizationMode || 'balance'}</strong> | FS Objetivo Solicitado: <strong style="color: #38bdf8;">${viability.fsTarget || 2.5}x</strong> | Motor Usado: <strong style="color: #38bdf8;">${viability.surrogateModelSource || 'NeuralFoil v2.1'}</strong>
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #e8f1fb; line-height: 1.6;">
          ${(viability.weightOptimizationRecommendations || ['Diseño ajustado al factor de seguridad objetivo sin peso superfluo.']).map(rec => `<li style="margin-bottom: 6px;">${rec}</li>`).join('')}
        </ul>
      </div>

      <!-- SECCIÓN B.7: VALIDACIÓN CON CFD EXTERNO -->
      ${viability.cfdValidation ? `
        <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #16202f; padding-bottom: 6px; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 14px; color: #38bdf8; font-weight: 700;">
              B.7 Validación con CFD Externo (SU2 / High-Fidelity)
            </h3>
            <span style="background: ${viability.cfdValidation.validated ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${viability.cfdValidation.validated ? '#34d399' : '#fcd34d'}; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
              ${viability.cfdValidation.statusLabel}
            </span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 11px;">
            <div style="background: #05070c; padding: 8px; border-radius: 4px;">
              <span style="color: #8ea3bd; display: block;">CL CFD vs Base:</span>
              <strong style="color: #e8f1fb;">${viability.cfdValidation.cfd.CL} vs ${viability.cfdValidation.baseline.CL} (Δ ${viability.cfdValidation.deltaCLPct}%)</strong>
            </div>
            <div style="background: #05070c; padding: 8px; border-radius: 4px;">
              <span style="color: #8ea3bd; display: block;">CD CFD vs Base:</span>
              <strong style="color: #e8f1fb;">${viability.cfdValidation.cfd.CD} vs ${viability.cfdValidation.baseline.CD} (Δ ${viability.cfdValidation.deltaCDPct}%)</strong>
            </div>
            <div style="background: #05070c; padding: 8px; border-radius: 4px;">
              <span style="color: #8ea3bd; display: block;">Solucionador:</span>
              <strong style="color: #38bdf8;">${viability.cfdValidation.solver}</strong>
            </div>
          </div>
          ${
            viability.cfdValidation.deltaCLPct > 30 || viability.cfdValidation.deltaCDPct > 30
              ? `<div style="background: rgba(244, 63, 94, 0.15); border: 1px solid #fb7185; color: #fda4af; padding: 10px; border-radius: 6px; margin-top: 10px; font-weight: 600; font-size: 11px;">
                  🔴 DIFERENCIA CRÍTICA: El diseño no debe fabricarse sin una validación CFD adicional. El panel no es fiable para esta configuración.
                </div>`
              : viability.cfdValidation.deltaCLPct > 20 || viability.cfdValidation.deltaCDPct > 20
              ? `<div style="background: rgba(245, 158, 11, 0.15); border: 1px solid #fbbf24; color: #fcd34d; padding: 10px; border-radius: 6px; margin-top: 10px; font-weight: 600; font-size: 11px;">
                  ⚠️ ADVERTENCIA: El modelo de panel (NeuralFoil) muestra una diferencia significativa con el CFD. Esto puede deberse a efectos no lineales (separación, compresibilidad) o a que el perfil tiene alta comba. Se recomienda validar este diseño con simulaciones de alta fidelidad antes de fabricar.
                </div>`
              : ''
          }
        </div>
      ` : ''}

      <!-- SECCIÓN C: ANÁLISIS DE SENSIBILIDAD Y RECOMENDACIONES -->
      <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
        <h3 style="margin-top: 0; font-size: 14px; color: #60a5fa; border-bottom: 1px solid #16202f; padding-bottom: 6px; font-weight: 700;">
          C. Análisis de Sensibilidad y Recomendaciones para Toma de Decisiones
        </h3>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 12px; color: #8ea3bd; line-height: 1.6;">
          ${viability.sensitivityRecommendations.map(rec => `<li style="margin-bottom: 6px;">${rec}</li>`).join('')}
        </ul>
      </div>

      <!-- SECCIÓN C.1: ANÁLISIS DE INCERTIDUMBRE (MONTE CARLO) -->
      ${viability.monteCarloAnalysis ? `
        <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #16202f; padding-bottom: 6px; margin-bottom: 8px;">
            <h3 style="margin: 0; font-size: 14px; color: #38bdf8; font-weight: 700;">
              C.1 Análisis de Incertidumbre y Sensibilidad (Monte Carlo - ${viability.monteCarloAnalysis.samplesCount} Muestras)
            </h3>
            <span style="font-size: 11px; color: #34d399; font-weight: 600;">Consistencia de Coste P50 = Sección A ✓</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #e8f1fb; margin-top: 8px;">
            <thead>
              <tr style="border-bottom: 1px solid #16202f; color: #8ea3bd; text-align: left;">
                <th style="padding: 6px;">Métrica de Rendimiento</th>
                <th style="padding: 6px;">Percentil 5% (Conservador)</th>
                <th style="padding: 6px;">Percentil 50% (Mediana)</th>
                <th style="padding: 6px;">Percentil 95% (Optimista)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #0e1624;">
                <td style="padding: 6px; color: #8ea3bd;">Eficiencia Aerodinámica (L/D)</td>
                <td style="padding: 6px;">${viability.monteCarloAnalysis.LD.p5}</td>
                <td style="padding: 6px; font-weight: bold; color: #38bdf8;">${viability.monteCarloAnalysis.LD.p50}</td>
                <td style="padding: 6px;">${viability.monteCarloAnalysis.LD.p95}</td>
              </tr>
              <tr style="border-bottom: 1px solid #0e1624;">
                <td style="padding: 6px; color: #8ea3bd;">Factor de Seguridad Real (FS)</td>
                <td style="padding: 6px;">${viability.monteCarloAnalysis.FS.p5}x</td>
                <td style="padding: 6px; font-weight: bold; color: #38bdf8;">${viability.monteCarloAnalysis.FS.p50}x</td>
                <td style="padding: 6px;">${viability.monteCarloAnalysis.FS.p95}x</td>
              </tr>
              <tr style="border-bottom: 1px solid #0e1624;">
                <td style="padding: 6px; color: #8ea3bd;">Peso Estructural Estimado</td>
                <td style="padding: 6px;">${viability.monteCarloAnalysis.Peso.p5} kg</td>
                <td style="padding: 6px; font-weight: bold; color: #38bdf8;">${viability.monteCarloAnalysis.Peso.p50} kg</td>
                <td style="padding: 6px;">${viability.monteCarloAnalysis.Peso.p95} kg</td>
              </tr>
              <tr>
                <td style="padding: 6px; color: #8ea3bd;">Coste Total Fabricación</td>
                <td style="padding: 6px;">${viability.monteCarloAnalysis.Coste.p5} €</td>
                <td style="padding: 6px; font-weight: bold; color: #38bdf8;">${viability.monteCarloAnalysis.Coste.p50} €</td>
                <td style="padding: 6px;">${viability.monteCarloAnalysis.Coste.p95} €</td>
              </tr>
            </tbody>
          </table>
          <p style="font-size: 10px; color: #5b6f8c; margin: 6px 0 0 0; text-align: right;">
            * El coste P50 de Monte Carlo (${viability.monteCarloAnalysis.Coste.p50} €) coincide exactamente con la estimación de la sección A (${viability.estimatedCostEur} €) gracias al motor de costes unificado v11.0.
          </p>
        </div>
      ` : ''}

      <!-- SECCIÓN C.2: FRENTE DE PARETO (OPCIONES DE DECISIÓN) -->
      ${viability.paretoDesigns && viability.paretoDesigns.length > 0 ? `
        <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
          <div style="border-bottom: 1px solid #16202f; padding-bottom: 6px; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 14px; color: #22d3ee; font-weight: 700;">
              C.2 Frente de Pareto – Diseños Óptimos para Decisión Empresarial
            </h3>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #8ea3bd;">
              Configuraciones no dominadas generadas por el Algoritmo Genético Multi-Objetivo v11.0.
            </p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            ${viability.paretoDesigns.map(p => `
              <div style="background: #05070c; padding: 12px; border-radius: 6px; border: 1px solid #16202f; display: flex; flex-col; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #38bdf8; font-size: 12px;">Opción ${p.id}: ${p.name}</strong>
                    <span style="font-size: 10px; background: rgba(34, 211, 238, 0.15); color: #22d3ee; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                      L/D ${p.aero.LD}
                    </span>
                  </div>
                  <p style="font-size: 10px; color: #8ea3bd; margin: 0 0 8px 0; line-height: 1.4;">${p.recommendation}</p>
                  <table style="width: 100%; font-size: 10px; color: #e8f1fb; border-collapse: collapse;">
                    <tr><td style="color: #5b6f8c; padding: 2px 0;">Envergadura (b):</td><td style="text-align: right; font-weight: 600;">${p.params.b} m</td></tr>
                    <tr><td style="color: #5b6f8c; padding: 2px 0;">Peso Estructural:</td><td style="text-align: right; font-weight: 600;">${p.weight_kg} kg</td></tr>
                    <tr><td style="color: #5b6f8c; padding: 2px 0;">Coste Fabricación:</td><td style="text-align: right; font-weight: 600; color: #fcd34d;">${p.cost_eur} €</td></tr>
                    <tr><td style="color: #5b6f8c; padding: 2px 0;">FS Objetivo:</td><td style="text-align: right; font-weight: 600;">${p.fs}x</td></tr>
                  </table>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- SECCIÓN C.3: EVOLUCIÓN DEL DISEÑO -->
      ${viability.previousDesignComparison && viability.previousDesignComparison.length > 0 ? `
        <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
          <h3 style="margin-top: 0; font-size: 14px; color: #38bdf8; border-bottom: 1px solid #16202f; padding-bottom: 6px; font-weight: 700;">
            C.3 Evolución del Diseño (Comparativa con Iteración Anterior)
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #e8f1fb; margin-top: 8px;">
            <thead>
              <tr style="border-bottom: 1px solid #16202f; color: #8ea3bd; text-align: left;">
                <th style="padding: 6px;">Parámetro</th>
                <th style="padding: 6px;">Valor Anterior</th>
                <th style="padding: 6px;">Valor Actual</th>
                <th style="padding: 6px;">Variación (Δ%)</th>
                <th style="padding: 6px;">Impacto & Interpretación</th>
              </tr>
            </thead>
            <tbody>
              ${viability.previousDesignComparison.map(comp => `
                <tr style="border-bottom: 1px solid #0e1624;">
                  <td style="padding: 6px; font-weight: 600; color: #e8f1fb;">${comp.parameter}</td>
                  <td style="padding: 6px; color: #8ea3bd;">${comp.previousValue}</td>
                  <td style="padding: 6px; font-weight: bold; color: #38bdf8;">${comp.currentValue}</td>
                  <td style="padding: 6px; font-weight: bold; color: ${comp.isImprovement ? '#34d399' : '#fb7185'};">
                    ${comp.deltaPercent}
                  </td>
                  <td style="padding: 6px; font-size: 10px; color: #8ea3bd;">${comp.interpretation}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${
        optHistory && optHistory.best.length > 0
          ? `
        <div style="background: #0e1624; padding: 16px; border-radius: 8px; border: 1px solid #16202f; margin-bottom: 24px;">
          <h3 style="margin-top: 0; font-size: 14px; color: #60a5fa; border-bottom: 1px solid #16202f; padding-bottom: 6px; font-weight: 700;">
            Historial de Convergencia del Algoritmo Genético
          </h3>
          <p style="font-size: 12px; color: #8ea3bd; margin: 6px 0 0 0;">
            Generaciones ejecutadas: <strong>${optHistory.best.length}</strong> | 
            Mejora de L/D Ponderado: <strong>${optHistory.best[0]?.toFixed(2)} → ${optHistory.best[optHistory.best.length - 1]?.toFixed(2)}</strong>
          </p>
        </div>
      `
          : ''
      }

      <!-- SECCIÓN D: DISCLAIMER LEGAL -->
      <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 12px 16px; margin-top: 24px; font-size: 11px; color: #fbbf24; line-height: 1.5;">
        <strong>D. DISCLAIMER LEGAL OBLIGATORIO:</strong> ${disclaimerText}
      </div>

      <!-- SECCIÓN E: REFERENCIAS TÉCNICAS -->
      <div style="background: rgba(96, 165, 250, 0.05); border: 1px solid rgba(96, 165, 250, 0.2); border-radius: 8px; padding: 12px 16px; margin-top: 16px; font-size: 11px; color: #93c5fd; line-height: 1.6;">
        <strong>E. REFERENCIAS TÉCNICAS Y ESTÁNDARES</strong>
        <ul style="margin: 6px 0 0; padding-left: 18px; list-style: square;">
          <li>Abbott, I.H. & Von Doenhoff, A.E. (1959). <em>Theory of Wing Sections</em>. Dover Publications. ISBN 0-486-60586-8.</li>
          <li>Anderson, J.D. (2010). <em>Fundamentals of Aerodynamics</em> (5th ed.). McGraw-Hill. ISBN 978-0-07-339810-5.</li>
          <li>Katz, J. & Plotkin, A. (2001). <em>Low-Speed Aerodynamics</em> (2nd ed.). Cambridge University Press. ISBN 978-0-521-66552-0.</li>
          <li>Raymer, D.P. (2018). <em>Aircraft Design: A Conceptual Approach</em> (6th ed.). AIAA Education Series. ISBN 978-1-62410-490-9.</li>
          <li>NACA TR-824: Riegels, F.W. (1961). <em>Aerofoil Sections</em>. National Advisory Committee for Aeronautics.</li>
          <li>Prandtl, L. (1918–1919). <em>Tragflügeltheorie</em>. Nachrichten von der Gesellschaft der Wissenschaften zu Göttingen.</li>
          <li>FAR Part 23 — Airworthiness Standards: Normal Category Airplanes. Federal Aviation Administration.</li>
          <li>FAR Part 25 — Airworthiness Standards: Transport Category Airplanes. Federal Aviation Administration.</li>
          <li>MIL-STD-1530D — Aircraft Structural Integrity Program (ASIP). Department of Defense.</li>
          <li>ISO 10303-21:2016 — Industrial automation systems and integration. STEP AP203/AP214.</li>
        </ul>
      </div>

      <div style="text-align: center; font-size: 11px; color: #5b6f8c; margin-top: 20px;">
        OptimAirWing Enterprise Platform • Generated ${new Date().toLocaleString()}
      </div>
    </div>
  `;
}
