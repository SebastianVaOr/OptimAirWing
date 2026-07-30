import { db } from './store';
import type { Organization, PlanTier, StoredRefreshToken } from './store';
import { logger } from '../lib/logger';
import { NotFoundError } from '../lib/errors';

export class UserRepo {
  findByEmail(email: string) {
    return db.findUserByEmail(email);
  }

  create(orgId: string, email: string, passwordHash: string) {
    return db.createUser(orgId, email, passwordHash);
  }
}

export class OrgRepo {
  get(id: string): Organization {
    const org = db.getOrg(id);
    if (!org) throw new NotFoundError('Organización');
    return org;
  }

  setPlan(orgId: string, plan: PlanTier, changedBy = 'system') {
    return db.setOrgPlan(orgId, plan, changedBy);
  }

  incrementPredictions(orgId: string) {
    const org = this.get(orgId);
    db.updateOrg(orgId, { predictions_used_month: org.predictions_used_month + 1 });
  }

  incrementOptimizations(orgId: string) {
    const org = this.get(orgId);
    db.updateOrg(orgId, { optimizations_used_month: org.optimizations_used_month + 1 });
  }
}

export class DesignRepo {
  save(orgId: string, userId: number | undefined, name: string, params: any, result?: any) {
    return db.saveDesign(orgId, userId, name, params, result);
  }

  list(orgId: string) {
    return db.listDesigns(orgId);
  }
}

export class TokenRepo {
  save(orgId: string, tokenHash: string, expiresAt: string) {
    db.saveRefreshToken(orgId, tokenHash, expiresAt);
  }

  get(tokenHash: string): StoredRefreshToken | undefined {
    return db.getRefreshToken(tokenHash);
  }

  delete(tokenHash: string) {
    db.deleteRefreshToken(tokenHash);
  }
}
