import { readStdinJson } from './lib/io.mjs';

await readStdinJson();

const policy = `This project uses the Grounded Register contract. Stay within the delegated task. If you identify a material, evidence-backed issue outside that task, do not fix it. Return a GROUNDED_REGISTER_CANDIDATE block to the parent containing: title; what; exact file:line, trace or reproducible test; impact; production/evaluation scope; and why it is outside scope. If it makes the delegated work unsafe or incorrect, label it BLOCKING and stop the affected work. Do not report speculation or generic advice.`;

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SubagentStart',
    additionalContext: policy
  }
}));
