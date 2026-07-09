import {
  findExistingProjectRoot,
  hashRecordMap,
  listFindingRecords,
  loadConfig,
  readStdinJson,
  saveSessionState
} from './lib/io.mjs';
import { validateProject } from './lib/validate.mjs';

const input = await readStdinJson();
const cwd = input.cwd || process.cwd();
const root = await findExistingProjectRoot(cwd);

let status = 'This repository is not initialised. If an eligible finding is discovered, invoke the initialise skill before capturing it.';
let hashes = {};
let openCount = 0;

if (root) {
  try {
    const config = await loadConfig(root);
    const records = await listFindingRecords(root, config);
    hashes = hashRecordMap(records.records);
    const validation = await validateProject(root, config);
    openCount = validation.findings.filter((finding) => ['spotted', 'scoped', 'planned'].includes(finding.status)).length;
    status = `Register: ${config.report_path}. Open findings: ${openCount}. Validation errors at session start: ${validation.errors.length}.`;
  } catch (error) {
    status = `Grounded Register exists but could not be read: ${error.message}`;
  }
}

await saveSessionState(input.session_id, {
  project_root: root,
  hashes,
  feedback_counts: {},
  started_at: new Date().toISOString()
});

const policy = `GROUNDED REGISTER CONTRACT

${status}

While completing the current task, capture any important observation that is outside the requested scope, materially affects correctness, reliability, security, data integrity, performance, observability, maintainability, evaluation quality, genericity or multilingual operation, and is supported by a file-and-line reference, trace, log, runtime observation, documented invariant or reproducible test.

Do not log speculation, generic best-practice suggestions, personal preferences, ordinary in-scope work or duplicate manifestations of the same root cause.

For an eligible incidental finding: search the register for duplicates; invoke grounded-register:capture; record the complete evidence; do not fix it inline; continue the requested task.

If the finding makes the current work unsafe, invalid or materially incorrect: classify it as blocking P0; record it; stop the affected work; surface it immediately.

At task completion, name every finding added or materially updated. Say “no new entries were logged” when applicable. Never claim that no other risks exist merely because no entries were created.`;

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: policy
  }
}));
