import React, { useState } from 'react';
import { X, Settings, ShieldCheck, Terminal, CreditCard, RefreshCw } from 'lucide-react';
import { OrganizationInfo } from '../core/types';
import { updateAdminOrgPlan } from '../api/client';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: OrganizationInfo;
  onPlanChange: (plan: 'freemium' | 'professional' | 'enterprise') => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  org,
  onPlanChange
}) => {
  const [selectedPlan, setSelectedPlan] = useState(org.plan);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpdatePlan = async (newPlan: 'freemium' | 'professional' | 'enterprise') => {
    setLoading(true);
    setSelectedPlan(newPlan);
    await updateAdminOrgPlan(org.id, newPlan);
    onPlanChange(newPlan);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0f18] border border-[#16202f] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#16202f] bg-[#0e1624]">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <Settings className="w-5 h-5" />
            <span>Administración y Planes de Suscripción</span>
          </div>
          <button onClick={onClose} className="text-[#8ea3bd] hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
          {/* Org Info */}
          <div className="bg-[#0e1624] p-4 rounded-lg border border-[#16202f] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#e8f1fb] text-sm">{org.name}</h3>
              <p className="text-xs text-[#8ea3bd]">ID: {org.id} • Rol: Owner</p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20 uppercase">
              {org.plan}
            </span>
          </div>

          {/* Plan Options */}
          <div>
            <h4 className="text-xs font-bold text-[#8ea3bd] mb-3 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span>Cambiar Plan de Suscripción (Stripe Mock Integration)</span>
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div
                onClick={() => handleUpdatePlan('freemium')}
                className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                  org.plan === 'freemium' ? 'bg-cyan-500/10 border-cyan-400' : 'bg-[#0e1624] border-[#16202f] hover:border-[#223048]'
                }`}
              >
                <div>
                  <h5 className="font-bold text-sm text-[#e8f1fb]">Freemium</h5>
                  <p className="text-xs text-[#8ea3bd] mt-1">Gratis</p>
                  <ul className="text-[11px] text-[#5b6f8c] mt-2 space-y-1">
                    <li>• 100 pred/mes</li>
                    <li>• Modelo Empírico</li>
                  </ul>
                </div>
              </div>

              <div
                onClick={() => handleUpdatePlan('professional')}
                className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                  org.plan === 'professional' ? 'bg-cyan-500/10 border-cyan-400' : 'bg-[#0e1624] border-[#16202f] hover:border-[#223048]'
                }`}
              >
                <div>
                  <h5 className="font-bold text-sm text-[#e8f1fb]">Profesional</h5>
                  <p className="text-xs text-cyan-400 mt-1">$49 / mes</p>
                  <ul className="text-[11px] text-[#5b6f8c] mt-2 space-y-1">
                    <li>• 5,000 pred/mes</li>
                    <li>• Modelo empírico</li>
                  </ul>
                </div>
              </div>

              <div
                onClick={() => handleUpdatePlan('enterprise')}
                className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                  org.plan === 'enterprise' ? 'bg-cyan-500/10 border-cyan-400' : 'bg-[#0e1624] border-[#16202f] hover:border-[#223048]'
                }`}
              >
                <div>
                  <h5 className="font-bold text-sm text-[#e8f1fb]">Empresa</h5>
                  <p className="text-xs text-purple-400 mt-1">Personalizado</p>
                  <ul className="text-[11px] text-[#5b6f8c] mt-2 space-y-1">
                    <li>• Ilimitado</li>
                    <li>• Integración API</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Admin CLI Section */}
          <div className="bg-[#05070c] p-4 rounded-lg border border-[#16202f]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#e8f1fb] mb-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Comandos CLI de Administración Disponibles</span>
            </div>
            <pre className="text-[11px] font-mono text-cyan-300/90 leading-relaxed overflow-x-auto">
{`npx tsx manage.ts org list
npx tsx manage.ts org set-plan org_demo professional
npx tsx manage.ts org reset-usage org_demo
npx tsx manage.ts stats predictions`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
