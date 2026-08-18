import React, { useState } from 'react';
import {
  ArrowRight, Check, Menu, X, Zap, BarChart3, Layers,
  FileText, Shield, ChevronDown, Activity, Radio, Gauge,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { AuthModal } from './AuthModal';
import { CookieBanner } from './CookieBanner';
import { renderProfile2D } from '../domains/wing/viewer2d';

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
    desc: 'Predice CL, CD, Cm y L/D en milisegundos con el modelo empírico de línea sustentadora. Sin esperas ni clústeres CFD.',
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
    desc: 'Documentación profesional con parámetros, resultados y nivel de fidelidad del modelo. Exportable a PDF.',
  },
  {
    icon: Shield,
    title: 'Análisis estructural',
    desc: 'Factor de seguridad, momento flector, deflexión en punta y riesgo de flameo en cada diseño.',
  },
  {
    icon: Radio,
    title: 'Exportación CAD',
    desc: 'Descarga planos en DXF y STEP para integrar con tu flujo de manufactura.',
  },
];

const steps = [
  { step: '01', title: 'Parametriza', desc: 'Define geometría, perfil NACA y condiciones de operación. Los límites sectoriales se ajustan automáticamente.' },
  { step: '02', title: 'Simula', desc: 'El motor empírico predice coeficientes aerodinámicos en milisegundos. Visualiza el campo de presiones en 3D.' },
  { step: '03', title: 'Optimiza', desc: 'Ejecuta el algoritmo genético aeroestructural. Obtén la mejor relación L/D con restricciones de peso y coste.' },
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
    features: ['100 créditos / mes', 'Modelo empírico de línea sustentadora', 'Optimización genética', 'PDF sin marca de agua', 'Análisis estructural'],
    cta: 'Suscribirse',
    featured: true,
  },
  {
    name: 'Empresa',
    price: '500',
    currency: '€',
    period: '/mes',
    desc: 'Para equipos y fabricantes',
    features: ['Créditos ilimitados', 'API completa', 'Predicción a escala', 'SLA prioritario', 'Integración directa'],
    cta: 'Contactar',
    featured: false,
  },
];

const stats = [
  { value: '< 2ms', label: 'Predicción empírica' },
  { value: '±3%', label: 'Error vs datos de referencia' },
  { value: '80 gen.', label: 'Algoritmo genético' },
  { value: '3 formatos', label: 'Exportación (PDF, DXF, STEP)' },
];

