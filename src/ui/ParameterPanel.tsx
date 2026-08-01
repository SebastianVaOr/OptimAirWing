import React, { useState, useEffect, useRef } from 'react';
import { Sliders, HelpCircle, Layers, CheckCircle2, AlertCircle, Plane, Car, Anchor, Zap, Lock, Unlock } from 'lucide-react';
import { LegacyWingPayload } from '../core/types';
import { renderProfile2D } from '../domains/wing/viewer2d';
import { store, AppState } from '../core/store';
import { getSectorLimits } from '../domains/wing/sectorGuardrails';
import { PARAM_TOOLTIPS } from '../core/tooltips';
import { useTranslation } from 'react-i18next';

interface ParameterPanelProps {
  params: LegacyWingPayload;
  onChange: (updated: Partial<LegacyWingPayload>) => void;
}

const groupCard = 'bg-[#0e1624] p-3 rounded-lg border border-[#16202f] flex flex-col gap-1.5';
const groupLabel = 'text-[#8ea3bd] text-xs font-medium';

export const ParameterPanel: React.FC<ParameterPanelProps> = ({ params, onChange }) => {
  const { t } = useTranslation();
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const [nacaInput, setNacaInput] = useState(params.nacaCode);
  const [isValidNaca, setIsValidNaca] = useState(true);
  const [isExpertUnlocked, setIsExpertUnlocked] = useState(false);

  const [appState, setAppState] = useState<AppState>(store.getState());

  useEffect(() => {
    const unsub = store.subscribe(s => setAppState(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    setNacaInput(params.nacaCode);
  }, [params.nacaCode]);

  useEffect(() => {
    if (profileContainerRef.current) {
      renderProfile2D(profileContainerRef.current, params.nacaCode);
    }
  }, [params.nacaCode]);

  const handleNacaChange = (val: string) => {
    setNacaInput(val);
    const valid = /^\d{4}$/.test(val) || /^\d{5}$/.test(val);
    setIsValidNaca(valid);
    if (valid) {
      onChange({ nacaCode: val });
    }
  };

  const currentVehicle = appState.selectedVehicle;

  // Mapeo de sector para límites con candado
  const activeSectorKey = currentVehicle === 'f1_motorsport'
    ? 'f1_rear_wing'
    : currentVehicle === 'hydrofoil_nautical'
    ? 'hydrofoil_racing'
    : 'uav';

  const sectorLimits = getSectorLimits(activeSectorKey);

  // Rangos dinámicos según candado
  const minB = isExpertUnlocked ? 0.5 : sectorLimits.b.min;
  const maxB = isExpertUnlocked ? 35.0 : sectorLimits.b.max;
  const minCr = isExpertUnlocked ? 0.1 : sectorLimits.Cr.min;
  const maxCr = isExpertUnlocked ? 6.0 : sectorLimits.Cr.max;
  const minCt = isExpertUnlocked ? 0.05 : sectorLimits.Ct.min;
  const maxCt = isExpertUnlocked ? 4.0 : sectorLimits.Ct.max;

  const handleCrChange = (val: number) => {
    let newCr = Math.max(minCr, Math.min(maxCr, val));
    // Guardarraíl: b >= 1.5 * Cr
    let newB = params.b;
    if (newB < 1.5 * newCr) {
      newB = Number((1.5 * newCr).toFixed(2));
    }
    onChange({ Cr: newCr, b: newB });
  };

  const handleBChange = (val: number) => {
    let newB = Math.max(minB, Math.min(maxB, val));
    let newCr = params.Cr;
    if (newB < 1.5 * newCr) {
      newCr = Number((newB / 1.5).toFixed(2));
    }
    onChange({ b: newB, Cr: newCr });
  };

  const handleCtChange = (val: number) => {
    let newCt = Math.max(minCt, Math.min(maxCt, val));
    onChange({ Ct: newCt });
  };

  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'cessna':
        store.setVehicleCategory('aircraft');
        onChange({ nacaCode: '2412', Cr: 2.1, Ct: 1.5, b: 11.0, sweep_deg: 0, twist_deg: -2, alpha_deg: 4 });
        break;
      case 'uav_solar':
        store.setVehicleCategory('aircraft');
        onChange({ nacaCode: '4412', Cr: 0.85, Ct: 0.42, b: 16.0, sweep_deg: 2, twist_deg: -3, alpha_deg: 5 });
        break;
      case 'f1_rear':
        store.setVehicleCategory('f1_motorsport');
        store.updateF1Params({ speedKmh: 280, groundHeightMm: 40, gurneyFlapMm: 8, numElements: 2 });
        onChange({ nacaCode: '0012', Cr: 0.42, Ct: 0.35, b: 1.05, sweep_deg: 0, twist_deg: -2, alpha_deg: 12 });
        break;
      case 'f1_monaco':
        store.setVehicleCategory('f1_motorsport');
        store.updateF1Params({ speedKmh: 210, groundHeightMm: 35, gurneyFlapMm: 12, numElements: 3 });
        onChange({ nacaCode: '6412', Cr: 0.46, Ct: 0.38, b: 1.05, sweep_deg: 0, twist_deg: -2, alpha_deg: 16, isMultiElement: true, flapAngleDeg: 35, flapGapMm: 14, flapOverlapMm: 10 });
        break;
      case 'hydrofoil_v':
        store.setVehicleCategory('hydrofoil_nautical');
        store.updateHydroParams({ speedKnots: 32, immersionDepthM: 0.65, waterDensityKgM3: 1025 });
        onChange({ nacaCode: '6412', Cr: 0.28, Ct: 0.16, b: 2.2, sweep_deg: 8, twist_deg: -1, alpha_deg: 6 });
        break;
    }
  };

  const vehicleBtn = (active: boolean, activeTone: string) =>
    `flex flex-col items-center justify-center p-2 rounded text-xs font-semibold border transition cursor-pointer ${
      active ? activeTone : 'bg-[#05070c] text-[#8ea3bd] border-[#16202f] hover:border-[#223048]'
    }`;

  const vehicleMeta: Record<string, { icon: React.ElementType; active: string; iconColor: string }> = {
    aircraft: { icon: Plane, active: 'bg-[#22d3ee]/10 text-[#67e8f9] border-[#22d3ee]/40', iconColor: 'text-[#22d3ee]' },
    f1_motorsport: { icon: Car, active: 'bg-[#f87171]/10 text-[#fda4af] border-[#f87171]/40', iconColor: 'text-[#f87171]' },
    hydrofoil_nautical: { icon: Anchor, active: 'bg-[#60a5fa]/10 text-[#93c5fd] border-[#60a5fa]/40', iconColor: 'text-[#60a5fa]' },
  };

  return (
    <aside className="w-full lg:w-80 lg:min-w-[320px] bg-[#0a0f18] border-b lg:border-b-0 lg:border-r border-[#16202f] p-4 flex flex-col gap-4 overflow-y-auto select-none shrink-0 h-full">
      <div className="flex items-center justify-between border-b border-[#16202f] pb-2">
        <div className="flex items-center gap-2 text-[#22d3ee] font-bold text-sm">
          <Sliders className="w-4 h-4" />
          <span className="font-display">Geometría y Dominio</span>
        </div>
        <button
          onClick={() => setIsExpertUnlocked(!isExpertUnlocked)}
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer border ${
            isExpertUnlocked
              ? 'bg-[#fbbf24]/10 text-[#fde68a] border-[#fbbf24]/40 hover:bg-[#fbbf24]/20'
              : 'bg-[#34d399]/10 text-[#6ee7b7] border-[#34d399]/40 hover:bg-[#34d399]/20'
          }`}
          title={isExpertUnlocked ? 'Modo Experto: Límites Desbloqueados' : 'Presets con Candado: Guardarraíles Forzados'}
        >
          {isExpertUnlocked ? <Unlock className="w-3 h-3 text-[#fbbf24]" /> : <Lock className="w-3 h-3 text-[#34d399]" />}
          <span>{isExpertUnlocked ? 'Modo Experto' : 'Candado Activo'}</span>
        </button>
      </div>

      {/* Selector de Dominio de Vehículo (FASE 1) */}
      <div className="flex flex-col gap-1.5 bg-[#0e1624] p-2 rounded-lg border border-[#16202f]">
        <label className="hud-label flex items-center justify-between">
          <span>Dominio del Vehículo</span>
          <span className="text-[#22d3ee] text-[9px]">FASE 1</span>
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(vehicleMeta) as Array<keyof typeof vehicleMeta>).map(key => {
            const meta = vehicleMeta[key];
            const Icon = meta.icon;
            const active = currentVehicle === key;
            return (
              <button
                key={key}
                onClick={() => {
                  store.setVehicleCategory(key as any);
                  if (key === 'aircraft' && (params.b < 2.0 || params.Cr < 0.6)) {
                    onChange({ nacaCode: '2412', Cr: 2.1, Ct: 1.5, b: 11.0, sweep_deg: 0, twist_deg: -2, alpha_deg: 4 });
                  } else if (key === 'f1_motorsport') {
                    store.updateF1Params({ speedKmh: 280, groundHeightMm: 40, gurneyFlapMm: 8, numElements: 2 });
                    if (params.b > 2.2 || params.Cr > 0.7) {
                      onChange({ nacaCode: '2412', Cr: 0.42, Ct: 0.35, b: 1.05, sweep_deg: 0, twist_deg: -2, alpha_deg: 12 });
                    }
                  } else if (key === 'hydrofoil_nautical') {
                    store.updateHydroParams({ speedKnots: 32, immersionDepthM: 0.65, waterDensityKgM3: 1025 });
                    if (params.b > 3.8 || params.Cr > 0.8) {
                      onChange({ nacaCode: '6412', Cr: 0.28, Ct: 0.16, b: 2.20, sweep_deg: 8, twist_deg: -1, alpha_deg: 6 });
                    }
                  }
                }}
                className={vehicleBtn(active, meta.active)}
              >
                <Icon className={`w-4 h-4 mb-1 ${active ? meta.iconColor : 'text-[#5b6f8c]'}`} />
                <span>{key === 'aircraft' ? 'Aviación' : key === 'f1_motorsport' ? 'F1 / Auto' : 'Náutica'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Presets Rápido */}
      <div className="flex items-center gap-1.5 bg-[#0e1624] p-1.5 rounded-lg border border-[#16202f]">
        <span className="text-[11px] text-[#8ea3bd] font-medium px-1">Presets:</span>
        <button onClick={() => applyPreset('cessna')} className="text-[11px] px-2 py-1 rounded bg-[#0a0f18] text-[#67e8f9] hover:bg-[#22d3ee]/15 transition cursor-pointer">
          Cessna
        </button>
        <button onClick={() => applyPreset('f1_rear')} className="text-[11px] px-2 py-1 rounded bg-[#0a0f18] text-[#fda4af] hover:bg-[#f87171]/15 transition cursor-pointer">
          F1 Wing
        </button>
        <button onClick={() => applyPreset('hydrofoil_v')} className="text-[11px] px-2 py-1 rounded bg-[#0a0f18] text-[#93c5fd] hover:bg-[#60a5fa]/15 transition cursor-pointer">
          Foil T-Bar
        </button>
      </div>

      {/* Controles Específicos por Dominio */}
      {currentVehicle === 'f1_motorsport' && (
        <div className="bg-[#1a0b0b] border border-[#f87171]/30 p-3 rounded-lg flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#f87171] border-b border-[#f87171]/20 pb-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Parámetros F1 & Downforce</span>
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8ea3bd]">Velocidad de Pista</span>
            <span className="text-[#fda4af] font-mono font-bold">{appState.f1Params.speedKmh} km/h</span>
          </div>
          <input
            type="range"
            min={100}
            max={360}
            step={5}
            value={appState.f1Params.speedKmh}
            onChange={e => store.updateF1Params({ speedKmh: parseFloat(e.target.value) })}
            className="ctl-range"
          />

          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8ea3bd]">Efecto Suelo (Altura h)</span>
            <span className="text-[#fda4af] font-mono font-bold">{appState.f1Params.groundHeightMm} mm</span>
          </div>
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={appState.f1Params.groundHeightMm}
            onChange={e => store.updateF1Params({ groundHeightMm: parseFloat(e.target.value) })}
            className="ctl-range"
          />

          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8ea3bd]">Gurney Flap</span>
            <span className="text-[#fda4af] font-mono font-bold">{appState.f1Params.gurneyFlapMm} mm</span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={appState.f1Params.gurneyFlapMm}
            onChange={e => store.updateF1Params({ gurneyFlapMm: parseFloat(e.target.value) })}
            className="ctl-range"
          />
        </div>
      )}

      {currentVehicle === 'hydrofoil_nautical' && (
        <div className="bg-[#0a1828] border border-[#60a5fa]/30 p-3 rounded-lg flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#60a5fa] border-b border-[#60a5fa]/20 pb-1">
            <span className="flex items-center gap-1">
              <Anchor className="w-3.5 h-3.5" />
              <span>Parámetros Hydrofoil Náutico</span>
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8ea3bd]">Velocidad del Agua</span>
            <span className="text-[#93c5fd] font-mono font-bold">{appState.hydroParams.speedKnots} kts (nudos)</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={appState.hydroParams.speedKnots}
            onChange={e => store.updateHydroParams({ speedKnots: parseFloat(e.target.value) })}
            className="ctl-range"
          />

          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8ea3bd]">Inmersión del Foil</span>
            <span className="text-[#93c5fd] font-mono font-bold">{appState.hydroParams.immersionDepthM} m</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={2.0}
            step={0.05}
            value={appState.hydroParams.immersionDepthM}
            onChange={e => store.updateHydroParams({ immersionDepthM: parseFloat(e.target.value) })}
            className="ctl-range"
          />
        </div>
      )}

      {/* Control Groups */}
      <div className="flex flex-col gap-3.5">
        {/* NACA Code */}
        <div className="bg-[#0e1624] p-3 rounded-lg border border-[#16202f]">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs text-[#e8f1fb] font-medium flex items-center gap-1">
              <span>Perfil NACA</span>
              <HelpCircle className="w-3 h-3 text-[#5b6f8c]" aria-label="Código de 4 dígitos. Ej: 2412 (2% camber, 40% pos, 12% espesor)" />
            </label>
            {isValidNaca ? (
              <span className="text-[10px] text-[#34d399] flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Válido</span>
            ) : (
              <span className="text-[10px] text-[#fb7185] flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> 4 dígitos</span>
            )}
          </div>
          <input
            type="text"
            value={nacaInput}
            maxLength={5}
            onChange={e => handleNacaChange(e.target.value)}
            className="ctl-input font-bold"
            placeholder="2412"
          />
        </div>

        {/* Cuerda Raíz Cr */}
        <div className={groupCard}>
          <div className="flex justify-between items-center text-xs">
            <span className={groupLabel}>Cuerda raíz (Cr)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.05"
                min={minCr}
                max={maxCr}
                value={params.Cr}
                onChange={e => handleCrChange(parseFloat(e.target.value) || minCr)}
                className="ctl-number"
              />
              <span className="text-[11px] text-[#5b6f8c]">m</span>
            </div>
          </div>
          <input
            type="range"
            min={minCr}
            max={maxCr}
            step={0.05}
            value={params.Cr}
            onChange={e => handleCrChange(parseFloat(e.target.value) || minCr)}
            className="ctl-range"
          />
        </div>

        {/* Cuerda Punta Ct */}
        <div className={groupCard}>
          <div className="flex justify-between items-center text-xs">
            <span className={groupLabel}>Cuerda punta (Ct)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.05"
                min={minCt}
                max={maxCt}
                value={params.Ct}
                onChange={e => handleCtChange(parseFloat(e.target.value) || minCt)}
                className="ctl-number"
              />
              <span className="text-[11px] text-[#5b6f8c]">m</span>
            </div>
          </div>
          <input
            type="range"
            min={minCt}
            max={maxCt}
            step={0.05}
            value={params.Ct}
            onChange={e => handleCtChange(parseFloat(e.target.value) || minCt)}
            className="ctl-range"
          />
        </div>

        {/* Envergadura b */}
        <div className={groupCard}>
          <div className="flex justify-between items-center text-xs">
            <span className={groupLabel}>Envergadura (b)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min={minB}
                max={maxB}
                value={params.b}
                onChange={e => handleBChange(parseFloat(e.target.value) || minB)}
                className="ctl-number"
              />
              <span className="text-[11px] text-[#5b6f8c]">m</span>
            </div>
          </div>
          <input
            type="range"
            min={minB}
            max={maxB}
            step={0.1}
            value={params.b}
            onChange={e => handleBChange(parseFloat(e.target.value) || minB)}
            className="ctl-range"
          />
        </div>

        {/* Flecha Sweep */}
        <div className={groupCard}>
          <div className="flex justify-between items-center text-xs">
            <span className={groupLabel}>Flecha (Sweep)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="1"
                min={-30}
                max={50}
                value={params.sweep_deg}
                onChange={e => onChange({ sweep_deg: parseFloat(e.target.value) || 0 })}
                className="ctl-number"
              />
              <span className="text-[11px] text-[#5b6f8c]">°</span>
            </div>
          </div>
          <input
            type="range"
            min={-20}
            max={40}
            step={1}
            value={params.sweep_deg}
            onChange={e => onChange({ sweep_deg: parseFloat(e.target.value) || 0 })}
            className="ctl-range"
          />
        </div>

        {/* Torsión Twist */}
        <div className={groupCard}>
          <div className="flex justify-between items-center text-xs">
            <span className={groupLabel}>Torsión (Twist)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.5}
                min={-15}
                max={15}
                value={params.twist_deg}
                onChange={e => onChange({ twist_deg: parseFloat(e.target.value) || 0 })}
                className="ctl-number"
              />
              <span className="text-[11px] text-[#5b6f8c]">°</span>
            </div>
          </div>
          <input
            type="range"
            min={-8}
            max={8}
            step={0.5}
            value={params.twist_deg}
            onChange={e => onChange({ twist_deg: parseFloat(e.target.value) || 0 })}
            className="ctl-range"
          />
        </div>

        {/* Ángulo de Ataque Alpha */}
        <div className={groupCard}>
          <div className="flex justify-between items-center text-xs">
            <span className={groupLabel} title={PARAM_TOOLTIPS.alpha}>Ángulo de Ataque (α)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                min={-10}
                max={25}
                value={params.alpha_deg}
                onChange={e => onChange({ alpha_deg: parseFloat(e.target.value) || 0 })}
                className="ctl-number"
              />
              <span className="text-[11px] text-[#5b6f8c]">°</span>
            </div>
          </div>
          <input
            type="range"
            min={-5}
            max={20}
            step={0.5}
            value={params.alpha_deg}
            onChange={e => onChange({ alpha_deg: parseFloat(e.target.value) || 0 })}
            className="ctl-range"
          />
        </div>
      </div>

      {/* 2D Airfoil Section */}
      <div className="mt-auto border-t border-[#16202f] pt-3">
        <div className="flex items-center gap-1.5 text-xs text-[#8ea3bd] font-semibold mb-2">
          <Layers className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span>Vista de Sección 2D</span>
        </div>
        <div ref={profileContainerRef} className="w-full h-24 bg-[#05070c] rounded border border-[#16202f]" />
      </div>
    </aside>
  );
};
