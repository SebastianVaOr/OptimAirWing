# OPTIMAIRWING — AERODYNAMIC DESIGN & OPTIMIZATION PLATFORM
> **Plataforma Industrial de Análisis Aerodinámico (modelo empírico de línea sustentadora), Optimización Genética Multi-Dominio y Exportación CAD/PDF**

---

## 📖 TABLA DE CONTENIDOS
1. [Resumen y Novedades](#1-resumen-y-novedades)
2. [Manual de Usuario](#2-manual-de-usuario)
   - [2.1 Pantalla de Inicio / Landing Page](#21-pantalla-de-inicio--landing-page)
   - [2.2 Selección de Dominio de Vehículo (Aeronáutica, F1, Hydrofoil)](#22-selección-de-dominio-de-vehículo-aeronáutica-f1-hydrofoil)
   - [2.3 Panel de Geometría y Parámetros Alares](#23-panel-de-geometría-y-parámetros-alares)
   - [2.4 Visualizador 3D Interactivo y Controles de Flujo](#24-visualizador-3d-interactivo-y-controles-de-flujo)
   - [2.5 Módulo de Optimización Genética Técnico-Económica](#25-módulo-de-optimización-genética-técnico-económica)
   - [2.6 Centro de Descargas y Exportación de Ingeniería](#26-centro-de-descargas-y-exportación-de-ingeniería)
   - [2.7 Herramientas Avanzadas: Comparador A/B, Diseñador NACA y Polares](#27-herramientas-avanzadas-comparador-ab-diseñador-naca-y-polares)
3. [Informe Técnico y Arquitectura del Sistema](#3-informe-técnico-y-arquitectura-del-sistema)
   - [3.1 Arquitectura de Software](#31-arquitectura-de-software)
   - [3.2 Modelo Aerodinámico y Física de Fluidos](#32-modelo-aerodinámico-y-física-de-fluidos)
   - [3.3 Algoritmo Genético Multi-Criterio](#33-algoritmo-genético-multi-criterio)
   - [3.4 Formatos de Exportación e Integración CAD/CFD](#34-formatos-de-exportación-e-integración-cadcfd)

---

# 1. RESUMEN Y NOVEDADES

OptimAirWing es una plataforma de ingeniería computacional aeronáutica y automotriz diseñada para el análisis y optimización de componentes sustentadores.

### 🌟 Novedades Destacadas en esta Versión:
- **Centro de Descargas y Exportación**: Un modal unificado accesible desde la barra superior y el panel de resultados para exportar:
  - **Modelos CAD 3D STEP (.stp)** en formato neutro ISO 10303.
  - **Scripts Python (.py)** para automatización de recubrimientos (Loft Surface API) en SolidWorks, Fusion360 y Ansys SpaceClaim.
  - **Informes Técnicos PDF** formateados para impresión e ingeniería.
  - **Tablas de Telemetría y Polares (CSV)** con barrido de ángulo de ataque $\alpha$.
  - **Snapshots JSON** de estado y parámetros.
- **Corrección Ergónoma de Interfaz**: Se ha reestructurado la capa de avisos legales para apilarse de forma limpia sobre el panel de túnel de viento sin sobreponerse al botón de pausa ni a los controles de velocidad.
- **Física Multi-Dominio**: Modos dedicados para Aeronaves, F1 Motorsport (carga downforce y efecto suelo) e Hydrofoil Náutico (cavitación y despegue de casco).
- **Herramientas de Análisis**: Comparador A/B Multi-Diseño, Diseñador/Morphing NACA y Dashboard de Polares Aerodinámicas.

---

# 2. MANUAL DE USUARIO

## 2.1 Pantalla de Inicio / Landing Page
Acceso directo a la presentación institucional de OptimAirWing con indicadores de eficiencia en tiempo real, catálogo de sectores (UAVs, Planeadores, Comerciales, eVTOLs, F1, Hydrofoils) y accesos directos al simulador 3D.

---

## 2.2 Selección de Dominio de Vehículo
Permite alternar entre tres categorías físicas principales desde el panel lateral:
1. **Aeronáutica General & UAVs**: Cálculo estándar de sustentación, resistencia inducida y eficiencia $L/D$.
2. **F1 & Motorsport Aerodynamics**: Cálculo de *Downforce* (kgf), resistencia *Drag* (kgf) y efecto suelo por altura de *ride height*.
3. **Hydrofoil Náutico**: Cálculo de sustentación hidrodinámica en agua de mar y evaluación del riesgo de cavitación ($\sigma$).

---

## 2.3 Panel de Geometría y Parámetros Alares
Ajuste en tiempo real de:
- **Geometría Principal**: Envergadura ($b$), Cuerda Raíz ($C_r$), Cuerda Punta ($C_t$), Ángulo de Flecha ($Sweep$) y Torsión Geométrica ($Twist$).
- **Perfil NACA de 4 Dígitos**: Modificación de curvatura, posición de flecha y espesor relativo.
- **Condiciones Operativas**: Ángulo de ataque ($\alpha$), Altitud ($h$) y Número de Mach ($M$).

---

## 2.4 Visualizador 3D Interactivo y Controles de Flujo
- **Visualización 3D**: Renderizado en Three.js con rotación orbital, zoom e iluminación dinámica.
- **Modos de Flujo**:
  - **Humo**: Partículas animadas de corrientes aerodinámicas con deflexión sobre el perfil.
  - **Mapa $C_p$**: Distribución térmica de presión sobre intradós y extradós.
  - **Vórtices**: Representación de vórtices de punta alar.
- **Panel Túnel de Viento**: Control de pausa/reanudación de simulación y deslizador de velocidad del viento (m/s y km/h).

---

## 2.5 Módulo de Optimización Genética Técnico-Económica
Ejecuta un Algoritmo Genético de Selección por Torneo con 8 alelos para encontrar la mejor geometría según el criterio seleccionado (Máxima Eficiencia $L/D$, Mínimo Peso o Balance Técnico-Económico), respetando presupuestos y restricciones estructurales.

---

## 2.6 Centro de Descargas y Exportación de Ingeniería
Accediendo al botón **"Descargar"** en la barra superior o **"Exportar"** en el panel de resultados, el usuario puede descargar instantáneamente:
1. **CAD 3D STEP (`.stp`)**: Geometría solida reutilizable en software de CAD industrial.
2. **Script Python (`.py`)**: Automatización para generación de curvas Loft en SolidWorks o Fusion 360.
3. **Informe PDF**: Resumen ejecutivo con ficha técnica y polares listo para imprimir.
4. **Datos CSV**: Tabla de datos telemétricos y barrido de ángulos de ataque.
5. **Configuración JSON**: Estado completo de parámetros para importar o guardar.

---

## 2.7 Herramientas Avanzadas
- **Comparador A/B**: Compare la geometría actual con soluciones guardadas o la mejor del optimizador en un lienzo 2D/3D superpuesto.
- **Diseñador y Morphing NACA**: Ajuste deslizadores de arqueamiento y espesor con vista previa en tiempo real de puntos generados.
- **Dashboard de Polares**: Gráficas interactivas de $C_L$ vs $\alpha$, $C_D$ vs $\alpha$, curva $L/D$ y margen de pérdida ($\alpha_{stall}$).

---

# 3. INFORME TÉCNICO Y ARQUITECTURA DEL SISTEMA

## 3.1 Arquitectura de Software
- **Frontend Core**: React 18 con TypeScript estricto y Vite.
- **Motor 3D**: Three.js para renderizado acelerado por GPU.
- **Visualización de Datos**: Recharts y D3 para polares e histogramas.
- **Estilos**: Tailwind CSS con paleta técnica optimizada.

---

## 3.2 Modelo Aerodinámico y Física de Fluidos
El cálculo aerodinámico combina el modelo de **Línea Portante de Prandtl** con correcciones de Helmbold para alas trapezoidales de bajo alargamiento y modelos empíricos para perfiles NACA 4-digit:

$$\text{Superficie Alar } S = b \cdot \frac{C_r + C_t}{2}$$
$$\text{Alargamiento } AR = \frac{b^2}{S}$$
$$C_L = a_0 \cdot \left( \alpha + \alpha_{\text{twist}} - \alpha_0 \right) \cdot \left( \frac{AR}{AR + 2 \cdot \frac{AR + 4}{AR + 2}} \right)$$
$$C_D = C_{D0} + \frac{C_L^2}{\pi \cdot AR \cdot e}$$

---

## 3.3 Formatos de Exportación e Integración CAD/CFD
Los archivos STEP generados cumplen con la especificación ISO 10303-21 (`AUTOMOTIVE_DESIGN`), permitiendo la importación directa en entornos de mallado CFD como Ansys Fluent, OpenFOAM o Siemens STAR-CCM+.
