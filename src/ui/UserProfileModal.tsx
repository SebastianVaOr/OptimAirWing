import React, { useState, useEffect } from 'react';
import { X, User, Lock, History, CreditCard, ExternalLink } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'profile' | 'security' | 'history' | 'billing'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) fetchProfile();
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) setProfile(await res.json());
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { key: 'profile', label: 'Perfil', icon: User },
    { key: 'security', label: 'Seguridad', icon: Lock },
    { key: 'history', label: 'Historial', icon: History },
    { key: 'billing', label: 'Facturación', icon: CreditCard },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-label="Perfil de usuario">
      <div className="bg-panel border border-line rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-panel2">
          <h2 className="text-sm font-bold text-cyan-400">Configuración de Cuenta</h2>
          <button onClick={onClose} className="text-lo hover:text-white transition cursor-pointer" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-line bg-ink">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${tab === t.key ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-lo hover:text-white'}`}>
              <t.icon className="w-3.5 h-3.5" /><span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" role="status" aria-label="Cargando"></div></div>
          ) : tab === 'profile' ? (
            <div className="flex flex-col gap-4">
              <ProfileField label="Organización" value={profile?.orgName} />
              <ProfileField label="Email" value={profile?.email} />
              <ProfileField label="Plan" value={profile?.plan} />
              <ProfileField label="Créditos disponibles" value={profile?.credits?.optimizations_remaining} />
            </div>
          ) : tab === 'security' ? (
            <ChangePasswordForm />
          ) : tab === 'history' ? (
            <UsageHistory />
          ) : (
            <BillingSection />
          )}
        </div>
      </div>
    </div>
  );
};

const ProfileField = ({ label, value }: { label: string; value?: string | number }) => (
  <div className="flex justify-between py-2 border-b border-line/60">
    <span className="text-xs text-lo">{label}</span>
    <span className="text-xs text-white font-medium">{value ?? '-'}</span>
  </div>
);

const ChangePasswordForm = () => {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      if (res.ok) { setMsg('Contraseña actualizada'); setCurrent(''); setNewPass(''); }
      else { const d = await res.json(); setError(d.message || 'Error'); }
    } catch { setError('Error de conexión'); }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {msg && <div className="p-2 bg-emerald-500/20 text-emerald-300 text-xs rounded">{msg}</div>}
      {error && <div className="p-2 bg-rose-500/20 text-rose-300 text-xs rounded">{error}</div>}
      <input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Contraseña actual" required className="w-full bg-panel2 border border-line rounded px-3 py-2 text-xs text-white" />
      <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Nueva contraseña (mín. 8 caracteres)" required minLength={8} className="w-full bg-panel2 border border-line rounded px-3 py-2 text-xs text-white" />
      <button type="submit" className="py-2 rounded-lg bg-cyan-500 text-ink font-bold text-xs cursor-pointer hover:brightness-110">Actualizar Contraseña</button>
    </form>
  );
};

const UsageHistory = () => {
  const [history, setHistory] = useState<any>(null);
  React.useEffect(() => {
    fetch('/api/user/usage-history').then(r => r.ok && r.json()).then(setHistory);
  }, []);

  if (!history) return <div className="text-xs text-dim py-4 text-center">Cargando historial...</div>;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-panel2 p-3 rounded-lg border border-line">
          <div className="text-[10px] text-dim">Predicciones</div>
          <div className="text-lg font-bold text-cyan-300">{history.predictions_used}</div>
        </div>
        <div className="bg-panel2 p-3 rounded-lg border border-line">
          <div className="text-[10px] text-dim">Optimizaciones</div>
          <div className="text-lg font-bold text-purple-300">{history.optimizations_used}</div>
        </div>
      </div>
      {history.audit_logs?.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] text-dim font-bold uppercase mb-2">Actividad Reciente</div>
          {history.audit_logs.slice(0, 5).map((log: any, i: number) => (
            <div key={i} className="text-[11px] text-lo py-1 border-b border-line/40 flex justify-between">
              <span>Plan: {log.old_plan || 'N/A'} → {log.new_plan}</span>
              <span className="text-dim">{new Date(log.timestamp).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BillingSection = () => {
  const handlePortal = async () => {
    const res = await fetch('/api/stripe/billing-portal', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    }
  };

  return (
    <div className="flex flex-col gap-4 text-xs text-lo">
      <p>Gestiona tu suscripción, facturas y método de pago desde el portal de Stripe.</p>
      <button onClick={handlePortal} className="py-2 px-4 rounded-lg bg-cyan-500 text-ink font-bold text-xs cursor-pointer hover:brightness-110 flex items-center gap-2 w-fit">
        <ExternalLink className="w-3.5 h-3.5" /> Ir al Portal de Facturación
      </button>
    </div>
  );
};
