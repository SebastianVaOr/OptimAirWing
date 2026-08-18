import { z } from 'zod';

export const WingParamsZodSchema = z.object({
  schema_version: z.literal('1.0.0'),
  geometry: z.object({
    airfoil: z.discriminatedUnion('source', [
      z.object({
        source: z.literal('naca4'),
        naca_code: z.string().regex(/^[0-9]{4}$/, 'Código NACA debe tener exactamente 4 dígitos')
      }),
      z.object({
        source: z.literal('naca5'),
        naca_code: z.string().regex(/^[0-9]{5}$/, 'Código NACA debe tener exactamente 5 dígitos')
      }),
      z.object({
        source: z.literal('custom_csv'),
        profile_id: z.string(),
        point_count: z.number().min(20).max(400).optional()
      })
    ]),
    planform: z.object({
      span_m: z.coerce.number().min(0.1).max(80),
      root_chord_m: z.coerce.number().min(0.02).max(15),
      taper_ratio: z.coerce.number().min(0.05).max(1.0).default(1.0),
      sweep_deg: z.coerce.number().min(-60).max(60).default(0),
      twist_deg: z.coerce.number().min(-20).max(10).default(0),
      dihedral_deg: z.coerce.number().min(-10).max(15).default(0)
    })
  }),
  operating_conditions: z.object({
    alpha_deg: z.coerce.number().min(-10).max(25),
    reynolds: z.coerce.number().min(1e4).max(1e7),
    mach: z.coerce.number().min(0.05).max(3.0).default(0.05)
  }),
  ui_preferences: z
    .object({
      unit_system: z.enum(['si', 'imperial']).default('si')
    })
    .optional()
});

// Base sin refinamientos para poder usar .partial() en /optimize
export const LegacyWingPayloadSchema = z.object({
  nacaCode: z.string(),
  Cr: z.coerce.number().min(0.02),
  Ct: z.coerce.number().min(0.01),
  b: z.coerce.number().min(0.1),
  sweep_deg: z.coerce.number().min(-60).max(60),
  twist_deg: z.coerce.number().min(-20).max(10),
  alpha_deg: z.coerce.number().min(-10).max(25),
  Re: z.coerce.number().min(1e4).max(1e7).optional(),
  Mach: z.coerce.number().min(0.05).max(3.0).optional(),
  v_mps: z.coerce.number().min(0).max(500).optional(),
  // Campos multi-elemento (F1 / hidroala) que deben preservarse
  isMultiElement: z.boolean().optional(),
  numElements: z.coerce.number().int().min(1).max(3).optional(),
  flapGapMm: z.coerce.number().min(0).max(50).optional(),
  flapOverlapMm: z.coerce.number().min(0).max(50).optional(),
  flapAngleDeg: z.coerce.number().min(-60).max(60).optional()
});

// Variante con cordura geométrica (Ct ≤ Cr) para payloads completos
export const LegacyWingPayloadValidatedSchema = LegacyWingPayloadSchema.refine(
  (data) => data.Ct === undefined || data.Cr === undefined || data.Ct <= data.Cr,
  { message: 'Ct no puede exceder Cr (geometría inválida)', path: ['Ct'] }
);