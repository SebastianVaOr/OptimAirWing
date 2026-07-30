import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors';

function parseZodIssues(error: ZodError): any[] {
  try {
    return JSON.parse(error.message);
  } catch {
    return [{ message: error.message }];
  }
}

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = parseZodIssues(result.error);
      throw new ValidationError(issues[0]?.message || 'Datos inválidos', issues);
    }
    req[source] = result.data;
    next();
  };
}

export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = parseZodIssues(result.error);
    throw new ValidationError(issues[0]?.message || 'Datos inválidos', issues);
  }
  return result.data;
}
