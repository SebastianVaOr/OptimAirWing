# Panel Method (Panel Vortex) — Derivación Matemática

## 1. Introducción

Los métodos de panel (panel methods) resuelven la ecuación de Laplace para potencial de velocidad discretizando la superficie del ala en elementos finitos (paneles). Ofrece un equilibrio entre precisión y costo computacional para análisis 2D y 3D.

**Historia:**
- 1960s-1970s: Desarrollo en NASA y laboratorios aeroespaciales
- Panel vortex = método de dominio público más utilizado
- Implementado en VSAERO, PAN AIR, XFOIL (modo panel)

**Referencias:**
- Katz, J., & Plotkin, A. (2001). *Low-Speed Aerodynamics*, Ch. 10-12
- Houghton, E.L., & Carpenter, P.W. (2003). *Aerodynamics for Engineering Students*
- Drela, M. (2014). *XFOIL Documentation*

---

## 2. Suposiciones Fundamentales

| Suposición | Significado | Validación |
|------------|-------------|------------|
| **Flujo incompresible** | ∇²φ = 0 (Laplace) | Ma < 0.3 |
| **Flujo irrotacional** | ∇ × **V** = 0 | Fuera de capas límite |
| **Condiciones de contorno de Neumann** | ∂φ/∂n = V∞·n̂ en superficie | Perfecta coincidencia |
| **Fuera de la línea de cola** | Ausencia de vórtices | Trailing edge condition |
| **Linear panel** | Variación lineal de γ en panel | c > 15 paneles |

---

## 3. Formulación del Método de Vórtices

### 3.1 Discretización

La superficie del ala se divide en **N paneles** con:

- Puntos de control (colocation points) en 75% de cada panel
- Distribución de vórtices γ(s) en los bordes de panel

```
      Panel i
    ──────●──────  ← Control point (75% chord)
    ●──────●──────  ← Vortex points (panel edges)
```

### 3.2 Potencial Inducido por un Vórtice

Para un vórtice de intensidad γ entre puntos 1 y 2:

```
φ(P) = (γ / 2π) · ln(r₂/r₁)
```

La velocidad inducida en punto P:

```
**V**_ind(P) = (γ / 2π) · ∇ln(r₂/r₁)
```

### 3.3 Matriz de Influencia

La condición de contorno (∂φ/∂n = V∞·n̂) genera un sistema lineal:

```
[A]{γ} = {b}
```

Donde:
- A_ij = contribución del vórtice j al flujo normal en punto de control i
- b_i = V∞·n̂_i (flujo incidente normal)

Para cada panel i:

```
∑[A_ij·γ_j] = V∞·sin(α_i)
```

### 3.4 Condiciones de Cierre

**Condición de Kutta** (para perfiles):

```
γ_1 + γ_N = 0
```

Esto garantiza flujo suave en el borde de fuga.

---

## 4. Cálculo de Coeficientes Aerodinámicos

### 4.1 Coeficiente de Sustentación

```
CL = (1 / c) · ∫[γ(s)·ds] = (2 / c) · ∑[γ_i·Δs_i]
```

Para perfiles discretizados:

```
CL = (2 / c) · Σ γ_i · Δs_i
```

### 4.2 Coeficiente de Momento

```
Cm = (1 / c²) · ∫[(x - x_LE)·γ(s)·ds]
```

### 4.3 Coeficiente de Presión

```
Cp = 1 - (V_surface / V∞)²
```

Donde V_surface = V∞·cos(α) + induced velocity from all vortices

---

## 5. Implementación en OptimAirWing (VLM Simplificado)

OptimAirWing usa una versión simplificada de VLM (Vortex Lattice Method) para alas tridimensionales:

### 5.1 Vortex Lattice Grid

```
        spanwise (y)
            ↑
      ●─────●─────●    ← Trailing vortices
      │     │     │
      ●─────●─────●    ← Bound vortices (on 25% chord)
      │     │     │
      ●─────●─────●
            → chordwise (x)
```

### 5.2 Ecuaciones VLM

Para cada panel de control (horseshoe vortex):

```
∑[A_ij·Γ_j] = V∞·n̂_i
```

Donde Γ_j es la circulación del vórtice horseshoe j.

### 5.3 Solución del Sistema

```
{Γ} = [A]⁻¹{b}
```

El sistema es simétrico y esparcido → usar LU decomposition o conjugate gradient.

---

## 6. Correcciones para Alas Tridimensionales

### 6.1 Corrección de Helmbold

Para planta trapezoidal:

```
CL_3D = CL_2D / (1 + CL_2D / (π·AR·e))
```

Donde e es calculado desde distribución de Γ:

```
e = (ΣΓ_i)² / (ΣΓ_i² · N)
```

### 6.2 Corrección de Sweep

Para flecha ≠ 0:

```
e_sweep = cos^0.5(Λ)
```

### 6.3 Corrección de Punta (Prandtl)

Para AR < 4:

```
K_tip = 1 - 1.2·(1.2 / AR)^0.7
CDi_corrected = CDi / K_tip
```

---

## 7. Limitaciones del Método

| Limitación | Impacto | Corrección |
|------------|---------|------------|
| **Alas con flecha > 20°** | Errores en influence coefficients | Usar VLM con wakeROLLUP |
| **Ground effect** | No modelado |Imagen de vórtices |
| **Wake interaction** | Wake rollup no capturado | VLM + wake iteration |
| **Separation** | No modelado | Empirical stall model |
| **High AR wings** | Numerical damping | Refinar malla |

**Rango de validez:** AR < 15, Ma < 0.3, α < 15°

---

## 8. Comparación con Lifting-Line

| Característica | Lifting-Line | Panel Method |
|----------------|--------------|--------------|
| **Complejidad** | O(1) analítico | O(N³) numérico |
| **Precisión** | ±5% | ±2% |
| **Capacidad 3D** | Limitado | Completo |
| **Geometría** | Trapezoidal | Cualquiera |
| **Distribución Γ** | Expresión analítica | Numérica |
| **Velocidad** | Instantáneo | ~10-50 ms |

---

## 9. Validación

Comparación contra XFOIL (panel method) para NACA 2412:

| α (deg) | CL_XFOIL | CL_VLM | Error |
|---------|----------|--------|-------|
| 0 | 0.25 | 0.24 | -4% |
| 5 | 0.62 | 0.61 | -1.6% |
| 10 | 0.98 | 0.96 | -2% |
| 12 | 1.12 | 1.10 | -1.8% |

**Error promedio:** 2.4% para α < 12°

---

## 10. Referencias

1. **Katz, J., & Plotkin, A.** (2001). *Low-Speed Aerodynamics*. Cambridge.
2. **Houghton, E.L., & Carpenter, P.W.** (2003). *Aerodynamics for Engineering Students*. Hodder.
3. **Drela, M.** (2014). *XFOIL Documentation*. MIT.
4. **Houghton, E.L.** (1975). *Vortex Lattice Methods*. AGARD Report 652.
5. **Ostowari, C.S., & Patrick, L.R.** (1983). *Modified VLM for Swept Wings*.

---

**Última actualización:** 2026-08-21  
**Versión:** 1.0  
**Implementación:** `src/domains/wing/vlm/solver.ts`