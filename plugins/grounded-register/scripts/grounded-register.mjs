#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  findExistingProjectRoot,
  findProjectRootForInit,
  loadConfig,
  newFindingId,
  resolveProjectPath
} from './lib/io.mjs';
import {
  addFindingFromFile,
  createFindingTemplate,
  initialiseProject,
  renderProject
} from './lib/project.mjs';
import { renderReport, buildSummary } from './lib/render.mjs';
import { validateProject } from './lib/validate.mjs';

function option(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function printIssues(validation) {
  for (const entry of validation.errors) {
    console.error(`ERROR ${entry.findingId} ${entry.field}: ${entry.message}`);
  }
  for (const entry of validation.warnings) {
    console.warn(`WARN  ${entry.findingId} ${entry.field}: ${entry.message}`);
  }
}

function printHelp() {
  console.log(`Grounded Register CLI

Usage:
  grounded-register.mjs init [--root PATH]
  grounded-register.mjs new-id
  grounded-register.mjs template [--root PATH] [--title TEXT]
  grounded-register.mjs add --file PATH [--root PATH]
  grounded-register.mjs validate [--id ID] [--root PATH] [--json]
  grounded-register.mjs render [--root PATH]
  grounded-register.mjs summary [--root PATH] [--json]
  grounded-register.mjs list [--root PATH]
  grounded-register.mjs doctor [--root PATH]
`);
}

async function requireRoot(start) {
  const root = await findExistingProjectRoot(start);
  if (!root) throw new Error('Grounded Register is not initialised. Run /grounded-register:initialise first.');
  return root;
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);
  const start = path.resolve(option(args, '--root', process.cwd()));

  if (['help', '--help', '-h'].includes(command)) {
    printHelp();
    return;
  }

  if (command === 'new-id') {
    console.log(newFindingId());
    return;
  }

  if (command === 'init') {
    const root = await findProjectRootForInit(start);
    const result = await initialiseProject(root);
    console.log(`${result.createdConfig ? 'Initialised' : 'Found'} Grounded Register at ${root}`);
    console.log(`Report: ${result.reportResult.reportPath}`);
    return;
  }

  if (command === 'template') {
    const root = await findProjectRootForInit(start);
    const title = option(args, '--title', 'Describe the grounded finding');
    console.log(JSON.stringify(createFindingTemplate(root, title), null, 2));
    return;
  }

  const root = await requireRoot(start);
  const config = await loadConfig(root);

  if (command === 'add') {
    const file = option(args, '--file');
    if (!file) throw new Error('--file is required.');
    const result = await addFindingFromFile(root, config, file);
    console.log(`Added ${result.finding.id}: ${result.finding.title}`);
    for (const warning of result.warnings) console.warn(`WARN ${warning.field}: ${warning.message}`);
    return;
  }

  if (command === 'validate') {
    const id = option(args, '--id');
    const result = await validateProject(root, config, { id });
    if (args.includes('--json')) {
      console.log(JSON.stringify({
        valid: result.errors.length === 0,
        errors: result.errors,
        warnings: result.warnings,
        findings: result.findings.length
      }, null, 2));
    } else {
      printIssues(result);
      console.log(`Validated ${result.findings.length} finding(s): ${result.errors.length} error(s), ${result.warnings.length} warning(s).`);
    }
    if (result.errors.length > 0) process.exitCode = 1;
    return;
  }

  if (command === 'render') {
    const result = await renderProject(root, config);
    console.log(`${result.changed ? 'Updated' : 'Verified'} ${result.reportPath}`);
    console.log(`${result.summary.open} open, ${result.summary.closed} closed.`);
    return;
  }

  if (command === 'summary') {
    const result = await validateProject(root, config);
    if (result.errors.length > 0) {
      printIssues(result);
      process.exitCode = 1;
      return;
    }
    const summary = buildSummary(result.findings);
    if (args.includes('--json')) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`Open: ${summary.open}`);
      console.log(`Critical: ${summary.byImpact.critical}`);
      console.log(`High: ${summary.byImpact.high}`);
      console.log(`Moderate: ${summary.byImpact.moderate}`);
      console.log(`Production: ${summary.byAffects.production}`);
      console.log(`Evaluation: ${summary.byAffects.evaluation}`);
      console.log(`Both: ${summary.byAffects.both}`);
    }
    return;
  }

  if (command === 'list') {
    const result = await validateProject(root, config);
    for (const finding of result.findings.sort((a, b) => a.id.localeCompare(b.id))) {
      console.log(`${finding.id}\t${finding.priority}\t${finding.status}\t${finding.title}`);
    }
    if (result.errors.length > 0) process.exitCode = 1;
    return;
  }

  if (command === 'doctor') {
    const result = await validateProject(root, config);
    printIssues(result);
    const expected = renderReport(config, result.findings);
    const reportPath = resolveProjectPath(root, config.report_path);
    let drift = true;
    try {
      drift = (await readFile(reportPath, 'utf8')) !== expected;
    } catch {
      drift = true;
    }
    console.log(`Project root: ${root}`);
    console.log(`Node: ${process.version}`);
    console.log(`Findings: ${result.findings.length}`);
    console.log(`Report drift: ${drift ? 'yes' : 'no'}`);
    console.log(`Validation: ${result.errors.length === 0 ? 'pass' : 'fail'}`);
    if (result.errors.length > 0 || drift) process.exitCode = 1;
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  if (error.validation) printIssues(error.validation);
  console.error(error.message);
  process.exitCode = 1;
});
