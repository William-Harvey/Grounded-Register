import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  CONFIG_RELATIVE_PATH,
  DEFAULT_CONFIG
} from './constants.mjs';
import {
  atomicWrite,
  exists,
  getGitCommit,
  listFindingRecords,
  loadConfig,
  newFindingId,
  nowIso,
  resolveProjectPath
} from './io.mjs';
import { renderReport, buildSummary } from './render.mjs';
import { validateFinding, validateProject } from './validate.mjs';

export async function initialiseProject(root, overrides = {}) {
  const configPath = path.join(root, CONFIG_RELATIVE_PATH);
  const config = { ...DEFAULT_CONFIG, ...overrides };
  let createdConfig = false;

  if (!(await exists(configPath))) {
    await atomicWrite(configPath, `${JSON.stringify(config, null, 2)}\n`);
    createdConfig = true;
  }

  const loaded = await loadConfig(root);
  const findingsDir = resolveProjectPath(root, loaded.findings_path);
  await mkdir(findingsDir, { recursive: true });
  const keepPath = path.join(findingsDir, '.gitkeep');
  if (!(await exists(keepPath))) await atomicWrite(keepPath, '');
  const ignorePath = path.join(root, '.grounded-register', '.gitignore');
  if (!(await exists(ignorePath))) await atomicWrite(ignorePath, 'drafts/\n');

  const reportResult = await renderProject(root, loaded);
  return { root, config: loaded, createdConfig, reportResult };
}

export function createFindingTemplate(root, title = 'Describe the grounded finding') {
  const id = newFindingId();
  const timestamp = nowIso();
  const commit = getGitCommit(root);
  return {
    schema_version: 1,
    id,
    title,
    finding_type: 'risk',
    category: 'correctness',
    task_relationship: 'incidental',
    what: 'Describe the observed issue and the bounded claim supported by the evidence.',
    code_paths: [
      {
        path: 'path/to/file',
        start_line: 1,
        end_line: 1,
        symbol: 'relevant_symbol',
        ...(commit ? { commit } : {})
      }
    ],
    impact: 'moderate',
    effort: 'S',
    priority: 'P2',
    status: 'spotted',
    affects: 'production',
    current_task_relation: 'Explain how this was discovered and why it is outside the requested task.',
    not_fixed_reason: 'The finding is out of scope and does not make the current work unsafe or incorrect.',
    evidence: [
      {
        type: 'code-path',
        reference: 'path/to/file:1',
        observation: 'Describe exactly what the cited code demonstrates.'
      }
    ],
    recommended_next_step: 'Scope a focused investigation or remediation with explicit acceptance criteria.',
    created_at: timestamp,
    created_by: 'claude-code',
    updated_at: timestamp,
    resolution: null
  };
}

export async function addFindingFromFile(root, config, sourcePath) {
  const absoluteSource = path.resolve(sourcePath);
  const finding = JSON.parse(await readFile(absoluteSource, 'utf8'));
  const target = resolveProjectPath(root, path.join(config.findings_path, `${finding.id}.json`));
  if (await exists(target)) throw new Error(`Finding already exists: ${finding.id}`);

  const objectValidation = await validateFinding(root, config, finding, `${finding.id}.json`);
  if (objectValidation.errors.length > 0) {
    const message = objectValidation.errors.map((entry) => `${entry.field}: ${entry.message}`).join('\n');
    throw new Error(`Finding is invalid:\n${message}`);
  }

  await atomicWrite(target, `${JSON.stringify(finding, null, 2)}\n`);
  try {
    const projectValidation = await validateProject(root, config);
    if (projectValidation.errors.length > 0) {
      throw new Error(projectValidation.errors.map((entry) => `${entry.findingId} ${entry.field}: ${entry.message}`).join('\n'));
    }
    await renderProject(root, config, projectValidation);
    return { finding, warnings: objectValidation.warnings };
  } catch (error) {
    await rm(target, { force: true });
    throw error;
  }
}

export async function renderProject(root, config, existingValidation = null) {
  const validation = existingValidation || await validateProject(root, config);
  if (validation.errors.length > 0) {
    const error = new Error('Register validation failed.');
    error.validation = validation;
    throw error;
  }
  const report = renderReport(config, validation.findings);
  const reportPath = resolveProjectPath(root, config.report_path);
  let changed = true;
  if (await exists(reportPath)) changed = (await readFile(reportPath, 'utf8')) !== report;
  if (changed) await atomicWrite(reportPath, report);
  return { changed, reportPath, report, validation, summary: buildSummary(validation.findings) };
}

export async function registerSnapshot(root, config) {
  const { records } = await listFindingRecords(root, config);
  return Object.fromEntries(records.map(({ filename, raw }) => [filename, raw]));
}
