import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  addFindingFromFile,
  initialiseProject,
  renderProject
} from '../scripts/lib/project.mjs';
import { loadConfig, newFindingId } from '../scripts/lib/io.mjs';
import { validateFinding, validateProject } from '../scripts/lib/validate.mjs';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function makeProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'grounded-register-test-'));
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, 'src', 'example.js'), [
    'export function add(a, b) {',
    '  return a + b;',
    '}',
    '',
    'export const mode = "active";'
  ].join('\n'), 'utf8');
  await initialiseProject(root);
  return root;
}

function validFinding(overrides = {}) {
  const now = '2026-07-09T13:21:00.000Z';
  return {
    schema_version: 1,
    id: newFindingId(new Date('2026-07-09T12:00:00.000Z')),
    title: 'Secondary reader does not filter inactive records',
    finding_type: 'latent-bug',
    category: 'data-integrity',
    task_relationship: 'incidental',
    what: 'The secondary reader returns inactive records while the primary reader applies the active-record predicate.',
    code_paths: [
      {
        path: 'src/example.js',
        start_line: 1,
        end_line: 3,
        symbol: 'add'
      }
    ],
    impact: 'high',
    effort: 'S',
    priority: 'P1',
    status: 'spotted',
    affects: 'production',
    current_task_relation: 'Discovered while changing unrelated output formatting and is outside that task.',
    not_fixed_reason: 'The issue is out of scope and does not make the current formatting work unsafe.',
    evidence: [
      {
        type: 'code-path',
        reference: 'src/example.js:1-3',
        observation: 'The cited function demonstrates the bounded code-path condition.'
      },
      {
        type: 'reproducible-test',
        command: 'node --test test/example.test.js',
        expected: 'Only active records are returned.',
        observed: 'The inactive fixture is also returned.',
        result: 'failed',
        observation: 'The test reproduces the unexpected record selection.'
      }
    ],
    recommended_next_step: 'Scope a focused reader correction and add an active-record regression test.',
    created_at: now,
    created_by: 'claude-code',
    updated_at: now,
    resolution: null,
    ...overrides
  };
}

async function writeDraft(root, finding, name = 'draft.json') {
  const file = path.join(root, name);
  await writeFile(file, `${JSON.stringify(finding, null, 2)}\n`, 'utf8');
  return file;
}

