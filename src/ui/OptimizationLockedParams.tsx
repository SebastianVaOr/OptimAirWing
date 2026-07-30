import React from 'react';

interface LockedParamsProps {
  lockB: boolean; setLockB: (v: boolean) => void;
  lockCr: boolean; setLockCr: (v: boolean) => void;
  lockCt: boolean; setLockCt: (v: boolean) => void;
  lockSweep: boolean; setLockSweep: (v: boolean) => void;
  lockTwist: boolean; setLockTwist: (v: boolean) => void;
  lockAlpha: boolean; setLockAlpha: (v: boolean) => void;
  lockNaca: boolean; setLockNaca: (v: boolean) => void;
  valB: number; setValB: (v: number) => void;
  valCr: number; setValCr: (v: number) => void;
  valCt: number; setValCt: (v: number) => void;
  valSweep: number; setValSweep: (v: number) => void;
  valTwist: number; setValTwist: (v: number) => void;
  valAlpha: number; setValAlpha: (v: number) => void;
  valNaca: string; setValNaca: (v: string) => void;
}

const LockBtn = React.memo(function LockBtn({ locked, toggle }: { locked: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} aria-label={locked ? 'Desfijar parámetro' : 'Fijar parámetro'} aria-pressed={locked}
      className={`px-1.5 py-0.5 text-[10px] rounded font-bold transition ${locked ? 'bg-amber-500 text-black' : 'bg-[#182638] text-[#8fa0b5] hover:text-white'}`}>
      {locked ? '🔒 Fijado' : '🔓 Libre'}
    </button>
  );
});

const paramStyle = (locked: boolean) =>
  `p-2 rounded border flex flex-col gap-1 transition ${locked ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#0b121e] border-[#1e2d42]'}`;

const inputStyle = (locked: boolean) =>
  `bg-[#070b12] border border-[#1e2d42] rounded px-2 py-1 text-[#e8edf4] focus:outline-none ${!locked && 'opacity-50'}`;

export const OptimizationLockedParams = React.memo<LockedParamsProps>((p) => (
  <div className="bg-[#090d16] border border-[#1e2d42] rounded-lg p-3.5 mt-2 flex flex-col gap-2.5">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 font-bold text-xs">🔒 Candados de Parámetros Geométricos</span>
        <span className="text-[10px] text-[#5a7390]">Fija parámetros mientras otros varían</span>
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
      <div className={paramStyle(p.lockB)}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-[#c8d6e5]">Envergadura b (m)</span>
          <LockBtn locked={p.lockB} toggle={() => p.setLockB(!p.lockB)} />
        </div>
        <input type="number" step="0.05" disabled={!p.lockB} value={p.valB}
          onChange={e => p.setValB(parseFloat(e.target.value) || 0.1)} className={inputStyle(p.lockB)} />
      </div>
      <div className={paramStyle(p.lockCr)}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-[#c8d6e5]">Cuerda Raíz Cr (m)</span>
          <LockBtn locked={p.lockCr} toggle={() => p.setLockCr(!p.lockCr)} />
        </div>
        <input type="number" step="0.02" disabled={!p.lockCr} value={p.valCr}
          onChange={e => p.setValCr(parseFloat(e.target.value) || 0.05)} className={inputStyle(p.lockCr)} />
      </div>
      <div className={paramStyle(p.lockCt)}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-[#c8d6e5]">Cuerda Punta Ct (m)</span>
          <LockBtn locked={p.lockCt} toggle={() => p.setLockCt(!p.lockCt)} />
        </div>
        <input type="number" step="0.02" disabled={!p.lockCt} value={p.valCt}
          onChange={e => p.setValCt(parseFloat(e.target.value) || 0.05)} className={inputStyle(p.lockCt)} />
      </div>
      <div className={paramStyle(p.lockSweep)}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-[#c8d6e5]">Flecha Λ (º)</span>
          <LockBtn locked={p.lockSweep} toggle={() => p.setLockSweep(!p.lockSweep)} />
        </div>
        <input type="number" step="1" disabled={!p.lockSweep} value={p.valSweep}
          onChange={e => p.setValSweep(parseFloat(e.target.value) || 0)} className={inputStyle(p.lockSweep)} />
      </div>
      <div className={paramStyle(p.lockTwist)}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-[#c8d6e5]">Torsión θ (º)</span>
          <LockBtn locked={p.lockTwist} toggle={() => p.setLockTwist(!p.lockTwist)} />
        </div>
        <input type="number" step="0.5" disabled={!p.lockTwist} value={p.valTwist}
          onChange={e => p.setValTwist(parseFloat(e.target.value) || 0)} className={inputStyle(p.lockTwist)} />
      </div>
      <div className={paramStyle(p.lockAlpha)}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-[#c8d6e5]">Áng. Ataque α (º)</span>
          <LockBtn locked={p.lockAlpha} toggle={() => p.setLockAlpha(!p.lockAlpha)} />
        </div>
        <input type="number" step="0.5" disabled={!p.lockAlpha} value={p.valAlpha}
          onChange={e => p.setValAlpha(parseFloat(e.target.value) || 0)} className={inputStyle(p.lockAlpha)} />
      </div>
      <div className={`${paramStyle(p.lockNaca)} col-span-2`}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-[#c8d6e5]">Perfil NACA</span>
          <LockBtn locked={p.lockNaca} toggle={() => p.setLockNaca(!p.lockNaca)} />
        </div>
        <input type="text" maxLength={4} disabled={!p.lockNaca} value={p.valNaca}
          onChange={e => p.setValNaca(e.target.value)} className={inputStyle(p.lockNaca)} />
      </div>
    </div>
  </div>
));
