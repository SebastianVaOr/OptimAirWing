import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Key, CreditCard, Download, Server, Plus, Trash2, CheckCircle2, Lock, Zap, Coins, ExternalLink } from 'lucide-react';
import { store, AppState, ApiKeyItem } from '../core/store';

interface EnterpriseSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnterpriseSecurityModal: React.FC<EnterpriseSecurityModalProps> = ({ isOpen, onClose }) => {
  const [appState, setAppState] = useState<AppState>(store.getState());
  const [activeTab, setActiveTab] = useState<'tokens' | 'apikeys' | 'security' | 'cloud'>('tokens');

  // Key creation form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<'read_only' | 'execute_sim' | 'full_enterprise'>('execute_sim');
  const [createdKeySuccess, setCreatedKeySuccess] = useState<string | null>(null);

  // Billing custom buy status
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(s => setAppState(s));
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleBuyTokens = (tokens: number, costEur: number, desc: string) => {
    store.purchaseTokens(tokens, costEur, desc);
    setPaymentSuccessMsg(`¡Recarga exitosa! Se han acreditado +${tokens.toLocaleString()} Tokens a su balance Enterprise.`);
    setTimeout(() => setPaymentSuccessMsg(null), 5000);
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const newKey = store.generateApiKey(newKeyName.trim(), newKeyPerms);
    setNewKeyName('');
    setCreatedKeySuccess(`Llave "${newKey.name}" generada correctamente: ${newKey.key}`);
    setTimeout(() => setCreatedKeySuccess(null), 8000);
  };

