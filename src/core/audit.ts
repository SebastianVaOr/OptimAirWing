export interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'optimization' | 'prediction' | 'param_change' | 'snapshot_save' | 'snapshot_restore' | 'export_step' | 'review_approve' | 'review_reject';
  description: string;
  params_snapshot: Record<string, number | string>;
  user?: string;
  metadata?: Record<string, unknown>;
}

const auditLog: AuditEntry[] = [];

export function pushAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  if (auditLog.length > 1000) auditLog.shift();
  return full;
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

export function getAuditLogByAction(action: AuditEntry['action']): AuditEntry[] {
  return auditLog.filter(e => e.action === action);
}

export function exportAuditCSV(): string {
  const header = 'id,timestamp,action,description,params';
  const rows = auditLog.map(e =>
    `${e.id},${e.timestamp},${e.action},"${e.description}","${JSON.stringify(e.params_snapshot)}"`
  );
  return [header, ...rows].join('\n');
}