function runHook(script, input, env = {}) {
  return spawnSync(process.execPath, [path.join(pluginRoot, 'scripts', script)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

test('initialise creates configuration and a stable empty report', async (t) => {
  const root = await makeProject();
  t.after(() => rm(root, { recursive: true, force: true }));

  const config = await loadConfig(root);
  const report = await readFile(path.join(root, config.report_path), 'utf8');

  assert.match(report, /System Risk & Improvement Register/);
  assert.match(report, /No open findings are recorded/);
});

test('valid finding is added, validated and rendered', async (t) => {
  const root = await makeProject();
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = await loadConfig(root);
  const finding = validFinding();
  const draft = await writeDraft(root, finding);

  const added = await addFindingFromFile(root, config, draft);
  assert.equal(added.finding.id, finding.id);

  const validation = await validateProject(root, config);
  assert.equal(validation.errors.length, 0);
  assert.equal(validation.findings.length, 1);

  const rendered = await renderProject(root, config);
  assert.equal(rendered.summary.open, 1);
  assert.match(rendered.report, new RegExp(finding.id));
  assert.match(rendered.report, /Secondary reader does not filter inactive records/);
});

test('validator rejects a line reference outside the file', async (t) => {
  const root = await makeProject();
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = await loadConfig(root);
  const finding = validFinding({
    code_paths: [{ path: 'src/example.js', start_line: 1, end_line: 999 }]
  });

  const result = await validateFinding(root, config, finding, `${finding.id}.json`);
  assert.ok(result.errors.some((entry) => entry.field.includes('end_line')));
});

test('P0 must be blocking and blocking must be P0', async (t) => {
  const root = await makeProject();
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = await loadConfig(root);

  const incidentalP0 = validFinding({ priority: 'P0' });
  const resultA = await validateFinding(root, config, incidentalP0, `${incidentalP0.id}.json`);
  assert.ok(resultA.errors.some((entry) => entry.field === 'task_relationship'));

  const blockingP1 = validFinding({ task_relationship: 'blocking', priority: 'P1' });
  const resultB = await validateFinding(root, config, blockingP1, `${blockingP1.id}.json`);
  assert.ok(resultB.errors.some((entry) => entry.field === 'priority'));
});

test('validator rejects likely credentials', async (t) => {
  const root = await makeProject();
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = await loadConfig(root);
  const finding = validFinding({
    what: 'The trace contains an accidentally copied credential AKIAABCDEFGHIJKLMNOP and must not be stored.'
  });

  const result = await validateFinding(root, config, finding, `${finding.id}.json`);
  assert.ok(result.errors.some((entry) => /credential|private key/i.test(entry.message)));
});

test('fixed findings require test or runtime resolution evidence', async (t) => {
  const root = await makeProject();
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = await loadConfig(root);
  const finding = validFinding({
    status: 'fixed',
    resolution: {
      summary: 'The active predicate was added.',
      verified_at: '2026-07-09T14:00:00.000Z',
      verified_by: 'reviewer',
      evidence: [
        {
          type: 'code-path',
          reference: 'src/example.js:1-3',
          observation: 'The code changed.'
        }
      ]
    }
  });

  const result = await validateFinding(root, config, finding, `${finding.id}.json`);
  assert.ok(result.errors.some((entry) => entry.field === 'resolution.evidence'));
});

test('add rolls back an invalid finding', async (t) => {
  const root = await makeProject();
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = await loadConfig(root);
  const finding = validFinding({ evidence: [] });
  const draft = await writeDraft(root, finding);

  await assert.rejects(() => addFindingFromFile(root, config, draft), /Finding is invalid/);
  const target = path.join(root, config.findings_path, `${finding.id}.json`);
  await assert.rejects(() => readFile(target, 'utf8'));
});

test('Stop hook asks Claude to disclose a newly added finding ID', async (t) => {
  const root = await makeProject();
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'grounded-register-data-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const env = { CLAUDE_PLUGIN_DATA: dataDir };
  const sessionId = 'test-session-disclosure';

  const start = runHook('session-start.mjs', {
    session_id: sessionId,
    cwd: root,
    hook_event_name: 'SessionStart'
  }, env);
  assert.equal(start.status, 0, start.stderr);
  assert.match(start.stdout, /GROUNDED REGISTER CONTRACT/);

  const config = await loadConfig(root);
  const finding = validFinding();
  const draft = await writeDraft(root, finding);
  await addFindingFromFile(root, config, draft);

  const stop = runHook('stop-validate.mjs', {
    session_id: sessionId,
    cwd: root,
    hook_event_name: 'Stop',
    stop_hook_active: false,
    last_assistant_message: 'The requested task is complete.'
  }, env);

  assert.equal(stop.status, 0, stop.stderr);
  assert.match(stop.stdout, new RegExp(finding.id));
  assert.match(stop.stdout, /Grounded Register/);

  const finalStop = runHook('stop-validate.mjs', {
    session_id: sessionId,
    cwd: root,
    hook_event_name: 'Stop',
    stop_hook_active: true,
    last_assistant_message: `Grounded Register: ${finding.id} was logged and not fixed inline.`
  }, env);
  assert.equal(finalStop.status, 0, finalStop.stderr);
  assert.equal(finalStop.stdout.trim(), '');
});

test('Stop hook detects deletion of finding history', async (t) => {
  const root = await makeProject();
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'grounded-register-data-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const env = { CLAUDE_PLUGIN_DATA: dataDir };
  const config = await loadConfig(root);
  const finding = validFinding();
  const draft = await writeDraft(root, finding);
  await addFindingFromFile(root, config, draft);

  const sessionId = 'test-session-delete';
  runHook('session-start.mjs', {
    session_id: sessionId,
    cwd: root,
    hook_event_name: 'SessionStart'
  }, env);

  await rm(path.join(root, config.findings_path, `${finding.id}.json`));

  const stop = runHook('stop-validate.mjs', {
    session_id: sessionId,
    cwd: root,
    hook_event_name: 'Stop',
    stop_hook_active: false,
    last_assistant_message: 'Done.'
  }, env);

  assert.equal(stop.status, 0, stop.stderr);
  assert.match(stop.stdout, /were removed/);
  assert.match(stop.stdout, new RegExp(finding.id));
});