/* Hero instrument: live NACA profile + telemetry readout */
const HeroInstrument: React.FC = () => {
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (profileRef.current) {
      renderProfile2D(profileRef.current, '2412');
    }
  }, []);

  const readings = [
    { label: 'CL', value: '0.8245', tone: 'text-[#34d399]' },
    { label: 'CD', value: '0.0072', tone: 'text-[#fbbf24]' },
    { label: 'L/D', value: '114.5', tone: 'text-[#22d3ee]', strong: true },
    { label: 'α', value: '4.0°', tone: 'text-[#8ea3bd]' },
  ];

  return (
    <div className="hud-card hud-bracket relative p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="hud-label flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#22d3ee]" />
          NACA 2412 · en vivo
        </span>
        <span className="hud-label flex items-center gap-1.5 text-[#34d399]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] hud-pulse" />
          Empírico
        </span>
      </div>

      <div ref={profileRef} className="w-full h-40 rounded-md overflow-hidden" />

      <div className="grid grid-cols-4 gap-2 mt-4">
        {readings.map(r => (
          <div key={r.label} className="bg-[#080c13] border border-[#16202f] rounded-lg px-2 py-2 text-center">
            <div className="hud-label text-[9px]">{r.label}</div>
            <div className={`font-mono text-sm font-bold mt-0.5 ${r.strong ? 'text-base' : ''} ${r.tone}`}>{r.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#16202f]">
        <Gauge className="w-3.5 h-3.5 text-[#5b6f8c]" />
        <span className="text-[11px] text-[#5b6f8c] font-mono">M = 0.06 · Re = 1.2e6 · AR 7.8</span>
      </div>
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterSimulator }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'freemium' | 'professional' | 'enterprise'>('professional');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduce = useReducedMotion();

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fadeUp = {
    initial: reduce ? undefined : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="min-h-screen bg-[#05070c] text-[#e8f1fb] font-sans antialiased">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#05070c]/85 backdrop-blur-lg border-b border-[#16202f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/30 flex items-center justify-center hud-bracket">
                <span className="font-mono text-[#22d3ee] font-bold text-[11px]">AW</span>
              </div>
              <span className="font-display font-bold text-base text-[#e8f1fb] tracking-tight">OptimAirWing</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map(l => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className="text-sm text-[#8ea3bd] hover:text-[#e8f1fb] transition-colors font-medium"
                >
                  {l.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedPlan('professional'); setIsAuthOpen(true); }}
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-[#8ea3bd] hover:text-[#e8f1fb] transition-colors"
              >
                Iniciar sesión
              </button>
              <button
                onClick={onEnterSimulator}
                className="btn-primary px-4 py-2 text-sm"
              >
                <Zap className="w-4 h-4" />
                Probar simulador
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-[#8ea3bd] hover:text-[#e8f1fb]"
                aria-label="Menú"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#16202f] px-4 py-4 space-y-3 bg-[#0a0f18]">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full text-left text-sm text-[#8ea3bd] hover:text-[#e8f1fb] py-1">{l.label}</button>
            ))}
            <button onClick={() => { setMobileMenuOpen(false); setSelectedPlan('professional'); setIsAuthOpen(true); }} className="block w-full text-left text-sm text-[#8ea3bd] hover:text-[#e8f1fb] py-1">Iniciar sesión</button>
          </div>
        )}
      </header>

      {/* ── Hero (asymmetric split) ────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-blueprint pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#22d3ee]/6 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
            {/* Copy */}
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22d3ee]/8 border border-[#22d3ee]/20 text-[#67e8f9] text-xs font-semibold mb-6">
                <Radio className="w-3 h-3" />
                Sistema de diseño alar con IA
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                Alas optimizadas,{' '}
                <span className="text-[#22d3ee]">sin iterar en CFD</span>
              </h1>
              <p className="mt-5 text-lg text-[#8ea3bd] leading-relaxed max-w-xl">
                OptimAirWing combina simulación aerodinámica por IA con optimización
                genética para que ingenieros creen alas más eficientes en segundos.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                <button
                  onClick={onEnterSimulator}
                  className="btn-primary px-6 py-3 text-sm"
                >
                  Probar simulador gratis <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="btn-ghost px-6 py-3 text-sm"
                >
                  Cómo funciona <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-6 text-xs text-[#5b6f8c] font-mono">
                CLI · API · Navegador · CAD — 3 formatos de exportación
              </p>
            </motion.div>

            {/* Instrument */}
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <HeroInstrument />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Telemetry strip ────────────────────────────────── */}
      <section className="border-y border-[#16202f] bg-[#0a0f18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#16202f] gap-y-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="text-center lg:px-6"
              >
                <div className="font-mono text-xl md:text-2xl font-bold text-[#22d3ee]">{s.value}</div>
                <div className="text-xs md:text-sm text-[#5b6f8c] mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (asymmetric grid) ─────────────────────── */}
      <section id="features" className="scroll-mt-20 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="max-w-2xl mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Todo lo necesario para diseñar alas</h2>
            <p className="mt-4 text-[#8ea3bd]">Del concepto al análisis estructural, en una sola plataforma.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={`hud-card hud-card-hover p-6 ${
                  i === 0 || i === 3 ? 'lg:translate-y-4' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#22d3ee]/8 border border-[#22d3ee]/20 flex items-center justify-center mb-4 group-hover:bg-[#22d3ee]/15 transition-colors">
                  <f.icon className="w-5 h-5 text-[#22d3ee]" />
                </div>
                <h3 className="font-display font-semibold text-[#e8f1fb] mb-2">{f.title}</h3>
                <p className="text-sm text-[#8ea3bd] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works (numbered timeline) ───────────────── */}
      <section id="how-it-works" className="scroll-mt-20 py-20 md:py-28 bg-[#0a0f18] border-y border-[#16202f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="max-w-2xl mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Tres pasos, un ala optimizada</h2>
            <p className="mt-4 text-[#8ea3bd]">Sin instalaciones, sin configuraciones complejas.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-14 right-0 h-px bg-gradient-to-r from-[#22d3ee]/40 to-transparent" />
                )}
                <div className="w-14 h-14 rounded-xl bg-[#22d3ee]/8 border border-[#22d3ee]/25 flex items-center justify-center mb-5 font-mono text-[#22d3ee] font-bold text-lg hud-bracket">
                  {s.step}
                </div>
                <h3 className="font-display font-semibold text-lg text-[#e8f1fb] mb-2">{s.title}</h3>
                <p className="text-sm text-[#8ea3bd] leading-relaxed max-w-xs">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Precios transparentes</h2>
            <p className="mt-4 text-[#8ea3bd]">Escoge el plan que mejor se adapte a tu flujo de trabajo.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {plans.map((p, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`relative rounded-xl p-6 flex flex-col ${
                  p.featured
                    ? 'bg-[#0e1624] border-[#22d3ee]/40 border shadow-xl shadow-[#22d3ee]/5'
                    : 'hud-card'
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#22d3ee] text-[#05070c] text-xs font-bold">
                    Más popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-display font-semibold text-[#e8f1fb] text-lg">{p.name}</h3>
                  <p className="text-sm text-[#8ea3bd] mt-1">{p.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-[#e8f1fb]">{p.currency}{p.price}</span>
                    <span className="text-sm text-[#5b6f8c]">{p.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-[#8ea3bd]">
                      <Check className="w-4 h-4 text-[#22d3ee] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setSelectedPlan(p.featured ? 'professional' : p.name === 'Empresa' ? 'enterprise' : 'freemium');
                    setIsAuthOpen(true);
                  }}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                    p.featured ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {p.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-20 border-t border-[#16202f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
              ¿Listo para diseñar mejores alas?
            </h2>
            <p className="text-[#8ea3bd] mb-8 max-w-xl mx-auto">
              Únete a ingenieros de toda Europa que ya usan OptimAirWing para reducir sus ciclos de diseño.
            </p>
            <button
              onClick={onEnterSimulator}
              className="btn-primary px-6 py-3 text-sm"
            >
              Probar simulador gratis <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-[#16202f] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[#5b6f8c]">
            <div className="w-6 h-6 rounded bg-[#22d3ee]/10 border border-[#22d3ee]/30 flex items-center justify-center">
              <span className="text-[#22d3ee] font-mono font-bold text-[9px]">AW</span>
            </div>
            <span className="font-display font-semibold">OptimAirWing</span>
            <span>·</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#5b6f8c]">
            <button onClick={() => scrollTo('features')} className="hover:text-[#8ea3bd] transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-[#8ea3bd] transition-colors">Precios</button>
            <button className="hover:text-[#8ea3bd] transition-colors">Privacidad</button>
            <button className="hover:text-[#8ea3bd] transition-colors">Términos</button>
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
