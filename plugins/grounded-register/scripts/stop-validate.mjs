import path from 'node:path';
import {
  findExistingProjectRoot,
  hashRecordMap,
  listFindingRecords,
  loadConfig,
  loadSessionState,
  readStdinJson,
  saveSessionState
} from './lib/io.mjs';
import { renderProject } from './lib/project.mjs';
import { validateProject } from './lib/validate.mjs';

function feedback(message) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: message
    }
  }));
}

function totalFeedback(state) {
  return Object.values(state.feedback_counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function maySend(state, type, maxForType) {
  const counts = state.feedback_counts || {};
  return totalFeedback(state) < 4 && Number(counts[type] || 0) < maxForType;
}

async function sendFeedback(input, state, type, maxForType, message) {
  if (!maySend(state, type, maxForType)) return false;
  state.feedback_counts = {
    ...(state.feedback_counts || {}),
    [type]: Number(state.feedback_counts?.[type] || 0) + 1
  };
  await saveSessionState(input.session_id, state);
  feedback(message);
  return true;
}

const input = await readStdinJson();
const root = await findExistingProjectRoot(input.cwd || process.cwd());
if (!root) process.exit(0);

const config = await loadConfig(root);
const state = await loadSessionState(input.session_id) || {
  project_root: root,
  hashes: {},
  feedback_counts: {},
  started_at: new Date().toISOString()
};

const validation = await validateProject(root, config);
if (validation.errors.length > 0) {
  if (config.strict_stop_validation) {
    const details = validation.errors.slice(0, 12).map((entry) =>
      `- ${entry.findingId} ${entry.field}: ${entry.message}`
    ).join('\n');
    const sent = await sendFeedback(
      input,
      state,
      'validation',
      3,
      `Grounded Register validation failed. Correct the register entries before completing the task, then run /grounded-register:validate.\n\n${details}`
    );
    if (sent) process.exit(0);
  }
  process.exit(0);
}

await renderProject(root, config, validation);
const recordResult = await listFindingRecords(root, config);
const currentHashes = hashRecordMap(recordResult.records);
const baseline = state.hashes || {};
const changedFiles = Object.keys(currentHashes).filter((filename) => baseline[filename] !== currentHashes[filename]);
const removedFiles = Object.keys(baseline).filter((filename) => !(filename in currentHashes));

if (removedFiles.length > 0) {
  const sent = await sendFeedback(
    input,
    state,
    'deletion',
    3,
    `Grounded Register finding files were removed during this session: ${removedFiles.join(', ')}. Restore them and close findings through an evidence-backed status change instead of deleting their history.`
  );
  if (sent) process.exit(0);
}

const changedIds = changedFiles.map((filename) => path.basename(filename, '.json'));
const lastMessage = String(input.last_assistant_message || '');
const missingFromSummary = changedIds.filter((id) => !lastMessage.includes(id));

if (missingFromSummary.length > 0) {
  const sent = await sendFeedback(
    input,
    state,
    'disclosure',
    1,
    `Add a “Grounded Register” section to the final response. Name these added or materially updated findings: ${missingFromSummary.join(', ')}. Include title, impact, production/evaluation scope, whether work continued or stopped, and confirm that incidental findings were not fixed inline.`
  );
  if (sent) process.exit(0);
}

await saveSessionState(input.session_id, {
  ...state,
  hashes: currentHashes,
  feedback_counts: {},
  completed_at: new Date().toISOString()
});
