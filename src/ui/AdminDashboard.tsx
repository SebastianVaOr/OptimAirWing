import React, { useState, useEffect } from 'react';
import { X, Users, Building2, CreditCard, Activity, Download, RotateCcw } from 'lucide-react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-label="Panel de administración">
      <div className="bg-[#0a0f18] border border-[#16202f] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#16202f] bg-[#0e1624]">
          <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2"><Activity className="w-4 h-4" /> Panel de Administración</h2>
          <button onClick={onClose} className="text-[#8ea3bd] hover:text-white transition cursor-pointer" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>

        {restoreMsg && <div className="mx-5 mt-3 p-2 bg-emerald-500/20 text-emerald-300 text-xs rounded">{restoreMsg}</div>}

        <div className="p-5 overflow-y-auto flex flex-col gap-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0e1624] p-3 rounded-lg border border-[#16202f]">
              <div className="flex items-center gap-2 text-cyan-400"><Building2 className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Organizaciones</span></div>
              <div className="text-2xl font-bold text-white mt-1">{orgs.length}</div>
            </div>
            <div className="bg-[#0e1624] p-3 rounded-lg border border-[#16202f]">
              <div className="flex items-center gap-2 text-emerald-400"><CreditCard className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Planes Activos</span></div>
              <div className="text-2xl font-bold text-white mt-1">{orgs.filter((o: any) => o.plan !== 'freemium').length}</div>
            </div>
            <div className="bg-[#0e1624] p-3 rounded-lg border border-[#16202f]">
              <div className="flex items-center gap-2 text-purple-400"><Users className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Backups</span></div>
              <div className="text-2xl font-bold text-white mt-1">{backupList.length}</div>
            </div>
          </div>

          {/* Organizations Table */}
          <div>
            <h3 className="text-xs font-bold text-[#8ea3bd] uppercase mb-2">Organizaciones</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" role="table">
                <thead>
                  <tr className="text-[#5b6f8c] border-b border-[#16202f]">
                    <th className="text-left py-2 px-2">ID</th>
                    <th className="text-left py-2 px-2">Email</th>
                    <th className="text-left py-2 px-2">Plan</th>
                    <th className="text-right py-2 px-2">Predicciones</th>
                    <th className="text-right py-2 px-2">Optimizaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-4 text-[#5b6f8c]">Cargando...</td></tr>
                  ) : orgs.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-[#5b6f8c]">Sin datos</td></tr>
                  ) : orgs.map((org: any) => (
                    <tr key={org.id} className="border-b border-[#16202f]/40 hover:bg-[#0e1624]/50">
                      <td className="py-2 px-2 text-white font-mono">{org.id}</td>
                      <td className="py-2 px-2 text-[#8ea3bd]">{org.owner_email}</td>
                      <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${org.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300' : org.plan === 'professional' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[#16202f] text-[#8ea3bd]'}`}>{org.plan}</span></td>
                      <td className="py-2 px-2 text-right text-white">{org.predictions_used_month}</td>
                      <td className="py-2 px-2 text-right text-white">{org.optimizations_used_month}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Backups */}
          <div>
            <h3 className="text-xs font-bold text-[#8ea3bd] uppercase mb-2 flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Backups</h3>
            {backupList.length === 0 ? (
              <p className="text-xs text-[#5b6f8c]">No hay backups disponibles</p>
            ) : (
              <div className="flex flex-col gap-1">
                {backupList.slice(0, 5).map((b: any) => (
                  <div key={b.name} className="flex items-center justify-between py-1.5 px-2 bg-[#0e1624] rounded border border-[#16202f]">
                    <div>
                      <span className="text-[11px] text-white font-mono">{b.name}</span>
                      <span className="text-[10px] text-[#5b6f8c] ml-2">({(b.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button onClick={() => handleRestore(b.name)} className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={async () => { const r = await fetch('/admin/backups/create', { method: 'POST' }); if (r.ok) fetchBackups(); }}
              className="mt-2 py-1.5 px-3 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold cursor-pointer hover:bg-cyan-500/20">
              Crear Backup Manual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