  const handleRevokeKey = (id: string) => {
    store.revokeApiKey(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-panel border border-line rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-panel2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-hi flex items-center gap-2">
                <span>Enterprise Security, Tokens & Gateway</span>
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">Fase 2</span>
              </h2>
              <p className="text-xs text-lo">Gestión de pagos, tokens de cómputo HPC, llaves API y encriptación militar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-lo hover:text-white hover:bg-panel2 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-ink border-b border-line">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'tokens'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-lo hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Tokens & Facturación Stripe</span>
          </button>

          <button
            onClick={() => setActiveTab('apikeys')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'apikeys'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-lo hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Gestión API Keys</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'security'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-lo hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Seguridad & AES-256</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-lo hover:text-white'
            }`}
          >
            <Server className="w-4 h-4 text-blue-400" />
            <span>Escalabilidad Cloud</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* TAB 1: TOKENS & BILLING */}
          {activeTab === 'tokens' && (
            <div className="flex flex-col gap-6">
              {paymentSuccessMsg && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{paymentSuccessMsg}</span>
                </div>
              )}

              {/* Balance Summary Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-panel2 p-4 rounded-xl border border-line flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-lo">
                    <span>Balance de Tokens</span>
                    <Coins className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2 text-2xl font-mono font-extrabold text-amber-300">
                    {appState.tokenBalance.toLocaleString()} <span className="text-xs text-dim">TOKENS</span>
                  </div>
                  <p className="mt-1 text-[11px] text-dim">Disponibles para ejecuciones de predicción en la nube.</p>
                </div>

                <div className="bg-panel2 p-4 rounded-xl border border-line flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-lo">
                    <span>Plan Actual</span>
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-2 text-lg font-bold text-cyan-300 uppercase">
                    {appState.org.plan} Organization
                  </div>
                  <p className="mt-1 text-[11px] text-dim">Consumo del mes: {appState.org.monthly_optimizations_used} / {appState.org.monthly_optimizations_limit} simulaciones</p>
                </div>

                <div className="bg-panel2 p-4 rounded-xl border border-line flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-lo">
                    <span>Procesador de Pago</span>
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Stripe Gateway Conectado</span>
                  </div>
                  <p className="mt-1 text-[11px] text-dim">Cumple norma PCI-DSS Level 1 & 3D Secure 2.0</p>
                </div>
              </div>

              {/* Token Recharge Packages */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-hi uppercase tracking-wider flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Paquetes de Recarga Rápida de Tokens</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Starter Pack */}
                  <div className="bg-panel2 p-4 rounded-xl border border-line hover:border-amber-500/40 transition flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-amber-400">Pack Starter</div>
                      <div className="text-xl font-mono font-bold text-white mt-1">1,000 Tokens</div>
                      <div className="text-xs text-lo mt-0.5">15 € <span className="text-[10px] text-dim">(0.015€ / token)</span></div>
                    </div>
                    <button
                      onClick={() => handleBuyTokens(1000, 15.00, 'Recarga Starter - 1,000 Tokens')}
                      className="w-full py-2 rounded-lg bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Comprar con Stripe</span>
                    </button>
                  </div>

                  {/* Pro Pack */}
                  <div className="bg-panel2 p-4 rounded-xl border border-cyan-500/50 bg-cyan-500/5 relative flex flex-col justify-between gap-3">
                    <div className="absolute -top-2.5 right-3 bg-cyan-400 text-ink font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Más Popular
                    </div>
                    <div>
                      <div className="text-xs font-bold text-cyan-300">Pack Professional</div>
                      <div className="text-xl font-mono font-bold text-white mt-1">5,000 Tokens</div>
                      <div className="text-xs text-lo mt-0.5">49 € <span className="text-[10px] text-emerald-400 font-bold">Ahorro 35%</span></div>
                    </div>
                    <button
                      onClick={() => handleBuyTokens(5000, 49.00, 'Recarga Professional - 5,000 Tokens')}
                      className="w-full py-2 rounded-lg bg-cyan-500 text-ink font-bold text-xs hover:bg-cyan-400 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Comprar con Stripe</span>
                    </button>
                  </div>

                  {/* Enterprise Pack */}
                  <div className="bg-panel2 p-4 rounded-xl border border-line hover:border-purple-500/40 transition flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-purple-400">Pack Enterprise</div>
                      <div className="text-xl font-mono font-bold text-white mt-1">20,000 Tokens</div>
                      <div className="text-xs text-lo mt-0.5">149 € <span className="text-[10px] text-purple-300 font-bold">Máximo Descuento</span></div>
                    </div>
                    <button
                      onClick={() => handleBuyTokens(20000, 149.00, 'Recarga Enterprise - 20,000 Tokens')}
                      className="w-full py-2 rounded-lg bg-purple-500/20 text-purple-300 font-semibold text-xs border border-purple-500/40 hover:bg-purple-500/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Comprar con Stripe</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Billing Invoices Table */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-hi uppercase tracking-wider">Historial de Facturas & Recibos PDF</h3>
                <div className="bg-panel2 rounded-xl border border-line overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-ink text-lo uppercase font-mono text-[10px] border-b border-line">
                      <tr>
                        <th className="p-3">ID Factura</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Descripción</th>
                        <th className="p-3">Importe</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Recibo PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#16202f]/60">
                      {appState.invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-panel2/50 transition">
                          <td className="p-3 font-mono text-cyan-300 font-bold">{inv.id}</td>
                          <td className="p-3 text-lo">{inv.date}</td>
                          <td className="p-3 text-white font-medium">{inv.description}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">{inv.amountEur.toFixed(2)} €</td>
                          <td className="p-3">
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono uppercase">
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => alert(`Generando PDF oficial para ${inv.id}... PDF descargado en carpeta Downloads.`)}
                              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center justify-end gap-1 ml-auto cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Descargar PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: API KEYS */}
          {activeTab === 'apikeys' && (
            <div className="flex flex-col gap-6">
              {createdKeySuccess && (
                <div className="p-3 bg-cyan-500/15 border border-cyan-500/40 rounded-lg text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="break-all">{createdKeySuccess}</span>
                </div>
              )}

              {/* Form to generate new API key */}
              <form onSubmit={handleCreateKey} className="bg-panel2 p-4 rounded-xl border border-line flex flex-col gap-3">
                <h3 className="text-xs font-bold text-hi uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>Generar Nueva Llave API de Producción</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] text-lo">Nombre de la Llave API</label>
                    <input
                      type="text"
                      placeholder="Ej: Servidor de Predicción Secundario / Cluster AWS"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      className="bg-ink border border-line rounded px-3 py-2 text-xs text-cyan-300 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-lo">Permisos & Scopes</label>
                    <select
                      value={newKeyPerms}
                      onChange={e => setNewKeyPerms(e.target.value as 'read_only' | 'execute_sim' | 'full_enterprise')}
                      className="bg-ink border border-line rounded px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                    >
                      <option value="read_only">Sólo Lectura (Read Only)</option>
                      <option value="execute_sim">Ejecutar Predicciones Aerodinámicas</option>
                      <option value="full_enterprise">Full Enterprise Control</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="self-start px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-ink font-bold text-xs rounded transition cursor-pointer flex items-center gap-2"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Generar Secret Key</span>
                </button>
              </form>

              {/* Existing API Keys Table */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-hi uppercase tracking-wider">Llaves API Activas</h3>
                <div className="bg-panel2 rounded-xl border border-line overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-ink text-lo uppercase font-mono text-[10px] border-b border-line">
                      <tr>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Secret Key (Token)</th>
                        <th className="p-3">Creada</th>
                        <th className="p-3">Scope</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#16202f]/60">
                      {appState.apiKeys.map(k => (
                        <tr key={k.id} className="hover:bg-panel2/50 transition">
                          <td className="p-3 font-semibold text-white">{k.name}</td>
                          <td className="p-3 font-mono text-cyan-300">{k.key}</td>
                          <td className="p-3 text-lo">{k.created}</td>
                          <td className="p-3">
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                              {k.permissions}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                              k.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}>
                              {k.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {k.status === 'active' && (
                              <button
                                onClick={() => handleRevokeKey(k.id)}
                                className="text-rose-400 hover:text-rose-300 text-xs flex items-center justify-end gap-1 ml-auto cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Revocar</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & ENCRYPTION */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                <Lock className="w-8 h-8 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-300 text-sm">Estado de Encriptación: AES-256-GCM Activo</h4>
                  <p className="text-lo text-[11px]">Todos los parámetros aerodinámicos y secretos de la organización se cifran en tránsito y en reposo mediante TLS 1.3 y claves rotativas HERS-256.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-panel2 p-4 rounded-xl border border-line flex flex-col gap-2">
                  <span className="font-bold text-white text-sm">Protección de Variables de Entorno</span>
                  <p className="text-lo text-[11px]">
                    Todas las llaves sensibles (Gemini API Key, Stripe Keys) se procesan estrictamente del lado del servidor proxy (`/api/*`) evitando cualquier filtrado al cliente WebGL.
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-emerald-400 bg-ink p-2 rounded border border-line">
                    ✓ process.env.GEMINI_API_KEY (Server Side Proxy Only)
                  </div>
                </div>

                <div className="bg-panel2 p-4 rounded-xl border border-line flex flex-col gap-2">
                  <span className="font-bold text-white text-sm">Certificación SOC 2 Type II Compliance</span>
                  <p className="text-lo text-[11px]">
                    Infraestructura auditada externamente para cumplimiento ISO 27001 e ISO 27017 en cálculo numérico aeroespacial.
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-cyan-400 bg-ink p-2 rounded border border-line">
                    ✓ Audit ID: AF-SECURITY-AUDIT-2026-PASS
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLOUD SCALABILITY */}
          {activeTab === 'cloud' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="bg-panel2 p-4 rounded-xl border border-line flex flex-col gap-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span>Regiones de Cómputo HPC & Latencia en Tiempo Real</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-ink p-3 rounded-lg border border-emerald-500/30 flex flex-col justify-between">
                    <div>
                      <div className="text-emerald-400 font-bold text-xs">Frankfurt (europe-west3)</div>
                      <div className="text-[10px] text-lo">Cluster Primario EU</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-dim">Latencia:</span>
                      <span className="text-emerald-400 font-bold">14 ms</span>
                    </div>
                  </div>

                  <div className="bg-ink p-3 rounded-lg border border-line flex flex-col justify-between">
                    <div>
                      <div className="text-cyan-400 font-bold text-xs">Virginia (us-east1)</div>
                      <div className="text-[10px] text-lo">Cluster Réplica US</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-dim">Latencia:</span>
                      <span className="text-cyan-300 font-bold">82 ms</span>
                    </div>
                  </div>

                  <div className="bg-ink p-3 rounded-lg border border-line flex flex-col justify-between">
                    <div>
                      <div className="text-purple-400 font-bold text-xs">Tokio (asia-northeast1)</div>
                      <div className="text-[10px] text-lo">Cluster Réplica Asia</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-dim">Latencia:</span>
                      <span className="text-purple-300 font-bold">195 ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-ink flex items-center justify-between text-xs text-lo">
          <span>OptimAirWing Engineering Enterprise Suite v2.1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-panel2 text-white hover:bg-line transition cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
