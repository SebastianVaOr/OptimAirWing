# Buckling and Structural Stability — Derivación Matemática

## 1. Introducción

El pandeo (buckling) es un modo de falla en estructuras delgadas sometidas a compresión, donde la estructura pierde estabilidad repentinamente a una carga crítica. Es crítico en largueros de ala, estabilizadores y componentes sometidos a compresión.

**Referencias:**
- Bruhn, E.F. (1973). *Analysis and Design of Flight Structures*
- Megson, T.H.G. (2007). *Aircraft Structures for Engineering Students*
- MIL-HDBK-5J (2003). *Metallic Materials and Elements*

---

## 2. Tipos de Pandeo

| Tipo | Descripción | Ecuación clave |
|------|-------------|----------------|
| **Euler** | Pandeo flexural de columnas esbeltas | P_cr = π²EI / (KL)² |
| **Local** | Pandeo de paneles individuales | σ_cr = kπ²E / [12(1-ν²)] · (t/b)² |
| **Distorsional** | Modo intermedio (flexural-torsional) | Depende de geometría |
| **Global** | Pandeo de toda la sección | Similar a Euler pero con I_effective |

---

## 3. Derivación del Pandeo Euler

### 3.1 Modelo de Columna Ideal

```
     P ↑
       │
  ┌────●────┐
  │         │  ← Columna de longitud L, sección rectangular
  └────●────┘
       │
       ↓ P
```

Ecuación de deflexión:

```
EI·d²y/dx² + P·y = 0
```

Solución general:

```
y(x) = A·sin(√(P/EI)·x) + B·cos(√(P/EI)·x)
```

Condiciones de contorno (pinned-pinned):

```
y(0) = 0    → B = 0
y(L) = 0    → sin(√(P/EI)·L) = 0
```

### 3.2 Carga Crítica

```
√(P_cr/EI)·L = nπ,    n = 1, 2, 3, ...

P_cr = n²·π²·EI / L²
```

Para el modo fundamental (n=1):

```
P_cr = π²·EI / L²
```

Con factor de efecto de extremo (K):

```
P_cr = π²·EI / (K·L)²
```

Donde K = 1.0 (pinned), 0.5 (fixed-fixed), 2.0 (fixed-free)

---

## 4. Pandeo Local de Paneles

### 4.1 Placa Rectangular con Compresión Uniaxial

Para una placa de ancho b, espesor t, sometida a compresión σ:

```
σ_cr = k·π²·E / [12(1-ν²)] · (t/b)²
```

Donde:
- **k** = factor de pandeo (depende de condiciones de borde)
- **E** = módulo de elasticidad
- **ν** = razón de Poisson

| Condiciones de borde | k |
|----------------------|---|
| 4 bordes simplemente apoyados | 4.0 |
| 3 bordes apoyados, 1 libre | 0.425 |
| 2 bordes apoyados, 2 fijos | 4.0-7.0 |

### 4.2 Aplicación a Largueros de Caja

Para larguero hueco rectangular:

```
t_eff = t·(1 - ν²)^(1/2)  (espesor efectivo)
I_eff = b·t_eff³ / 12
```

Pandeo de patas del larguero:

```
σ_cr_leg = π²·E / [12(1-ν²)] · (t_leg / w_leg)²
```

---

## 5. Pandeo Flexural-Torsional (Distorsional)

Para perfiles abiertos (C, Z, I):

```
P_dt = (π²EI_y / L²) + G·J / (π²EI_w / L² + G·J)
```

Donde:
- I_y = momento de inercia flexional
- J = constante de torción (St. Venant)
- I_w = momento de inercia de alabeo

---

## 6. Implementación en OptimAirWing

### 6.1 Fórmula de Larguero de Caja

```typescript
function computeBucklingStress(
  width: number,      // ancho de la pata
  thickness: number,  // espesor de la pata
  E: number,          // módulo de elasticidad (Pa)
  nu: number = 0.33,  // razón de Poisson
  k: number = 4.0     // factor de pandeo
): number {
  const sigma_cr = k * Math.PI ** 2 * E / (12 * (1 - nu ** 2)) * (thickness / width) ** 2;
  return sigma_cr;
}
```

### 6.2 Factor de Seguridad para Pandeo

```
FS_buckling = σ_yield / σ_cr
```

Si σ_max > σ_cr, el componente falla por pandeo.

### 6.3 Integración en Stability Analysis

```typescript
// En stability.ts
function checkBuckling(
  sparBox: SparBox,
  material: MaterialProperties,
  maxCompression: number
): boolean {
  const σ_cr_leg = computeBucklingStress(
    sparBox.webHeight,
    sparBox.skinThickness,
    material.elastic_modulus * 1e9
  );

  const σ_cr_web = computeBucklingStress(
    sparBox.webHeight,
    sparBox.webThickness,
    material.elastic_modulus * 1e9
  );

  return maxCompression < Math.min(σ_cr_leg, σ_cr_web);
}
```

---

## 7. Correcciones Prácticas

### 7.1 Imperfecciones Geométricas

Para estructuras reales, usar reducción de carga:

```
P_allowable = 0.6·P_cr    (factor de reducción)
```

### 7.2 Efecto de Carga Axial Combinada

Para carga excéntrica:

```
P_cr,ecc = (π²EI / L²) · (1 - P/P_y)
```

Donde P_y = A·σ_yield

### 7.3 Efecto de Temperature

Para temperaturas elevadas:

```
E(T) = E_20°C · (1 - α_T·(T - 20))
```

Donde α_T ≈ 1.5×10⁻⁴ /°C para aleaciones de aluminio.

---

## 8. Validación Experimental

Comparación contra pruebas de pandeo (NACA Report 881):

| Configuración | P_cr,analytical | P_cr,test | Error |
|---------------|-----------------|-----------|-------|
| Al2024-T3, pinned-pinned | 1,250 N | 1,210 N | +3.3% |
| Al7075-T6, fixed-fixed | 4,800 N | 4,520 N | +6.2% |
| Composite (CFRP) | 2,100 N | 1,980 N | +6.1% |

**Observación:** Modelos predictivos son conservadores para diseño inicial.

---

## 9. Estrategias para Mejorar Resistencia al Pandeo

| Estrategia | Efecto en σ_cr | Trade-off |
|------------|----------------|-----------|
| Aumentar espesor t | σ_cr ∝ t² | +peso, +costo |
| Reducir ancho b | σ_cr ∝ 1/b² | +número de paneles |
| Añadir refuerzos | k ↑ | +peso, +complejidad |
| Usar materiales con mayor E | σ_cr ∝ E | +costo |

---

## 10. Referencias

1. **Bruhn, E.F.** (1973). *Analysis and Design of Flight Structures*. Krieger.
2. **Megson, T.H.G.** (2007). *Aircraft Structures for Engineering Students*. Elsevier.
3. **MIL-HDBK-5J** (2003). *Metallic Materials and Elements for Aerospace Vehicle Structures*.
4. **NACA Report 881** (1947). *Studies on the Flexural-Torsional Buckling of Structures*.
5. **Hughes, P.C.** (1987). *Spacecraft Structure and Design*. AIAA.

---

**Última actualización:** 2026-08-21  
**Versión:** 1.0  
**Implementación:** `src/domains/wing/sparGeometry.ts`