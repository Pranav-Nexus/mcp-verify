export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  ruleId: string;
  ruleName: string;
  severity: DiagnosticSeverity;
  message: string;
  recommendation: string;
  paramName?: string;
}

export interface ToolReport {
  name: string;
  description: string;
  score: number; // 0 - 100
  diagnostics: Diagnostic[];
  isDestructive: boolean;
}

export interface ServerInfo {
  name?: string;
  version?: string;
  transport: 'stdio';
  toolCount: number;
}

export interface VerificationReport {
  server: ServerInfo;
  tools: ToolReport[];
  overallScore: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfos: number;
  passed: boolean;
}

export interface LinterOptions {
  strict?: boolean;
  minDescriptionLength?: number;
  requireParamDescriptions?: boolean;
  checkDestructiveGuards?: boolean;
}
