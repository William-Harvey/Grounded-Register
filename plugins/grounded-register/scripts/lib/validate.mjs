import path from 'node:path';
import {
  AFFECTS,
  CATEGORIES,
  CLOSED_STATUSES,
  EFFORTS,
  EVIDENCE_TYPES,
  FINDING_TYPES,
  IMPACTS,
  PRIORITIES,
  REQUIRED_FIELDS,
  STATUSES,
  TASK_RELATIONSHIPS,
  TOP_LEVEL_FIELDS
} from './constants.mjs';
import {
  countLines,
  exists,
  isSafeRelativePath,
  listFindingRecords,
  resolveProjectPath
} from './io.mjs';

function issue(level, findingId, field, message, filename = '') {
  return { level, findingId: findingId || 'unknown', field, message, filename };
}

function isNonEmptyString(value, min = 1) {
  return typeof value === 'string' && value.trim().length >= min;
}

function validDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function normaliseTitle(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function containsLikelySecret(text) {
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bghp_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
    /\bsk-ant-[A-Za-z0-9_-]{20,}\b/,
    /\b(?:api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9_\-\/+=]{16,}/i
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function evidenceHasResolutionTest(resolution) {
  return Array.isArray(resolution?.evidence) && resolution.evidence.some((item) =>
    ['reproducible-test', 'runtime-observation'].includes(item?.type)
  );
}

export async function validateFinding(root, config, finding, filename = '') {
  const errors = [];
  const warnings = [];
  const id = finding?.id || filename.replace(/\.json$/i, '') || 'unknown';

  if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
    errors.push(issue('error', id, '$', 'Finding must be a JSON object.', filename));
    return { errors, warnings };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in finding)) errors.push(issue('error', id, field, 'Required field is missing.', filename));
  }
  for (const field of Object.keys(finding)) {
    if (!TOP_LEVEL_FIELDS.has(field)) warnings.push(issue('warning', id, field, 'Unknown top-level field.', filename));
  }

  if (finding.schema_version !== 1) errors.push(issue('error', id, 'schema_version', 'Must equal 1.', filename));
  if (!/^GR-\d{8}-[A-F0-9]{4}$/.test(String(finding.id || ''))) {
    errors.push(issue('error', id, 'id', 'Must match GR-YYYYMMDD-XXXX using uppercase hexadecimal.', filename));
  }
  if (filename && filename !== `${finding.id}.json`) {
    errors.push(issue('error', id, 'id', `Filename must be ${finding.id}.json.`, filename));
  }
  if (!isNonEmptyString(finding.title, 8) || finding.title.length > 140) {
    errors.push(issue('error', id, 'title', 'Must contain 8–140 characters.', filename));
  }
  if (!FINDING_TYPES.includes(finding.finding_type)) errors.push(issue('error', id, 'finding_type', 'Unsupported finding type.', filename));
  if (!CATEGORIES.includes(finding.category)) errors.push(issue('error', id, 'category', 'Unsupported category.', filename));
  if (!TASK_RELATIONSHIPS.includes(finding.task_relationship)) errors.push(issue('error', id, 'task_relationship', 'Must be incidental or blocking.', filename));
  if (!isNonEmptyString(finding.what, 20)) errors.push(issue('error', id, 'what', 'Must provide a grounded description of at least 20 characters.', filename));
  if (!IMPACTS.includes(finding.impact)) errors.push(issue('error', id, 'impact', 'Must be critical, high or moderate.', filename));
  if (!EFFORTS.includes(finding.effort)) errors.push(issue('error', id, 'effort', 'Must be S, M or L.', filename));
  if (!PRIORITIES.includes(finding.priority)) errors.push(issue('error', id, 'priority', 'Must be P0, P1, P2 or P3.', filename));
  if (!STATUSES.includes(finding.status)) errors.push(issue('error', id, 'status', 'Unsupported status.', filename));
  if (!AFFECTS.includes(finding.affects)) errors.push(issue('error', id, 'affects', 'Must be production, evaluation or both.', filename));
  if (!isNonEmptyString(finding.current_task_relation, 12)) errors.push(issue('error', id, 'current_task_relation', 'Explain how the finding relates to the current task.', filename));
  if (!isNonEmptyString(finding.not_fixed_reason, 12)) errors.push(issue('error', id, 'not_fixed_reason', 'Explain why the finding was not fixed inline.', filename));
  if (!isNonEmptyString(finding.recommended_next_step, 12)) errors.push(issue('error', id, 'recommended_next_step', 'Provide a bounded next step.', filename));
  if (!validDate(finding.created_at)) errors.push(issue('error', id, 'created_at', 'Must be a valid ISO date-time.', filename));
  if (!validDate(finding.updated_at)) errors.push(issue('error', id, 'updated_at', 'Must be a valid ISO date-time.', filename));
  if (validDate(finding.created_at) && validDate(finding.updated_at) && Date.parse(finding.updated_at) < Date.parse(finding.created_at)) {
    errors.push(issue('error', id, 'updated_at', 'Cannot be earlier than created_at.', filename));
  }
  if (!isNonEmptyString(finding.created_by, 2)) errors.push(issue('error', id, 'created_by', 'Must identify the creator.', filename));

  if (finding.priority === 'P0' && finding.task_relationship !== 'blocking') {
    errors.push(issue('error', id, 'task_relationship', 'P0 findings must be blocking.', filename));
  }
  if (finding.task_relationship === 'blocking' && finding.priority !== 'P0') {
    errors.push(issue('error', id, 'priority', 'Blocking findings must use P0.', filename));
  }
  if (finding.task_relationship === 'blocking' && finding.impact === 'moderate') {
    errors.push(issue('error', id, 'impact', 'A blocking finding cannot have moderate impact.', filename));
  }
  if (finding.impact === 'critical' && ['P2', 'P3'].includes(finding.priority)) {
    warnings.push(issue('warning', id, 'priority', 'Critical impact with a low priority requires careful justification.', filename));
  }

  const codePaths = finding.code_paths ?? [];
  if (!Array.isArray(codePaths)) {
    errors.push(issue('error', id, 'code_paths', 'Must be an array when present.', filename));
  } else {
    for (let index = 0; index < codePaths.length; index += 1) {
      const ref = codePaths[index];
      const prefix = `code_paths[${index}]`;
      if (!ref || typeof ref !== 'object') {
        errors.push(issue('error', id, prefix, 'Must be an object.', filename));
        continue;
      }
      if (!isSafeRelativePath(ref.path)) {
        errors.push(issue('error', id, `${prefix}.path`, 'Must be a repository-relative path without .. segments.', filename));
        continue;
      }
      if (!Number.isInteger(ref.start_line) || ref.start_line < 1) errors.push(issue('error', id, `${prefix}.start_line`, 'Must be a positive integer.', filename));
      if (!Number.isInteger(ref.end_line) || ref.end_line < 1) errors.push(issue('error', id, `${prefix}.end_line`, 'Must be a positive integer.', filename));
      if (Number.isInteger(ref.start_line) && Number.isInteger(ref.end_line) && ref.end_line < ref.start_line) {
        errors.push(issue('error', id, `${prefix}.end_line`, 'Cannot be earlier than start_line.', filename));
      }
      const fullPath = resolveProjectPath(root, ref.path);
      if (!(await exists(fullPath))) {
        errors.push(issue('error', id, `${prefix}.path`, `Referenced file does not exist: ${ref.path}`, filename));
      } else if (Number.isInteger(ref.end_line)) {
        const lines = await countLines(fullPath);
        if (ref.end_line > lines) errors.push(issue('error', id, `${prefix}.end_line`, `Line ${ref.end_line} exceeds file length ${lines}.`, filename));
      }
      if (config.require_commit_reference && !isNonEmptyString(ref.commit, 4)) {
        errors.push(issue('error', id, `${prefix}.commit`, 'A commit reference is required by project configuration.', filename));
      }
    }
  }

  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    errors.push(issue('error', id, 'evidence', 'At least one evidence item is required.', filename));
  } else {
    for (let index = 0; index < finding.evidence.length; index += 1) {
      const item = finding.evidence[index];
      const prefix = `evidence[${index}]`;
      if (!item || typeof item !== 'object') {
        errors.push(issue('error', id, prefix, 'Must be an object.', filename));
        continue;
      }
      if (!EVIDENCE_TYPES.includes(item.type)) errors.push(issue('error', id, `${prefix}.type`, 'Unsupported evidence type.', filename));
      if (!isNonEmptyString(item.observation, 8)) errors.push(issue('error', id, `${prefix}.observation`, 'Describe the observed evidence.', filename));
      if (item.type === 'reproducible-test') {
        if (!isNonEmptyString(item.command, 3)) errors.push(issue('error', id, `${prefix}.command`, 'A reproducible command is required.', filename));
        if (!isNonEmptyString(item.observed, 3)) errors.push(issue('error', id, `${prefix}.observed`, 'The observed result is required.', filename));
      }
      if (['trace', 'log', 'documented-invariant'].includes(item.type) && !isNonEmptyString(item.reference, 3)) {
        errors.push(issue('error', id, `${prefix}.reference`, 'A stable reference is required for this evidence type.', filename));
      }
      if (item.type === 'code-path' && codePaths.length === 0 && !isNonEmptyString(item.reference, 3)) {
        errors.push(issue('error', id, `${prefix}.reference`, 'Code-path evidence needs a reference or code_paths entry.', filename));
      }
    }
  }

  const hasGrounding = codePaths.length > 0 || (Array.isArray(finding.evidence) && finding.evidence.some((item) =>
    ['reproducible-test', 'trace', 'log', 'runtime-observation', 'documented-invariant'].includes(item?.type)
  ));
  if (!hasGrounding) errors.push(issue('error', id, 'evidence', 'Evidence must include a valid code path, test, trace, log, runtime observation or documented invariant.', filename));

  if (CLOSED_STATUSES.has(finding.status)) {
    if (!finding.resolution || typeof finding.resolution !== 'object') {
      errors.push(issue('error', id, 'resolution', `Status ${finding.status} requires a resolution object.`, filename));
    } else {
      if (!isNonEmptyString(finding.resolution.summary, 8)) errors.push(issue('error', id, 'resolution.summary', 'Resolution summary is required.', filename));
      if (!validDate(finding.resolution.verified_at)) errors.push(issue('error', id, 'resolution.verified_at', 'Valid verification date is required.', filename));
      if (!isNonEmptyString(finding.resolution.verified_by, 2)) errors.push(issue('error', id, 'resolution.verified_by', 'Verifier is required.', filename));
      if (!Array.isArray(finding.resolution.evidence) || finding.resolution.evidence.length === 0) {
        errors.push(issue('error', id, 'resolution.evidence', 'Resolution evidence is required.', filename));
      }
      if (finding.status === 'fixed' && config.require_resolution_test && !evidenceHasResolutionTest(finding.resolution)) {
        errors.push(issue('error', id, 'resolution.evidence', 'Fixed findings require test or runtime verification evidence.', filename));
      }
      if (['accepted', 'dismissed'].includes(finding.status) && !isNonEmptyString(finding.resolution.reason, 8)) {
        errors.push(issue('error', id, 'resolution.reason', `${finding.status} findings require a reason.`, filename));
      }
    }
  } else if (finding.resolution !== undefined && finding.resolution !== null) {
    warnings.push(issue('warning', id, 'resolution', 'Open findings normally use a null resolution.', filename));
  }

  const serialized = JSON.stringify(finding);
  if (containsLikelySecret(serialized)) errors.push(issue('error', id, '$', 'Possible credential or private key detected. Store references, not secrets.', filename));

  const speculative = /\b(?:maybe|might possibly|could potentially|perhaps)\b/i.test(`${finding.what || ''} ${finding.recommended_next_step || ''}`);
  const strongEvidence = Array.isArray(finding.evidence) && finding.evidence.some((item) =>
    ['reproducible-test', 'trace', 'runtime-observation'].includes(item?.type)
  );
  if (speculative && !strongEvidence) warnings.push(issue('warning', id, 'what', 'Wording appears speculative and lacks test, trace or runtime evidence.', filename));

  return { errors, warnings };
}

