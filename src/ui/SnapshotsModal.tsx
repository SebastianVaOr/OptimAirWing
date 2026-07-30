import React from 'react';
import { X, Bookmark, RotateCcw, Calendar, Cpu } from 'lucide-react';
import { Snapshot } from '../core/types';

interface SnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onLoadSnapshot: (snapshot: Snapshot) => void;
}

export const SnapshotsModal: React.FC<SnapshotsModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onLoadSnapshot
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a111c] border border-[#1e2d42] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d42] bg-[#0d1520]">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <Bookmark className="w-5 h-5" />
            <span>Diseños Guardados (Snapshots)</span>
          </div>
          <button onClick={onClose} className="text-[#9aaec9] hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-3">
          {snapshots.length === 0 ? (
            <div className="py-12 text-center text-[#5a7390] flex flex-col items-center gap-2">
              <Bookmark className="w-8 h-8 opacity-40" />
              <p className="text-sm">No hay snapshots guardados en esta sesión.</p>
              <p className="text-xs text-[#9aaec9]">Presione la tecla (G) o el botón Guardar para conservar un estado de diseño.</p>
            </div>
          ) : (
            snapshots.map(snap => (
              <div
                key={snap.id}
                className="bg-[#0d1520] border border-[#1e2d42] p-4 rounded-lg flex items-center justify-between hover:border-cyan-500/40 transition"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#e8edf4]">{snap.name}</span>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      NACA {snap.params.nacaCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#9aaec9]">
                    <span>Envergadura: <strong>{snap.params.b}m</strong></span>
                    <span>L/D: <strong className="text-cyan-300">{snap.result.LD.toFixed(2)}</strong></span>
                    <span>CL: <strong className="text-emerald-400">{snap.result.CL.toFixed(4)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#5a7390]">
                    <Calendar className="w-3 h-3" />
                    <span>{snap.timestamp}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLoadSnapshot(snap);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cargar</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
