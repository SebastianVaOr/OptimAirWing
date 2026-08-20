import React, { useState } from 'react';
import {
  ArrowRight, Check, Menu, X, Zap, BarChart3, Layers,
  FileText, Shield, ChevronDown, Activity, Radio, Gauge,
  Plane, Car, Ship,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { AuthModal } from './AuthModal';
import { CookieBanner } from './CookieBanner';
import { renderProfile2D } from '../domains/wing/viewer2d';
import { Button } from './primitives/Button';

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

const HeroInstrument: React.FC = () => {
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (profileRef.current) {
      renderProfile2D(profileRef.current, '2412');
    }
  }, []);

  return (
    <div className="instrument-frame card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="hud-label flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          NACA 2412 · en vivo
        </span>
        <span className="hud-label flex items-center gap-1.5 text-ok">
          <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse-subtle" aria-hidden="true" />
          Empírico
        </span>
      </div>

      <div ref={profileRef} className="w-full h-40 rounded overflow-hidden" />

      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          { label: 'CL', value: '0.8245' },
          { label: 'CD', value: '0.0072' },
          { label: 'L/D', value: '114.5' },
          { label: 'α', value: '4.0°' },
        ].map(r => (
          <div key={r.label} className="bg-well border border-line rounded px-2 py-2 text-center">
            <div className="hud-label text-[9px]">{r.label}</div>
            <div className="hud-data mt-0.5">{r.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line">
        <Gauge className="w-3.5 h-3.5 text-dim" aria-hidden="true" />
        <span className="text-[11px] text-dim font-mono">M = 0.06 · Re = 1.2e6 · AR 7.8</span>
      </div>
    </div>
  );
};

const JetSilhouette: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 800 600"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <g opacity="0.04" stroke="currentColor" strokeWidth="1" className="text-accent">
      {/* Fuselage */}
      <path d="M400 80 L395 120 L390 200 L388 300 L390 380 L395 440 L400 480 L405 440 L410 380 L412 300 L410 200 L405 120 Z" />
      {/* Nose cone */}
      <path d="M400 80 L396 95 L400 60 L404 95 Z" />
      {/* Left wing */}
      <path d="M390 220 L260 310 L250 320 L260 325 L390 280 Z" />
      {/* Right wing */}
      <path d="M410 220 L540 310 L550 320 L540 325 L410 280 Z" />
      {/* Left horizontal stabilizer */}
      <path d="M395 420 L320 455 L315 462 L320 465 L395 440 Z" />
      {/* Right horizontal stabilizer */}
      <path d="M405 420 L480 455 L485 462 L480 465 L405 440 Z" />
      {/* Vertical stabilizer */}
      <path d="M400 380 L400 420 L398 420 L400 350 L402 420 L400 420" />
      {/* Intake lines */}
      <path d="M392 180 L385 200 L392 210" />
      <path d="M408 180 L415 200 L408 210" />
      {/* Exhaust nozzle */}
      <ellipse cx="400" cy="480" rx="8" ry="4" />
    </g>
  </svg>
);

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
    <div className="min-h-screen bg-ink text-hi font-sans antialiased">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-ink/85 backdrop-blur-lg border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center instrument-frame">
                <span className="font-mono text-accent font-bold text-[11px]">AW</span>
              </div>
              <span className="font-display font-bold text-base text-hi tracking-tight">OptimAirWing</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map(l => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className="text-sm text-lo hover:text-hi transition-colors font-medium"
                >
                  {l.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setSelectedPlan('professional'); setIsAuthOpen(true); }}
                className="hidden sm:inline-flex"
              >
                Iniciar sesión
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Zap}
                onClick={onEnterSimulator}
              >
                Probar simulador
              </Button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-lo hover:text-hi"
                aria-label="Menú"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-line px-4 py-4 space-y-3 bg-panel">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full text-left text-sm text-lo hover:text-hi py-1">{l.label}</button>
            ))}
            <button onClick={() => { setMobileMenuOpen(false); setSelectedPlan('professional'); setIsAuthOpen(true); }} className="block w-full text-left text-sm text-lo hover:text-hi py-1">Iniciar sesión</button>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <JetSilhouette />
        <div className="absolute inset-0 blueprint-grid pointer-events-none" />

        {/* Vertical rotated text */}
        <div className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 vertical-text z-10">
          AERODYNAMICS
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Breadcrumb */}
              <nav className="breadcrumb mb-8" aria-label="Breadcrumb">
                <span>Mainpage</span>
                <span className="breadcrumb-sep">/</span>
                <span>Features</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-active">Tools</span>
              </nav>

              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                OptimAir<span className="text-accent">Wing</span>
              </h1>
              <p className="mt-5 font-display text-xl font-light text-mid leading-relaxed max-w-xl">
                Diseño y Optimización Aerodinámica
              </p>
              <p className="mt-4 text-base text-lo leading-relaxed max-w-xl">
                Combina simulación aerodinámica por IA con optimización genética para que ingenieros creen alas más eficientes en segundos.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                <Button
                  size="lg"
                  variant="primary"
                  iconRight={ArrowRight}
                  onClick={onEnterSimulator}
                >
                  Entrar al Simulador
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  iconRight={ChevronDown}
                  onClick={() => scrollTo('how-it-works')}
                >
                  Ver Documentación
                </Button>
              </div>

              <div className="mt-8 flex items-center gap-4 text-xs text-dim font-mono">
                <span>CLI</span>
                <span className="text-line2">·</span>
                <span>API</span>
                <span className="text-line2">·</span>
                <span>Navegador</span>
                <span className="text-line2">·</span>
                <span>CAD</span>
              </div>
            </motion.div>

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

      {/* ── Stats bar ───────────────────────────────────────── */}
      <section className="border-y border-line bg-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line gap-y-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="text-center lg:px-6"
              >
                <div className="font-mono text-xl md:text-2xl font-bold text-accent">{s.value}</div>
                <div className="text-xs md:text-sm text-dim mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="max-w-2xl mb-14">
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Todo lo necesario para diseñar alas</h2>
            <p className="mt-4 text-lo">Del concepto al análisis estructural, en una sola plataforma.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="card-elevated p-6 flex gap-5"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/8 border border-accent/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-hi mb-2">{f.title}</h3>
                  <p className="text-sm text-lo leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 py-20 md:py-28 bg-panel border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="max-w-2xl mb-14">
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Tres pasos, un ala optimizada</h2>
            <p className="mt-4 text-lo">Sin instalaciones, sin configuraciones complejas.</p>
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
                  <div className="hidden md:block absolute top-7 left-14 right-0 h-px bg-gradient-to-r from-accent/40 to-transparent" />
                )}
                <div className="w-14 h-14 rounded-xl bg-accent/8 border border-accent/25 flex items-center justify-center mb-5 font-mono text-accent font-bold text-lg instrument-frame">
                  {s.step}
                </div>
                <h3 className="font-display font-semibold text-lg text-hi mb-2">{s.title}</h3>
                <p className="text-sm text-lo leading-relaxed max-w-xs">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Precios transparentes</h2>
            <p className="mt-4 text-lo">Escoge el plan que mejor se adapte a tu flujo de trabajo.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {plans.map((p, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`relative card-elevated p-6 flex flex-col ${
                  p.featured ? 'border-accent shadow-glow' : ''
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-ink text-xs font-bold font-mono">
                    Más popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-display font-semibold text-hi text-lg">{p.name}</h3>
                  <p className="text-sm text-lo mt-1">{p.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-hi">{p.currency}{p.price}</span>
                    <span className="text-sm text-dim">{p.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-lo">
                      <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={p.featured ? 'primary' : 'secondary'}
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setSelectedPlan(p.featured ? 'professional' : p.name === 'Empresa' ? 'enterprise' : 'freemium');
                    setIsAuthOpen(true);
                  }}
                >
                  {p.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="py-20 border-t border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-4">
              ¿Listo para diseñar mejores alas?
            </h2>
            <p className="text-lo mb-8 max-w-xl mx-auto">
              Únete a ingenieros de toda Europa que ya usan OptimAirWing para reducir sus ciclos de diseño.
            </p>
            <Button
              size="lg"
              variant="primary"
              iconRight={ArrowRight}
              onClick={onEnterSimulator}
            >
              Entrar al Simulador
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-line py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-accent/10 border border-accent/30 flex items-center justify-center">
              <span className="text-accent font-mono font-bold text-[9px]">AW</span>
            </div>
            <span className="font-serif font-semibold text-hi">OptimAirWing</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs text-lo">
            <button onClick={() => scrollTo('features')} className="hover:text-hi transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-hi transition-colors">Precios</button>
            <button className="hover:text-hi transition-colors">Privacidad</button>
            <button className="hover:text-hi transition-colors">Términos</button>
          </div>
          <div className="text-xs text-dim font-mono">
            © 2026 OptimAirWing
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
