export interface TestCase {
  case_id: string;
  symptom: string;
  topology_note: string;
  show_outputs: string;
  expected_fault: string;
  osi_layer: string;
  concept_tag: string;
  severity: "High" | "Medium" | "Low" | string;
}

export interface DiagnosisResult {
  root_cause: string;
  osi_layer: string;
  confidence: "High" | "Medium" | "Low" | string;
  evidence: string;
  next_command: string;
  fix_steps: string[];
  source: "rule" | "ai";
  engine_note?: string;
  execution_time_ms?: number;
  rule_name?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  caseId: string;
  source: "RULE" | "AI";
  decision: "APPROVED" | "EDITED" | "REJECTED";
  agreed: boolean;
  suggestedFix: string[];
  finalCommands: string[];
  editsApplied?: string;
  note?: string;
}

export interface ResponsibleAILogItem {
  caseId: string;
  layer: string;
  aiProposed: string;
  humanCorrection: string;
  rationale: string;
}

export interface FilterState {
  search: string;
  layer: string;
  severity: string;
  conceptTag: string;
}
