import React, { useState } from 'react';
import { X, Lock, CreditCard, ShieldCheck, UserCheck, ArrowRight, Zap, CheckCircle2, Sparkles } from 'lucide-react';
import { updateAdminOrgPlan } from '../api/client';
import { store } from '../core/store';
import { Modal } from './primitives/Modal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: 'freemium' | 'professional' | 'enterprise';
  onLoginSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialPlan = 'professional',
  onLoginSuccess
}) => {
  const [tab, setTab] = useState<'login' | 'checkout'>('checkout');
  const [selectedPlan, setSelectedPlan] = useState<'freemium' | 'professional' | 'enterprise'>(initialPlan);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (selectedPlan === 'freemium') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, orgName }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Error al registrar');
        }
        const data = await res.json();
        store.setOrgPlan('freemium');
        setSuccess(true);
        setTimeout(() => { onLoginSuccess(); onClose(); setSuccess(false); }, 1000);
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, orgName }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Error al registrar');
        }
        const data = await res.json();

        const checkoutRes = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
          body: JSON.stringify({ plan: selectedPlan }),
        });
        if (!checkoutRes.ok) {
          throw new Error('Error al crear sesión de pago');
        }
        const checkoutData = await checkoutRes.json();
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
        } else {
          await updateAdminOrgPlan('org_demo', selectedPlan);
          store.setOrgPlan(selectedPlan);
          setSuccess(true);
          setTimeout(() => { onLoginSuccess(); onClose(); setSuccess(false); }, 1000);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Credenciales inválidas');
      }
      const data = await res.json();
      store.setOrgPlan(data.orgId === 'admin' ? 'enterprise' : 'professional');
      onLoginSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Autenticación" size="md">
        <div className="flex border-b border-line bg-ink -mt-5 -mx-5 px-5 pt-2">
          <button onClick={() => setTab('checkout')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'checkout' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-lo hover:text-white'}`}>
            <CreditCard className="w-3.5 h-3.5" />
            <span>Suscripción a Plan</span>
          </button>
          <button onClick={() => setTab('login')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'login' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-lo hover:text-white'}`}>
            <UserCheck className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
        </div>

        <div className="-mx-5 px-5 pb-5">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-300 text-xs font-semibold">{errorMsg}</div>
          )}
          {success ? (
            <div className="py-10 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              <h3 className="font-bold text-lg text-white">¡Cuenta Creada con Éxito!</h3>
              <p className="text-xs text-lo">Iniciando sesión con el plan <strong className="text-cyan-400 uppercase">{selectedPlan}</strong>...</p>
            </div>
          ) : tab === 'checkout' ? (
            <form onSubmit={handleCheckout} className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 mb-1">
                <div onClick={() => setSelectedPlan('freemium')}
                  className={`p-2.5 rounded-lg border cursor-pointer text-center transition ${selectedPlan === 'freemium' ? 'bg-cyan-500/10 border-cyan-400' : 'bg-panel2 border-line hover:border-line2'}`}>
                  <p className="font-bold text-xs text-white">Freemium</p>
                  <p className="text-[10px] text-lo mt-0.5">Gratis</p>
                </div>
                <div onClick={() => setSelectedPlan('professional')}
                  className={`p-2.5 rounded-lg border cursor-pointer text-center transition ${selectedPlan === 'professional' ? 'bg-cyan-500/10 border-cyan-400' : 'bg-panel2 border-line hover:border-line2'}`}>
                  <p className="font-bold text-xs text-cyan-300">Profesional</p>
                  <p className="text-[10px] text-cyan-400 font-semibold mt-0.5">€49 / mes</p>
                </div>
                <div onClick={() => setSelectedPlan('enterprise')}
                  className={`p-2.5 rounded-lg border cursor-pointer text-center transition ${selectedPlan === 'enterprise' ? 'bg-cyan-500/10 border-cyan-400' : 'bg-panel2 border-line hover:border-line2'}`}>
                  <p className="font-bold text-xs text-purple-300">Empresa</p>
                  <p className="text-[10px] text-purple-400 font-semibold mt-0.5">API Predictiva</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-lo uppercase mb-1">Correo Profesional</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-lo uppercase mb-1">Contraseña (mín. 8 caracteres)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400" />
              </div>
              {selectedPlan !== 'freemium' && (
                <div className="bg-ink p-3 rounded-lg border border-line flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400">
                    <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Pago vía Stripe Checkout</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] text-dim">Serás redirigido a Stripe para completar el pago de forma segura.</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-accent text-ink font-bold text-xs hover:bg-accent2 transition shadow-lg shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer mt-2">
                {loading ? (
                  <span>Procesando...</span>
                ) : (
                  <><Zap className="w-4 h-4 fill-current" /><span>{selectedPlan === 'freemium' ? 'Crear Cuenta Gratis' : `Pagar €${selectedPlan === 'professional' ? '49' : '299'}/mes`}</span></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-lo uppercase mb-1">Correo Electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-lo uppercase mb-1">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-ink font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2">
                <UserCheck className="w-4 h-4" /><span>Acceder al Simulador</span>
              </button>
            </form>
          )}
        </div>
    </Modal>
  );
};