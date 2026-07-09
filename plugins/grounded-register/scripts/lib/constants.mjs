export const PLUGIN_VERSION = '0.1.0';
export const CONFIG_RELATIVE_PATH = '.grounded-register/config.json';
export const DEFAULT_CONFIG = Object.freeze({
  schema_version: 1,
  register_title: 'System Risk & Improvement Register',
  findings_path: '.grounded-register/findings',
  report_path: 'docs/system-risk-improvement-register.md',
  strict_stop_validation: true,
  require_commit_reference: false,
  require_resolution_test: true,
  quality_reference_files: []
});

export const FINDING_TYPES = ['risk', 'improvement', 'limitation', 'latent-bug'];
export const CATEGORIES = [
  'correctness',
  'data-integrity',
  'security',
  'privacy',
  'compliance',
  'reliability',
  'performance',
  'observability',
  'maintainability',
  'genericity',
  'multilingual',
  'evaluation',
  'testing',
  'accessibility',
  'developer-experience',
  'other'
];
export const TASK_RELATIONSHIPS = ['incidental', 'blocking'];
export const IMPACTS = ['critical', 'high', 'moderate'];
export const EFFORTS = ['S', 'M', 'L'];
export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
export const STATUSES = ['spotted', 'scoped', 'planned', 'fixed', 'accepted', 'dismissed'];
export const AFFECTS = ['production', 'evaluation', 'both'];
export const EVIDENCE_TYPES = [
  'code-path',
  'reproducible-test',
  'trace',
  'log',
  'runtime-observation',
  'documented-invariant'
];
export const OPEN_STATUSES = new Set(['spotted', 'scoped', 'planned']);
export const CLOSED_STATUSES = new Set(['fixed', 'accepted', 'dismissed']);
export const IMPACT_MARKERS = Object.freeze({
  critical: '🔴',
  high: '🟠',
  moderate: '🟡'
});
export const IMPACT_LABELS = Object.freeze({
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate'
});
export const IMPACT_ORDER = Object.freeze({ critical: 0, high: 1, moderate: 2 });
export const PRIORITY_ORDER = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3 });

export const TOP_LEVEL_FIELDS = new Set([
  'schema_version',
  'id',
  'title',
  'finding_type',
  'category',
  'task_relationship',
  'what',
  'code_paths',
  'impact',
  'effort',
  'priority',
  'status',
  'affects',
  'current_task_relation',
  'not_fixed_reason',
  'evidence',
  'recommended_next_step',
  'created_at',
  'created_by',
  'updated_at',
  'resolution'
]);

export const REQUIRED_FIELDS = [
  'schema_version',
  'id',
  'title',
  'finding_type',
  'category',
  'task_relationship',
  'what',
  'impact',
  'effort',
  'priority',
  'status',
  'affects',
  'current_task_relation',
  'not_fixed_reason',
  'evidence',
  'recommended_next_step',
  'created_at',
  'created_by',
  'updated_at'
];
