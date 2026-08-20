import React, { useState } from 'react';
import { Settings, ShieldCheck, Terminal, CreditCard } from 'lucide-react';
import { OrganizationInfo } from '../core/types';
import { updateAdminOrgPlan } from '../api/client';
import { Modal } from './primitives';

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

  const handleUpdatePlan = async (newPlan: 'freemium' | 'professional' | 'enterprise') => {
    setLoading(true);
    setSelectedPlan(newPlan);
    await updateAdminOrgPlan(org.id, newPlan);
    onPlanChange(newPlan);
    setLoading(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Administración y Planes de Suscripción"
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {/* Org Info */}
        <div className="bg-panel2 p-4 rounded-lg border border-line flex items-center justify-between">
          <div>
            <h3 className="font-bold text-hi text-sm">{org.name}</h3>
            <p className="text-xs text-lo">ID: {org.id} • Rol: Owner</p>
          </div>
          <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2.5 py-1 rounded border border-accent/20 uppercase">
            {org.plan}
          </span>
        </div>

        {/* Plan Options */}
        <div>
          <h4 className="text-xs font-bold text-lo mb-3 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-accent" />
            <span>Cambiar Plan de Suscripción (Stripe Mock Integration)</span>
          </h4>

          <div className="grid grid-cols-3 gap-3">
            <div
              onClick={() => handleUpdatePlan('freemium')}
              className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                org.plan === 'freemium' ? 'bg-accent/10 border-accent' : 'bg-panel2 border-line hover:border-line2'
              }`}
            >
              <div>
                <h5 className="font-bold text-sm text-hi">Freemium</h5>
                <p className="text-xs text-lo mt-1">Gratis</p>
                <ul className="text-[11px] text-dim mt-2 space-y-1">
                  <li>• 100 pred/mes</li>
                  <li>• Modelo Empírico</li>
                </ul>
              </div>
            </div>

            <div
              onClick={() => handleUpdatePlan('professional')}
              className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                org.plan === 'professional' ? 'bg-accent/10 border-accent' : 'bg-panel2 border-line hover:border-line2'
              }`}
            >
              <div>
                <h5 className="font-bold text-sm text-hi">Profesional</h5>
                <p className="text-xs text-accent mt-1">$49 / mes</p>
                <ul className="text-[11px] text-dim mt-2 space-y-1">
                  <li>• 5,000 pred/mes</li>
                  <li>• Modelo empírico</li>
                </ul>
              </div>
            </div>

            <div
              onClick={() => handleUpdatePlan('enterprise')}
              className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                org.plan === 'enterprise' ? 'bg-accent/10 border-accent' : 'bg-panel2 border-line hover:border-line2'
              }`}
            >
              <div>
                <h5 className="font-bold text-sm text-hi">Empresa</h5>
                <p className="text-xs text-purple-400 mt-1">Personalizado</p>
                <ul className="text-[11px] text-dim mt-2 space-y-1">
                  <li>• Ilimitado</li>
                  <li>• Integración API</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Admin CLI Section */}
        <div className="bg-ink p-4 rounded-lg border border-line">
          <div className="flex items-center gap-2 text-xs font-bold text-hi mb-2">
            <Terminal className="w-4 h-4 text-accent" />
            <span>Comandos CLI de Administración Disponibles</span>
          </div>
          <pre className="text-[11px] font-mono text-accent/90 leading-relaxed overflow-x-auto">
{`npx tsx manage.ts org list
npx tsx manage.ts org set-plan org_demo professional
npx tsx manage.ts org reset-usage org_demo
npx tsx manage.ts stats predictions`}
          </pre>
        </div>
      </div>
    </Modal>
  );
};
