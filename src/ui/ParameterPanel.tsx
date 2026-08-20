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

const groupCard = 'bg-panel2 p-3 rounded-lg border border-line flex flex-col gap-1.5';
const groupLabel = 'text-lo text-xs font-medium';

export const ParameterPanel: React.FC<ParameterPanelProps> = ({ params, onChange }) => {
  const { t } = useTranslation();
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const [nacaInput, setNacaInput] = useState(params.nacaCode);
  const [isValidNaca, setIsValidNaca] = useState(true);
  const [isExpertUnlocked, setIsExpertUnlocked] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

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

  const activeSectorKey = currentVehicle === 'f1_motorsport'
    ? 'f1_rear_wing'
    : currentVehicle === 'hydrofoil_nautical'
    ? 'hydrofoil_racing'
    : 'uav';

  const sectorLimits = getSectorLimits(activeSectorKey);

  const minB = isExpertUnlocked ? 0.5 : sectorLimits.b.min;
  const maxB = isExpertUnlocked ? 35.0 : sectorLimits.b.max;
  const minCr = isExpertUnlocked ? 0.1 : sectorLimits.Cr.min;
  const maxCr = isExpertUnlocked ? 6.0 : sectorLimits.Cr.max;
  const minCt = isExpertUnlocked ? 0.05 : sectorLimits.Ct.min;
  const maxCt = isExpertUnlocked ? 4.0 : sectorLimits.Ct.max;

  const handleCrChange = (val: number) => {
    let newCr = Math.max(minCr, Math.min(maxCr, val));
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
        {
          const cr = 0.46, ct = 0.38;
          const meanChord = (cr + ct) / 2;
          const gapOpt = Math.round(0.015 * 0.25 * meanChord * 1000);
          const overlapOpt = Math.round(0.01 * 0.25 * meanChord * 1000);
          onChange({ nacaCode: '6412', Cr: cr, Ct: ct, b: 1.05, sweep_deg: 0, twist_deg: -2, alpha_deg: 16, isMultiElement: true, flapAngleDeg: 35, flapGapMm: gapOpt, flapOverlapMm: overlapOpt });
        }
        break;
      case 'hydrofoil_v':
        store.setVehicleCategory('hydrofoil_nautical');
        store.updateHydroParams({ speedKnots: 32, immersionDepthM: 0.65, waterDensityKgM3: 1025 });
        onChange({ nacaCode: '6412', Cr: 0.28, Ct: 0.16, b: 2.2, sweep_deg: 8, twist_deg: -1, alpha_deg: 6 });
        break;
    }
  };

  const vehicleMeta: Record<string, { icon: React.ElementType; label: string }> = {
    aircraft: { icon: Plane, label: 'Aviación' },
    f1_motorsport: { icon: Car, label: 'F1 / Auto' },
    hydrofoil_nautical: { icon: Anchor, label: 'Náutica' },
  };

  return (
    <aside className="w-full lg:w-80 lg:min-w-[320px] bg-panel border-b lg:border-b-0 lg:border-r border-line p-4 flex flex-col gap-4 overflow-y-auto select-none shrink-0 h-full">
      <div className="breadcrumb">
        Mainpage<span className="breadcrumb-sep">/</span>Simulator<span className="breadcrumb-sep">/</span><span className="breadcrumb-active">Parameters</span>
      </div>

      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2 text-accent font-bold text-sm">
          <Sliders className="w-4 h-4" />
          <span className="font-display">Geometría y Dominio</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="micro-paginator">
            <span className={activeSection === 0 ? 'micro-paginator-active' : ''}>|</span>
            {' 01 02 03 '}
            <span className={activeSection === 2 ? 'micro-paginator-active' : ''}>|</span>
          </span>
          <button
            onClick={() => setIsExpertUnlocked(!isExpertUnlocked)}
            className={`chip ${isExpertUnlocked ? 'chip-active' : ''}`}
            title={isExpertUnlocked ? 'Modo Experto: Límites Desbloqueados' : 'Presets con Candado: Guardarraíles Forzados'}
          >
            {isExpertUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span>{isExpertUnlocked ? 'Experto' : 'Candado'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 bg-panel2 p-2 rounded-lg border border-line">
        <label className="hud-label flex items-center justify-between">
          <span>Dominio del Vehículo</span>
          <span className="badge-accent">FASE 1</span>
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
                className={`chip flex-col items-center justify-center p-2 text-xs font-semibold ${active ? 'chip-active' : ''}`}
              >
                <Icon className={`w-4 h-4 mb-1 ${active ? 'text-accent' : 'text-dim'}`} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-panel2 p-1.5 rounded-lg border border-line">
        <span className="hud-label px-1">Presets:</span>
        <button onClick={() => applyPreset('cessna')} className="chip text-[11px]">
          Cessna
        </button>
        <button onClick={() => applyPreset('f1_rear')} className="chip text-[11px]">
          F1 Wing
        </button>
        <button onClick={() => applyPreset('hydrofoil_v')} className="chip text-[11px]">
          Foil T-Bar
        </button>
      </div>

      {currentVehicle === 'f1_motorsport' && (
        <div className="bg-panel2 border border-df1/30 p-3 rounded-lg flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-line pb-1">
            <span className="flex items-center gap-1 hud-label">
              <Zap className="w-3.5 h-3.5 text-df1" />
              <span>Parámetros F1 & Downforce</span>
            </span>
            <span className="badge-bad">F1</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-lo">Velocidad de Pista</span>
            <span className="hud-data text-df1">{appState.f1Params.speedKmh} km/h</span>
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
            <span className="text-lo">Efecto Suelo (Altura h)</span>
            <span className="hud-data text-df1">{appState.f1Params.groundHeightMm} mm</span>
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
            <span className="text-lo">Gurney Flap</span>
            <span className="hud-data text-df1">{appState.f1Params.gurneyFlapMm} mm</span>
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
        <div className="bg-panel2 border border-dhydro/30 p-3 rounded-lg flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-line pb-1">
            <span className="flex items-center gap-1 hud-label">
              <Anchor className="w-3.5 h-3.5 text-dhydro" />
              <span>Parámetros Hydrofoil Náutico</span>
            </span>
            <span className="badge-teal">Hydro</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-lo">Velocidad del Agua</span>
            <span className="hud-data text-teal">{appState.hydroParams.speedKnots} kts (nudos)</span>
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
            <span className="text-lo">Inmersión del Foil</span>
            <span className="hud-data text-teal">{appState.hydroParams.immersionDepthM} m</span>
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

      <div className="flex flex-col gap-3.5">
        <div className="bg-panel2 p-3 rounded-lg border border-line">
          <div className="flex justify-between items-center mb-1.5">
            <label className="hud-label flex items-center gap-1">
              <span>Perfil NACA</span>
              <HelpCircle className="w-3 h-3 text-dim" aria-label="Código de 4 dígitos. Ej: 2412 (2% camber, 40% pos, 12% espesor)" />
            </label>
            {isValidNaca ? (
              <span className="badge-ok"><CheckCircle2 className="w-3 h-3 inline" /> Válido</span>
            ) : (
              <span className="badge-bad"><AlertCircle className="w-3 h-3 inline" /> 4 dígitos</span>
            )}
          </div>
          <input
            type="text"
            value={nacaInput}
            maxLength={5}
            onChange={e => handleNacaChange(e.target.value)}
            className="input font-mono font-bold w-full"
            placeholder="2412"
          />
        </div>

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
              <span className="text-[11px] text-dim">m</span>
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
              <span className="text-[11px] text-dim">m</span>
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
              <span className="text-[11px] text-dim">m</span>
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
              <span className="text-[11px] text-dim">°</span>
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
              <span className="text-[11px] text-dim">°</span>
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
              <span className="text-[11px] text-dim">°</span>
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

      <div className="mt-auto border-t border-line pt-3">
        <div className="hud-label flex items-center gap-1.5 mb-2">
          <Layers className="w-3.5 h-3.5 text-accent" />
          <span>Vista de Sección 2D</span>
        </div>
        <div ref={profileContainerRef} className="instrument-frame w-full h-24 bg-ink rounded border border-line" />
      </div>
    </aside>
  );
};
