# Flutter and Aeroelastic Stability — Derivación Matemática

## 1. Introducción

Flutter es una inestabilidad aeroelástica autorreforzada que ocurre cuando la energía aerodinámica supera la capacidad de amortiguamiento estructural. Es una falla catastrófica que puede ocurrir en segundos sin aviso previo.

**Historia:**
- 1935: Primera confirmación teórica por Herbert Wood (UK)
- 1940: Fallecimiento de James Dean en TB-20 Rocket (flutter)
- 1959: Wright-Patterson AFB establece estándares modernos

**Referencias:**
- Bisplinghoff, R.L., & Ashley, H. (1996). *Principles of Aeroelasticity*
- Dowell, E.H. (2015). *Aeroelasticity of Linear and Nonlinear Flight Structures*
- FAR 23.629 / CS-VLA.629

---

## 2. Tipos de Flutter

| Tipo | Grados de libertad | Característica |
|------|-------------------|----------------|
| **Pondaje (Divertimento)** | 2 (pitch + plunge) | Frecuencia baja, amplitud grande |
| **Alabeo (Aileron reversal)** | 1 (roll) | Pérdida de efectividad del aileron |
| **Flexural-torsional** | 2 (bending + torsion) | Más común en alas |
| **Control surface flutter** | 3+ | Incluye actuadores y estructuras |

---

## 3. Fundamentos Matemáticos

### 3.1 Sistema Masa-Elasto-Dinámico

El comportamiento se modela como:

```
[M]{ẍ} + [C]{ẋ} + [K]{x} = {F_aero}
```

Donde:
- [M] = matriz de masa
- [C] = matriz de amortiguamiento (estructural + aerodinámico)
- [K] = matriz de rigidez
- {x} = vector de desplazamientos

### 3.2 Aerodinámica de Línea de Sustentación

ParaFlutter lineal, se usa una aproximación de "quasi-steady":

```
L = ½ρV²c·CL(α)
```

Con corrección de Theodorsen para efectos no estacionarios:

```
C_L = C_Lα · [α + (c/2V)·(dα/dt) + F(k)·(c/2V)·(d²α/dt²)]
```

Donde F(k) es la función de Theodorsen, k = ωc/(2V) es el número de reduced frequency.

### 3.3 Ecuación de Flutter

Para un ala con 2 GDL (flexión y torsión):

```
| (K_θ - ω²M_θ)     -ω²M_θθ      | · {θ}   = {0}
|  -ω²M_θθ          (K_q - ω²M_q) |   {q}     {0}
```

Donde:
- θ = ángulo de ataque (torsión)
- q = desplazamiento vertical (flexión)
- K_θ, K_q = rigideces torsional y flexional
- M_θ, M_q = masas rotacional y translacional

---

## 4. Velocidad de Flutter

La velocidad de flutter V_f es la velocidad crítica donde el amortiguamiento aerodinámico se vuelve negativo.

### 4.1 Método de p-k (Dowell)

Se define:

```
p = ωc/(2V)
k = ωc/(2V∞)
```

La ecuación característica se convierte en:

```
det([A](p, k)) = 0
```

Resolver para V当ω es conocido.

### 4.2 Fórmula Aproximada para Alas Bajas

Para alas con baja flecha y AR moderate:

```
V_f ≈ √( (K_θ·K_q) / (½ρc²·CL_α·e) ) · (1 / (1 + μ·(h/c)²))
```

Donde:
- μ = relación de masa (m/(ρc²))
- h = distancia entre eje de torsión y centro de presión

### 4.3 Factor de Divergencia

La velocidad de divergencia V_D se relaciona con V_f:

```
V_D = V_f / √(1 - (f/f_D)²)
```

Donde f_D es la frecuencia de divergencia.

---

## 5. Análisis en OptimAirWing

### 5.1 Cálculo de V_f Simplificado

```typescript
function computeFlutterVelocity(
  sparBox: SparBox,
  material: MaterialProperties,
 CL_α: number,
  sweep_deg: number,
  span: number,
  rootChord: number,
  massBreakdown: MassBreakdown
): number {
  // Rigidez torsional (J)
  const J = computeSparTorsionConstant(sparBox, rootChord);
  const G = material.shear_modulus * 1e9;  // Pa
  
  // Rigidez flexional (EI)
  const E = material.elastic_modulus * 1e9;
  const I = sparBox.I_m4;
  
  // Frecuencia natural torsional
  const f_n = 0.5 * Math.sqrt(G * J / (massBreakdown.totalKg * span²));
  
  // V_f approximada
  const V_f = 0.5 * span * f_n * Math.sqrt(G * J / (0.5 * 1.225 * rootChord² * CL_α));
  
  return Math.max(0, V_f);
}
```

### 5.2 Margen de Flutter

```
flutter_margin = V_f / V_operativo
```

Requisitos FAR 23:

```
V_f ≥ 1.25·V_dive    (margen de 25%)
```

Donde V_dive = 1.35·V_C (velocidad de crucero)

---

## 6. Factores que Afectan Flutter

| Factor | Efecto en V_f | Magnitud |
|--------|---------------|----------|
| **Aumentar AR** | ↓ V_f | -20% para AR=12 vs AR=6 |
| **Aumentar sweep** | ↑ V_f (aéreo) ↓ V_f (estructural) | Neto +5-10% |
| **Masa distribuida** | ↑ V_f | +15-20% |
| **Winglets** | ↑ V_f | +5-10% |
| **Damping estructural** | ↑ V_f | +10-25% |

---

## 7. Estrategias de Prevención

### 7.1 Diseño Estructural

| Estrategia | Efecto | Implementación |
|------------|--------|----------------|
| Aumentar rigidez torsional J | ↑ V_f | Larguero más profundo, web más gruesa |
| Aumentar masa distribuida | ↑ V_f | Contrapesos en bordes de fuga |
| Añadir damping | ↑ V_f | Amortiguadores viscoelásticos |

### 7.2 Diseño Aerodinámico

| Estrategia | Efecto | Implementación |
|------------|--------|----------------|
| Reducir CL_α | ↑ V_f | Taper ratio mayor, sweep positivo |
| Mover CP hacia LE | ↓ V_f | Evitar | 

---

## 8. Validación y Pruebas

### 8.1 Análisis Modal Experimental

Prueba de vibración libre para obtener:

```
ω_n = √(k/m)    (frecuencia natural)
ζ = c / (2√(km))    (amortiguamiento)
```

### 8.2 Análisis Computacional

Métodos modernos usan:

1. **P-k method**: Resolver ecuación característica
2. **Eigenvalue analysis**: Encontrar valores propios complejos
3. **Time domain simulation**: Integración directa de EDOs

---

## 9. Referencias

1. **Bisplinghoff, R.L., & Ashley, H.** (1996). *Principles of Aeroelasticity*. Dover.
2. **Dowell, E.H.** (2015). *Aeroelasticity of Linear and Nonlinear Flight Structures*. Springer.
3. **FAR 23.629** (2023). *Flutter Safety*. Code of Federal Regulations.
4. **CS-VLA.629** (2022). *Small Airplane Criteria*. EASA.
5. **NACA Report 821** (1945). *Flutter of Flexible Structures*.

---

**Última actualización:** 2026-08-21  
**Versión:** 1.0  
**Implementación:** `src/domains/wing/stability.ts` → flutterRisk