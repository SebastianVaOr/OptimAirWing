import React from 'react';
import { Bookmark, RotateCcw, Calendar } from 'lucide-react';
import { Snapshot } from '../core/types';
import { Modal, Button, Badge } from './primitives';

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
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Diseños Guardados (Snapshots)" size="lg">
      <div className="flex flex-col gap-3">
        {snapshots.length === 0 ? (
          <div className="py-12 text-center text-dim flex flex-col items-center gap-2">
            <Bookmark className="w-8 h-8 opacity-40" />
            <p className="text-sm">No hay snapshots guardados en esta sesión.</p>
            <p className="text-xs text-lo">Presione la tecla (G) o el botón Guardar para conservar un estado de diseño.</p>
          </div>
        ) : (
          snapshots.map(snap => (
            <div
              key={snap.id}
              className="bg-panel2 border border-line p-4 rounded-lg flex items-center justify-between hover:border-accent/40 transition"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-hi">{snap.name}</span>
                  <Badge variant="accent">NACA {snap.params.nacaCode}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-lo">
                  <span>Envergadura: <strong>{snap.params.b}m</strong></span>
                  <span>L/D: <strong className="text-accent">{snap.result.LD.toFixed(2)}</strong></span>
                  <span>CL: <strong className="text-ok">{snap.result.CL.toFixed(4)}</strong></span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-dim">
                  <Calendar className="w-3 h-3" />
                  <span>{snap.timestamp}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  onLoadSnapshot(snap);
                  onClose();
                }}
              >
                Cargar
              </Button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
