import React, { useState } from 'react';
import { X, Zap, CheckCircle2, ShoppingBag, ShieldCheck } from 'lucide-react';
import { store } from '../core/store';

interface CreditsPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsPurchaseModal: React.FC<CreditsPurchaseModalProps> = ({ isOpen, onClose }) => {
  const [buyingPack, setBuyingPack] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuy = async (packSize: number) => {
    setBuyingPack(packSize);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/user/credits/buy-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_size: packSize })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.credits) {
          store.updateOrgCredits(data.credits);
        }
        setSuccessMsg(`¡Éxito! Se han acreditado ${packSize} créditos adicionales a su cuenta.`);
        setTimeout(() => { setSuccessMsg(null); onClose(); }, 1800);
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Error al procesar la compra');
      }
    } catch (e) {
      setErrorMsg('Error al procesar la compra. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setBuyingPack(null);
    }
  };

  const packs = [
    { size: 10, price: 50, pricePerCredit: '5,00 € / crédito', badge: 'Básico', highlight: false, desc: 'Ideal para proyectos puntuales o pruebas de diseño' },
    { size: 25, price: 100, pricePerCredit: '4,00 € / crédito', badge: 'Popular (Ahorro 20%)', highlight: true, desc: 'Recomendado para optimizaciones multiobjetivo con Mínimo Peso' },
    { size: 50, price: 180, pricePerCredit: '3,60 € / crédito', badge: 'Empresarial (Ahorro 28%)', highlight: false, desc: 'Para flujos de trabajo intensivos y simulaciones completas' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a111c] border border-[#1e2d42] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d42] bg-[#0d1520]">
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold">
            <Zap className="w-5 h-5 fill-current text-cyan-400" />
            <span>Paquetes de Créditos de Optimización OptimAirWing</span>
          </div>
          <button onClick={onClose} className="text-[#9aaec9] hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-300 text-xs font-semibold">{errorMsg}</div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="text-xs text-[#9aaec9] leading-relaxed">
            Los créditos permiten ejecutar optimizaciones avanzadas con el Algoritmo Genético, análisis aeroelásticos y evaluación de costes de fabricación.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packs.map(pack => (
              <div key={pack.size}
                className={`p-4 rounded-xl border flex flex-col justify-between transition relative ${pack.highlight ? 'bg-gradient-to-b from-[#0d1f33] to-[#0a1424] border-cyan-400 shadow-lg shadow-cyan-500/10' : 'bg-[#070b12] border-[#1e2d42]'}`}>
                {pack.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-400 text-[#070b12] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">{pack.badge}</span>
                )}
                <div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-white">{pack.size} Créditos</span>
                    {!pack.highlight && <span className="text-[10px] text-[#5a7390] bg-[#101a29] px-2 py-0.5 rounded border border-[#1e2d42]">{pack.badge}</span>}
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-extrabold text-cyan-300">{pack.price} €</span>
                    <span className="text-[11px] text-[#5a7390] block mt-0.5">{pack.pricePerCredit}</span>
                  </div>
                  <p className="text-[11px] text-[#889cb5] mt-3 leading-normal">{pack.desc}</p>
                </div>
                <button onClick={() => handleBuy(pack.size)} disabled={buyingPack !== null}
                  className={`w-full mt-5 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${pack.highlight ? 'bg-cyan-400 hover:bg-cyan-300 text-[#070b12]' : 'bg-[#132030] hover:bg-[#1a2b40] text-cyan-300 border border-[#1e2d42]'}`}>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{buyingPack === pack.size ? 'Procesando...' : 'Comprar Paquete'}</span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 text-[11px] text-[#5a7390]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pago seguro garantizado. Los créditos adicionales no caducan y se suman a su saldo disponible.</span>
          </div>
        </div>
      </div>
    </div>
  );
};