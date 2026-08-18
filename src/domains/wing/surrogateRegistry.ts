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
  } else {
    return {
      type: 'empirical',
      name: 'Modelo Empírico de Línea Sustentadora (Lifting-Line)',
    };
  }
}

export function registerUserCustomModel(userId: string, caseCount: number, modelName?: string) {
  USER_CUSTOM_MODELS_DB[userId] = {
    name: modelName || `Modelo Personalizado Usuario (${caseCount} casos)`,
    caseCount,
  };
}
