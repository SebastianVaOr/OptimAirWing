/**
 * Mission Presets — Predefined flight profiles for standard operations
 *
 * Each preset provides altitude, velocity, and expected wing loading
 * so the user doesn't need to know aerodynamic details.
 *
 * Philosophy: The user selects WHAT they want to do.
 * The software figures out HOW to fly.
 */

export interface MissionPreset {
  id: string;
  name: string;
  icon: string;
  altitude_m: number;
  velocity_m_s: number;
  wingLoading_kg_m2: number;
  CL_cruise: number;
  description: string;
  typicalUse: string;
  loadFactor_g: number;
}

export const MISSION_PRESETS: MissionPreset[] = [
  {
    id: 'recon_drone',
    name: 'Drone de Reconocimiento',
    icon: '🛸',
    altitude_m: 150,
    velocity_m_s: 15,
    wingLoading_kg_m2: 5,
    CL_cruise: 0.5,
    description: 'Vuelo bajo, velocidad moderada, prioridad endurance',
    typicalUse: 'Fotogrametría, inspección, vigilancia',
    loadFactor_g: 3.8,
  },
  {
    id: 'hale_glider',
    name: 'Planeador HALE',
    icon: '🦅',
    altitude_m: 6000,
    velocity_m_s: 30,
    wingLoading_kg_m2: 10,
    CL_cruise: 0.8,
    description: 'Alta altitud, densidad reducida, eficiencia máxima',
    typicalUse: 'Misiones de larga duración, re comunicaciones',
    loadFactor_g: 2.5,
  },
  {
    id: 'acrobatic',
    name: 'Acrobático / Carreras',
    icon: '🏎️',
    altitude_m: 100,
    velocity_m_s: 45,
    wingLoading_kg_m2: 30,
    CL_cruise: 0.3,
    description: 'Altas cargas G, estructura reforzada, respuesta rápida',
    typicalUse: 'FPV racing, acrobacias, demonstraciones',
    loadFactor_g: 6.0,
  },
  {
    id: 'cargo',
    name: 'Carga / Entrega',
    icon: '📦',
    altitude_m: 3000,
    velocity_m_s: 25,
    wingLoading_kg_m2: 50,
    CL_cruise: 0.6,
    description: 'Carga útil máxima, crucero eficiente',
    typicalUse: 'Entrega logística, transporte de carga',
    loadFactor_g: 3.0,
  },
  {
    id: 'survey_mapping',
    name: 'Cartografía / Topografía',
    icon: '🗺️',
    altitude_m: 500,
    velocity_m_s: 20,
    wingLoading_kg_m2: 8,
    CL_cruise: 0.55,
    description: 'Vuelo estable y predecible, altitud media',
    typicalUse: 'Levantamientos topográficos, agricultura de precisión',
    loadFactor_g: 3.0,
  },
  {
    id: 'maritime_patrol',
    name: 'Patrullaje Marítimo',
    icon: '🌊',
    altitude_m: 1000,
    velocity_m_s: 35,
    wingLoading_kg_m2: 15,
    CL_cruise: 0.7,
    description: 'Largo alcance, resistencia a viento marino',
    typicalUse: 'Vigilancia costera, búsqueda y rescate',
    loadFactor_g: 3.0,
  },
];

export function getPreset(id: string): MissionPreset | undefined {
  return MISSION_PRESETS.find(p => p.id === id);
}
