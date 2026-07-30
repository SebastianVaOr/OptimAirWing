import React, { useState } from 'react';
import {
  ArrowRight, Check, Menu, X, Zap, BarChart3, Layers,
  FileText, Shield, ChevronDown, Github, Twitter,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { CookieBanner } from './CookieBanner';

interface LandingPageProps {
  onEnterSimulator: () => void;
}

const navLinks = [
  { id: 'features', label: 'Funcionalidades' },
  { id: 'how-it-works', label: 'Cómo funciona' },
  { id: 'pricing', label: 'Precios' },
  { id: 'faq', label: 'FAQ' },
];

const features = [
  {
    icon: Zap,
    title: 'Simulación instantánea',
    desc: 'Predice CL, CD, Cm y L/D en milisegundos usando NeuralFoil. Sin esperas ni clústeres CFD.',
  },
  {
    icon: BarChart3,
    title: 'Optimización genética',
    desc: 'Algoritmo evolutivo con 80 generaciones y 50 individuos. Encuentra la geometría óptima automáticamente.',
  },
  {
    icon: Layers,
    title: 'Visualización 3D interactiva',
    desc: 'Malla alar con mapa de presiones en WebGL. Gira, acerca y analiza cada sección.',
  },
  {
    icon: FileText,
    title: 'Informes técnicos PDF',
    desc: 'Documentación profesional con parámetros, resultados y badges de fidelidad. Lista para certificación.',
  },
  {
    icon: Shield,
    title: 'Análisis estructural',
    desc: 'Factor de seguridad, momento flector, deflexión en punta y riesgo de flameo en cada diseño.',
  },
  {
    icon: ArrowRight,
    title: 'Exportación CAD',
    desc: 'Descarga planos en DXF y STEP para integrar con tu flujo de manufactura.',
  },
];

const plans = [
  {
    name: 'Gratuito',
    price: '0',
    currency: '€',
    period: '/mes',
    desc: 'Para estudiantes y pruebas',
    features: ['3 créditos / mes', 'Modelo empírico', 'Visor 3D básico', 'Exportación PDF'],
    cta: 'Comenzar gratis',
    featured: false,
  },
  {
    name: 'Profesional',
    price: '250',
    currency: '€',
    period: '/mes',
    desc: 'Para ingenieros y consultores',
    features: ['100 créditos / mes', 'Motor NeuralFoil IA', 'Optimización genética', 'PDF sin marca de agua', 'Análisis estructural'],
    cta: 'Suscribirse',
    featured: true,
  },
  {
    name: 'Empresa',
    price: '500',
    currency: '€',
    period: '/mes',
    desc: 'Para equipos y fabricantes',
    features: ['Créditos ilimitados', 'API completa', 'CFD personalizable', 'SLA prioritario', 'Integración directa'],
    cta: 'Contactar',
    featured: false,
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterSimulator }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'freemium' | 'professional' | 'enterprise'>('professional');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-[#f1f5f9] font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0b0f17]/90 backdrop-blur-lg border-b border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center">
                <span className="text-white font-bold text-sm">OW</span>
              </div>
              <span className="font-bold text-base text-white tracking-tight">OptimAirWing</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map(l => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className="text-sm text-[#94a3b8] hover:text-white transition-colors font-medium"
                >
                  {l.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedPlan('professional'); setIsAuthOpen(true); }}
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-[#94a3b8] hover:text-white transition-colors"
              >
                Iniciar sesión
              </button>
              <button
                onClick={onEnterSimulator}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#3b82f6]/20"
              >
                <Zap className="w-4 h-4" />
                Probar simulador
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-[#94a3b8] hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1e293b] px-4 py-4 space-y-3 bg-[#111827]">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full text-left text-sm text-[#94a3b8] hover:text-white py-1">{l.label}</button>
            ))}
            <button onClick={() => { setMobileMenuOpen(false); setSelectedPlan('professional'); setIsAuthOpen(true); }} className="block w-full text-left text-sm text-[#94a3b8] hover:text-white py-1">Iniciar sesión</button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#3b82f6]/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-xs font-semibold mb-6">
              <Zap className="w-3 h-3" />
              Diseño alar con inteligencia artificial
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Diseña alas optimizadas{' '}
              <span className="bg-gradient-to-r from-[#3b82f6] to-[#6366f1] bg-clip-text text-transparent">en segundos</span>
            </h1>
            <p className="mt-5 text-lg text-[#94a3b8] leading-relaxed max-w-2xl mx-auto">
              OptimAirWing combina simulación aerodinámica por IA con optimización genética para que
              ingenieros y diseñadores creen alas más eficientes sin esperar horas de CFD.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onEnterSimulator}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold transition-colors shadow-lg shadow-[#3b82f6]/25"
              >
                Probar simulador gratis <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTo('how-it-works')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#334155] hover:border-[#3b82f6]/50 text-[#94a3b8] hover:text-white font-semibold transition-colors"
              >
                Cómo funciona <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[#1e293b] bg-[#111827]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '< 2ms', label: 'Inferencia IA' },
              { value: '96.4%', label: 'Precisión vs CFD' },
              { value: '80 gen.', label: 'Algoritmo genético' },
              { value: '3 formatos', label: 'Exportación (PDF, DXF, STEP)' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-xl md:text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs md:text-sm text-[#64748b] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Todo lo que necesitas para diseñar alas</h2>
            <p className="mt-4 text-[#94a3b8]">Del concepto al análisis estructural, en una sola plataforma.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl border border-[#1e293b] bg-[#111827] hover:border-[#3b82f6]/30 hover:shadow-lg hover:shadow-[#3b82f6]/5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center mb-4 group-hover:bg-[#3b82f6]/20 transition-colors">
                  <f.icon className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20 md:py-28 bg-[#111827] border-y border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tres pasos, un ala optimizada</h2>
            <p className="mt-4 text-[#94a3b8]">Sin instalaciones, sin configuraciones complejas.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Parametriza', desc: 'Define geometría, perfil NACA y condiciones de operación. Los límites sectoriales se ajustan automáticamente.' },
              { step: '02', title: 'Simula', desc: 'El motor NeuralFoil predice coeficientes aerodinámicos en milisegundos. Visualiza la malla de presiones en 3D.' },
              { step: '03', title: 'Optimiza', desc: 'Ejecuta el algoritmo genético aeroestructural. Obtén la mejor relación L/D con restricciones de peso y coste.' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center mx-auto mb-5">
                  <span className="text-[#3b82f6] font-bold text-lg">{s.step}</span>
                </div>
                <h3 className="font-semibold text-lg text-white mb-2">{s.title}</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Precios transparentes</h2>
            <p className="mt-4 text-[#94a3b8]">Escoge el plan que mejor se adapte a tu flujo de trabajo.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p, i) => (
              <div
                key={i}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  p.featured
                    ? 'border-[#3b82f6] bg-[#111827] shadow-xl shadow-[#3b82f6]/10'
                    : 'border-[#1e293b] bg-[#111827] hover:border-[#334155]'
                } transition-all duration-300`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#3b82f6] text-white text-xs font-semibold">
                    Más popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-semibold text-white text-lg">{p.name}</h3>
                  <p className="text-sm text-[#94a3b8] mt-1">{p.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{p.currency}{p.price}</span>
                    <span className="text-sm text-[#64748b]">{p.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-[#94a3b8]">
                      <Check className="w-4 h-4 text-[#3b82f6] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setSelectedPlan(p.featured ? 'professional' : p.name === 'Empresa' ? 'enterprise' : 'freemium');
                    setIsAuthOpen(true);
                  }}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    p.featured
                      ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                      : 'bg-[#1e293b] hover:bg-[#334155] text-white'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-[#1e293b]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            ¿Listo para diseñar mejores alas?
          </h2>
          <p className="text-[#94a3b8] mb-8 max-w-xl mx-auto">
            Únete a ingenieros de toda Europa que ya usan OptimAirWing para reducir sus ciclos de diseño.
          </p>
          <button
            onClick={onEnterSimulator}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold transition-colors shadow-lg shadow-[#3b82f6]/25"
          >
            Probar simulador gratis <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e293b] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">OW</span>
            </div>
            <span>OptimAirWing</span>
            <span>·</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#64748b]">
            <button onClick={() => scrollTo('features')} className="hover:text-[#94a3b8] transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-[#94a3b8] transition-colors">Precios</button>
            <button className="hover:text-[#94a3b8] transition-colors">Privacidad</button>
            <button className="hover:text-[#94a3b8] transition-colors">Términos</button>
          </div>
        </div>
      </footer>

      <CookieBanner />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialPlan={selectedPlan}
        onLoginSuccess={() => { setIsAuthOpen(false); onEnterSimulator(); }}
      />
    </div>
  );
};
