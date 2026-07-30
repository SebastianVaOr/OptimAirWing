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
      span_m: z.number().min(0.1).max(80),
      root_chord_m: z.number().min(0.02).max(15),
      taper_ratio: z.number().min(0.05).max(1.0).default(1.0),
      sweep_deg: z.number().min(-20).max(60).default(0),
      twist_deg: z.number().min(-10).max(5).default(0),
      dihedral_deg: z.number().min(-10).max(15).default(0)
    })
  }),
  operating_conditions: z.object({
    alpha_deg: z.number().min(-10).max(20),
    reynolds: z.number().min(1e4).max(5e8),
    mach: z.number().min(0).max(0.6).default(0)
  }),
  ui_preferences: z
    .object({
      unit_system: z.enum(['si', 'imperial']).default('si')
    })
    .optional()
});

export const LegacyWingPayloadSchema = z.object({
  nacaCode: z.string(),
  Cr: z.number().min(0.02),
  Ct: z.number().min(0.01),
  b: z.number().min(0.1),
  sweep_deg: z.number(),
  twist_deg: z.number(),
  alpha_deg: z.number(),
  Re: z.number().optional(),
  Mach: z.number().optional()
});
