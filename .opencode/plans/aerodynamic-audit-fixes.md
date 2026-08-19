# OptimAirWing — Plan de Corrección Física y Lógica (Auditoría)

## Objetivo
Hacer que un ingeniero aeroespacial pueda confiar en la herramienta: corregir errores físicos CRÍTICOS, eliminarlos claims falsos de "NeuralFoil/SU2/XFOIL", y arreglar lógica de producto y API que no hace lo que dice. Alcance aprobado: **Fases 1-5**.

## FASE 1 — Correctitud del motor core (diffs pequeños, impacto máximo)

### F1.1 `src/domains/wing/empirical.ts`
- `numElements = 2` → `numElements = 1` (default). Sin esto, toda ala sin campos multi-elemento recibe bonus F1 (+CL≈0.49, clamp 3.8). Corrige el estado por defecto (CL 0.93 → 0.45 aprox).
- Añadir defaults `twist_deg = 0`, usar `Mach = 0` destructuring; aplicar efecto de **twist/washout**: `effAlphaDeg = alpha_deg + 0.7 * twist_deg`.
- **Flecha**: `a = (a0*cosΛ) / (1 + (a0*cosΛ/(π·AR))·(1+tau))` (corregir término; antes `a0/(1+a0/(π·AR·cosΛ))`).
- **CD0**: añadir corrección por Reynolds (`(Re/1e7)^-0.15`) y **onda de compresibilidad** `ΔCD0 = 20·(M−Mcrit)^4` con `Mcrit = max(0.55, 0.62 + 0.18·sin(sweep) + 0.05·(0.15−t))`. Antes Mach/Re eran ignorados → L/D 31 para transporte transónico.
- **Cm0**: `-0.1` → `-0.05` (factor `/m·0.02`), para NACA 4-dígitos (2412 ≈ −0.05 real).
- **CL clamp single-element**: usar `clMax2d = 1.25 + 0.2·(m/0.02) + 0.1·(t−0.12)` en vez de 1.8 fijo.

### F1.2 `src/domains/wing/flightDynamics.ts`
- **Eliminar override** `if (Cm_alpha >= 0) Cm_alpha = -0.12` → reportar el signo real (el branch "Inestable" deja de ser código muerto).
- `Cm_alpha` como pendiente real `(Cm2−Cm1)/(α2−α1)` en vez de secante desde el origen.
- Margin estático desde geometría + CG: `staticMargin = (x_np/c − x_cg/c)`, con `x_np` = wing AC + contribución de cola si existe; al menos no reportar 35-72%.
- `dampingRatio` phugoid: usar `ζ ≈ (CD/CL)/√2` (Lanchester) en vez de `−Cm_alpha/(2ω)`.
- **Spiral**: usar criterio real `Clβ·Cnr − Cnβ·Clr > 0`; no devolver siempre "divergente".
- `Cn_beta` con saturación (no crecer lineal sin límite); `OswaldE` usar el `e` del modelo empírico en vez de 0.85 fijo.

### F1.3 `src/domains/wing/buckling.ts`
- **K-factors invertidos**: tabla { fixed-free: 0.25, pinned-pinned: 1.0, fixed-pinned: 2.0, fixed-fixed: 4.0 } contenía 1/K². Corregir a { fixed-free: 2, pinned-pinned: 1, fixed-pinned: 0.7, fixed-fixed: 0.5 } con `Leff = K·L` → P_crit correcto (antes 64× optimista).
- Modelo de carga: para bucking de spar usar `P = M_root / cap_spacing` (compresión por flexión) en vez de peso total como columna; o documentar como Euler de larguero.

### F1.4 `src/domains/wing/cfdValidator.ts`
- **Relabel**: `solver: 'SU2_Compressible_Euler/NavierStokes'` → segundo orden empírico (`lifting-line` cross-check). Quitar `jobId` falso.
- Añadir camber/α0 al modelo de referencia (`CL = a·(α − α0)`) para no flaggear todos los perfiles con camber.
- Tolerancias realistas 10-20% y **gatear por `run_cfd_validation`** (ver F3).

### F1.5 `src/domains/wing/naca.ts`
- Mean-line de **5 dígitos** real (NACA Report 460/824, parámetros k1/m) en vez de reusar la fórmula de 4 dígitos.

## FASE 2 — Modelo estructural

### F2.1 `src/domains/wing/penalties.ts`
- `computeEstimatedWeight`: reemplazar modelo "bloque sólido" (S·ĉ·t/c · formFactor) por modelo físico: `W_wing = ρ·(S·t_skin + capas spar)` con t_skin 1-3 mm, o fracción de MTOW por sector (~5-15%). Quitar `× safety_factor` (el SF no multiplica masa).
- Distinguir `wingMassKg` (estructura) de MTOW para wing-loading/stall (no tratar el ala como todo el avión).
- Penalty de **fatiga**: derivar tensión de flexión real (como stability) en vez de `CL·100·sf` vs MPa.

### F2.2 Separar `maneuver_load_factor` de `safety_factor` (F2 en todos los módulos)
- `src/core/types.ts`: añadir `maneuver_load_factor_g?: number` a DesignRequirements; `safety_factor` queda solo como margen de tensión.
- `stability.ts`: `loadFactor = maneuverLoadFactor` (no `max(2.5, sf·2.5)`); carga de maniobra `L = W·n` (trim), no `max(q·S·CL, W·n)`; momento = `(W·n·...)·(b/8)` con carga repartida.
- `buckling.ts`, `montecarlo.ts`, `penalties.ts`: usar el mismo knob de forma consistente.

