export type SurrogateModelType = 'custom' | 'neuralfoil' | 'empirical';

export interface SurrogateModelInfo {
  type: SurrogateModelType;
  name: string;
  caseCount?: number;
}

const USER_CUSTOM_MODELS_DB: Record<string, { name: string; caseCount: number }> = {
  default_custom: {
    name: 'Modelo Personalizado (Entrenado con 1,250 casos)',
    caseCount: 1250,
  },
};

export function getSurrogateModelInfo(
  userId?: string,
  level?: string
): SurrogateModelInfo {
  if (level === 'full_custom' || (userId && USER_CUSTOM_MODELS_DB[userId])) {
    const custom = USER_CUSTOM_MODELS_DB[userId || 'default_custom'];
    return {
      type: 'custom',
      name: custom.name,
      caseCount: custom.caseCount,
    };
  } else if (level === 'neuralfoil') {
    return {
      type: 'neuralfoil',
      name: 'NeuralFoil v2.1 (Deep Learning Aero Surrogate)',
    };
  } else {
    return {
      type: 'empirical',
      name: 'Motor Empírico OptimAirWing (Fallback/Fast)',
    };
  }
}

export function registerUserCustomModel(userId: string, caseCount: number, modelName?: string) {
  USER_CUSTOM_MODELS_DB[userId] = {
    name: modelName || `Modelo Personalizado Usuario (${caseCount} casos)`,
    caseCount,
  };
}
