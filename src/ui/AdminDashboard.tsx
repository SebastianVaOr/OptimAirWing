import React, { useState, useEffect } from 'react';
import { Users, Building2, CreditCard, Activity, Download, RotateCcw } from 'lucide-react';
import { Modal, Badge } from './primitives';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupList, setBackupList] = useState<any[]>([]);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) { fetchOrgs(); fetchBackups(); }
  }, [isOpen]);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/admin/usage');
      if (res.ok) { const d = await res.json(); setOrgs(d.organizations || []); }
    } finally { setLoading(false); }
  };

  const fetchBackups = async () => {
    const res = await fetch('/admin/backups');
    if (res.ok) { const d = await res.json(); setBackupList(d.backups || []); }
  };

  const handleRestore = async (name: string) => {
    if (!confirm(`¿Restaurar backup ${name}?`)) return;
    const res = await fetch('/admin/backups/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setRestoreMsg(data.message || (res.ok ? 'Restaurado' : 'Error'));
    setTimeout(() => setRestoreMsg(null), 3000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Panel de Administración"
      size="xl"
    >
      <div className="flex flex-col gap-6">
        {restoreMsg && <div className="p-2 bg-ok/20 text-ok text-xs rounded">{restoreMsg}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-panel2 p-3 rounded-lg border border-line">
            <div className="flex items-center gap-2 text-accent"><Building2 className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Organizaciones</span></div>
            <div className="text-2xl font-bold text-hi mt-1">{orgs.length}</div>
          </div>
          <div className="bg-panel2 p-3 rounded-lg border border-line">
            <div className="flex items-center gap-2 text-ok"><CreditCard className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Planes Activos</span></div>
            <div className="text-2xl font-bold text-hi mt-1">{orgs.filter((o: any) => o.plan !== 'freemium').length}</div>
          </div>
          <div className="bg-panel2 p-3 rounded-lg border border-line">
            <div className="flex items-center gap-2 text-purple-400"><Users className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Backups</span></div>
            <div className="text-2xl font-bold text-hi mt-1">{backupList.length}</div>
          </div>
        </div>

        {/* Organizations Table */}
        <div>
          <h3 className="text-xs font-bold text-lo uppercase mb-2">Organizaciones</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="text-dim border-b border-line">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Plan</th>
                  <th className="text-right py-2 px-2">Predicciones</th>
                  <th className="text-right py-2 px-2">Optimizaciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-4 text-dim">Cargando...</td></tr>
                ) : orgs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4 text-dim">Sin datos</td></tr>
                ) : orgs.map((org: any) => (
                  <tr key={org.id} className="border-b border-line/40 hover:bg-panel2/50">
                    <td className="py-2 px-2 text-hi font-mono">{org.id}</td>
                    <td className="py-2 px-2 text-lo">{org.owner_email}</td>
                    <td className="py-2 px-2">
                      <Badge variant={org.plan === 'enterprise' ? 'accent' : org.plan === 'professional' ? 'ok' : 'default'}>
                        {org.plan}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right text-hi">{org.predictions_used_month}</td>
                    <td className="py-2 px-2 text-right text-hi">{org.optimizations_used_month}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Backups */}
        <div>
          <h3 className="text-xs font-bold text-lo uppercase mb-2 flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Backups</h3>
          {backupList.length === 0 ? (
            <p className="text-xs text-dim">No hay backups disponibles</p>
          ) : (
            <div className="flex flex-col gap-1">
              {backupList.slice(0, 5).map((b: any) => (
                <div key={b.name} className="flex items-center justify-between py-1.5 px-2 bg-panel2 rounded border border-line">
                  <div>
                    <span className="text-[11px] text-hi font-mono">{b.name}</span>
                    <span className="text-[10px] text-dim ml-2">({(b.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button onClick={() => handleRestore(b.name)} className="text-[10px] text-accent hover:text-accent2 cursor-pointer flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={async () => { const r = await fetch('/admin/backups/create', { method: 'POST' }); if (r.ok) fetchBackups(); }}
            className="mt-2 py-1.5 px-3 rounded bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold cursor-pointer hover:bg-accent/20">
            Crear Backup Manual
          </button>
        </div>
      </div>
    </Modal>
  );
};