### F2.3 `src/domains/wing/stability.ts`
- **Caja de spar realista**: `Ix` de caja hueca (ancho ~0.35·c, profundidad ~0.55·t) en vez de placa sólida de ala completa. Leer `t/c` real del NACA.
- **Quitar clamp `Math.min(10, FS)`** y `Math.min(999, V_div)` para que los semáforos discriminen.
- Torsión: `I_p` desde geometría real (masa por unidad de longitud, `μ·c²/8`) en vez de constante `1e-4`.
- `rho`: modelo de altitud (ISA) en vez de 1.225 fijo para sector comercial.
- Deflexión de punta: fórmula de carga repartida `L·s³/(16EI)` (o conservativa documentada).
- `CL_max` de stall desde perfil (camber/thickness), consistente con empírico.

### F2.4 `src/domains/wing/montecarlo.ts`
- FS con **material seleccionado** (`MATERIALS_DB[req.material].yield_strength` MPa→Pa), no al2024 hardcodeado 270 MPa (y 320 real).
- Usar `computeSparInertia` compartido (F2.5).
- L/D desde **geometría muestreada** (recalcular CL/CD por muestra) — ver F3.
- Una sola corrida MC reutilizada (ver F3).

### F2.5 Helper compartida
- `computeSparInertia(rootChord, tOverC)` usada por stability, montecarlo y buckling (3 fórmulas distintas → 1).

### F2.6 `src/domains/wing/penalties.ts`
- Quitar penalty "FS_buckling > 10 → ×0.1" (castiga sobrediseño); penalizar solo riesgo real (`fs < target`).

## FASE 3 — Optimizador honesto

### F3.1 `src/domains/wing/geneticOptimizer.ts`
- **Gate F1**: rechazar por `CD0` (o umbral de CD físico recalibrado) en vez de `CD >= 0.12` (ningún ala F1 cumple). Recalibrar `maxTargetDownforce`.
- **Respetar `fixed_span_m`** (y presets por sector) en `indToParams` motorsport; no devolver rear wing de 1.05 m para front wing de 1.80 m.
- **Stall gate**: `CL_max_2d = 1.1 + 0.1·(m/100) + 0.02·t` (el primer dígito NACA es % de camber, no fracción — antes inflaba 10×).
- **Branch `'weight'`** real (peso dominante) en vez de igual a `'balance'`.
- **Repair operator**: re-encode genes tras cross-over/mutation para respetar constraints `Cr≤0.6b`, `Ct≤0.85Cr`, `b≥1.5Cr`.
- **No-convergencia**: si `bestFit === 0` (todo descartado) abortar/notificar en vez de devolver ala arbitraria. Conteo de descartes > 90% → warning.
- Fitness floor `max(25,...)` → mantener solo para no estancar, o bajar a 5.

### F3.2 `optimization_level` y créditos
- Decidir: o hacer efectivo cada nivel (empírico / +estructura / MC / +costes) o eliminar el cargo diferencial. Aprobado: **hacer efectivo** el peso en la fitness (estructura y MC ya pesan) y documentar en UI qué hace cada nivel; si no viable, cobrar igual.

### F3.3 `run_cfd_validation`
- `penalties.ts:227`: gatear `submitAndPollCFD` por el flag; sin flag no hay factor −50%.

### F3.4 Monte Carlo
- Recalcular CL/CD por muestra de geometría (L/D variable real).
- Una sola corrida MC reutilizada para scoring y para display.

### F3.5 `src/domains/wing/sectorGuardrails.ts`
- Coherentar rangos (S y AR derivados de b/Cr/Ct, no independientes) para que los extremos no sean infeasibles.
- Penalizar `Ct < Ct.min` (falta el lower bound).
- `pareto.ts`: clamp configs a límites de sector y computar FS real (no el target).

## FASE 4 — Provenance honesta

- `registry.ts`: no marcar "NeuralFoil" por defecto; usar modelo `empirical` (fidelity 'empirical', model_version '1.0-lifting-line').
- `neuralfoilPredictor.ts`: `is_available()` → false (o integrar NeuralFoil real); no claim 0.96 confidence.
- `cfdValidator.ts`: label honesto (ver F1.4).
- `PolarsDashboardModal.tsx` / `ExportDownloadModal.tsx`: usar el mismo motor `calcularEmpirico` (o etiquetar "modelo empírico") — hoy son fórmulas ad-hoc con claim "NeuralFoil/XFOIL alta fidelidad".
- `reportGenerator.ts`: sustituir "NeuralFoil MODEL / SU2 CFD" por modelo real usado.
- `pythonBackend.ts` + Dockerfile: o eliminar el backend Python muerto y sus health-checks (mark "no disponible"), o implementarlo (fuera de alcance). Aprobado: **marcar no disponible** y quitar claims.

## FASE 5 — Integración / API

- `store.ts`: `syncCreditsFromServer` → `/v1/user/credits`; `recordOptimizationUsed` → `/v1/user/credits/use` (rutas reales, sin `/api`).
- `server/schemas/wingSchema.ts`: incluir campos multi-elemento (isMultiElement, numElements, flap*, Re, Mach) para que zod no los borre; bounds para Mach/α/sweep/twist/Re y `Ct ≤ Cr`.
- `planEnforcer.ts` vs `db.getPlanLimits`: unificar límites freemium (3 pred / 1 opt).
- `v1Router.ts`: `/v1/optimize/stream` con gate de plan/créditos igual que `/optimize`; billing de `reportUsageByOrgId` coherente con el nivel.
- `server/infra/idempotency.ts`: TTL comparando timestamp real (guardar `createdAt`), no el status code HTTP.
- API shape: `/v1/optimize` snake_case vs camelCase → unificar o documentar.

## Verificación
- `npm run typecheck`, `npm test` (vitest), `npm run lint` después de cada fase.
- Commit + push por fase.