export async function validateProject(root, config, options = {}) {
  const { records, parseErrors } = await listFindingRecords(root, config);
  const errors = parseErrors.map((entry) => issue('error', entry.filename, '$', `Invalid JSON: ${entry.message}`, entry.filename));
  const warnings = [];
  const findings = [];

  for (const record of records) {
    if (options.id && record.finding?.id !== options.id) continue;
    const result = await validateFinding(root, config, record.finding, record.filename);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    findings.push(record.finding);
  }

  const idToFiles = new Map();
  const titleToIds = new Map();
  for (const record of records) {
    const id = record.finding?.id;
    if (id) idToFiles.set(id, [...(idToFiles.get(id) || []), record.filename]);
    const title = normaliseTitle(record.finding?.title);
    if (title) titleToIds.set(title, [...(titleToIds.get(title) || []), id || record.filename]);
  }
  for (const [id, files] of idToFiles) {
    if (files.length > 1) errors.push(issue('error', id, 'id', `Duplicate ID appears in: ${files.join(', ')}`));
  }
  for (const ids of titleToIds.values()) {
    if (ids.length > 1) warnings.push(issue('warning', ids.join(', '), 'title', 'Multiple findings have the same normalised title; check for duplicates.'));
  }

  return { errors, warnings, findings, records, parseErrors };
}
