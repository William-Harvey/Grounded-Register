import {
  IMPACT_LABELS,
  IMPACT_MARKERS,
  IMPACT_ORDER,
  OPEN_STATUSES,
  PLUGIN_VERSION,
  PRIORITY_ORDER
} from './constants.mjs';

function clean(value) {
  return String(value ?? '').trim();
}

function tableEscape(value) {
  return clean(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function titleCase(value) {
  return clean(value).replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function impactText(finding) {
  return `${IMPACT_MARKERS[finding.impact] || ''} ${IMPACT_LABELS[finding.impact] || titleCase(finding.impact)}`.trim();
}

function sortFindings(a, b) {
  const priority = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
  if (priority !== 0) return priority;
  const impact = (IMPACT_ORDER[a.impact] ?? 99) - (IMPACT_ORDER[b.impact] ?? 99);
  if (impact !== 0) return impact;
  return clean(b.updated_at).localeCompare(clean(a.updated_at));
}

function formatTimestamp(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(value)) + ' UTC';
}

function renderEvidence(item) {
  const parts = [];
  if (item.reference) parts.push(`Reference: \`${clean(item.reference)}\``);
  if (item.command) parts.push(`Command: \`${clean(item.command)}\``);
  if (item.expected) parts.push(`Expected: ${clean(item.expected)}`);
  if (item.observed) parts.push(`Observed: ${clean(item.observed)}`);
  if (item.result) parts.push(`Result: ${clean(item.result)}`);
  parts.push(clean(item.observation));
  return `- **${titleCase(item.type)}:** ${parts.join(' — ')}`;
}

function renderOpenDetail(finding) {
  const lines = [
    `### ${finding.id} — ${clean(finding.title)}`,
    '',
    '**What**',
    '',
    clean(finding.what),
    ''
  ];

  if (Array.isArray(finding.code_paths) && finding.code_paths.length > 0) {
    lines.push('**Code path**', '');
    for (const ref of finding.code_paths) {
      const symbol = ref.symbol ? ` — \`${clean(ref.symbol)}\`` : '';
      const commit = ref.commit ? ` — commit \`${clean(ref.commit)}\`` : '';
      lines.push(`- \`${clean(ref.path)}:${ref.start_line}-${ref.end_line}\`${symbol}${commit}`);
    }
    lines.push('');
  }

  lines.push(
    `**Impact:** ${impactText(finding)}  `,
    `**Effort:** ${clean(finding.effort)}  `,
    `**Priority:** ${clean(finding.priority)}  `,
    `**Status:** ${titleCase(finding.status)}  `,
    `**Affects:** ${titleCase(finding.affects)}  `,
    `**Task relationship:** ${titleCase(finding.task_relationship)}`,
    '',
    '**Relation to the current task**',
    '',
    clean(finding.current_task_relation),
    '',
    '**Evidence**',
    ''
  );

  for (const item of finding.evidence || []) lines.push(renderEvidence(item));

  lines.push(
    '',
    '**Why it was not fixed inline**',
    '',
    clean(finding.not_fixed_reason),
    '',
    '**Recommended next step**',
    '',
    clean(finding.recommended_next_step),
    '',
    `**Created:** ${formatTimestamp(finding.created_at)}  `,
    `**Updated:** ${formatTimestamp(finding.updated_at)}`,
    '',
    '---',
    ''
  );
  return lines.join('\n');
}

export function buildSummary(findings) {
  const open = findings.filter((finding) => OPEN_STATUSES.has(finding.status));
  const closed = findings.filter((finding) => !OPEN_STATUSES.has(finding.status));
  const byImpact = Object.fromEntries(['critical', 'high', 'moderate'].map((impact) => [impact, open.filter((finding) => finding.impact === impact).length]));
  const byStatus = Object.fromEntries(['spotted', 'scoped', 'planned', 'fixed', 'accepted', 'dismissed'].map((status) => [status, findings.filter((finding) => finding.status === status).length]));
  const byAffects = Object.fromEntries(['production', 'evaluation', 'both'].map((affects) => [affects, open.filter((finding) => finding.affects === affects).length]));
  return { total: findings.length, open: open.length, closed: closed.length, byImpact, byStatus, byAffects };
}

export function renderReport(config, findings) {
  const sorted = [...findings].sort(sortFindings);
  const open = sorted.filter((finding) => OPEN_STATUSES.has(finding.status));
  const closed = sorted.filter((finding) => !OPEN_STATUSES.has(finding.status));
  const immediate = open.filter((finding) => ['P0', 'P1'].includes(finding.priority));
  const summary = buildSummary(sorted);
  const latest = sorted.map((finding) => finding.updated_at).filter(Boolean).sort().at(-1);

  const lines = [
    `# ${clean(config.register_title)}`,
    '',
    '> A durable record of grounded engineering risks and improvement opportunities discovered outside the scope of the work in which they were observed. It is not the current sprint’s defect list.',
    '',
    '> **Generated file:** edit the JSON records in `.grounded-register/findings/`, then run `/grounded-register:report`.',
    '',
    `**Last finding update:** ${formatTimestamp(latest)}  `,
    `**Validated:** Yes  `,
    `**Open findings:** ${summary.open}  `,
    `**Production:** ${summary.byAffects.production}  `,
    `**Evaluation:** ${summary.byAffects.evaluation}  `,
    `**Both:** ${summary.byAffects.both}`,
    '',
    '## Executive summary',
    '',
    '| Impact | Open | Spotted | Scoped | Planned |',
    '|---|---:|---:|---:|---:|',
    `| 🔴 Critical | ${summary.byImpact.critical} | ${open.filter((f) => f.impact === 'critical' && f.status === 'spotted').length} | ${open.filter((f) => f.impact === 'critical' && f.status === 'scoped').length} | ${open.filter((f) => f.impact === 'critical' && f.status === 'planned').length} |`,
    `| 🟠 High | ${summary.byImpact.high} | ${open.filter((f) => f.impact === 'high' && f.status === 'spotted').length} | ${open.filter((f) => f.impact === 'high' && f.status === 'scoped').length} | ${open.filter((f) => f.impact === 'high' && f.status === 'planned').length} |`,
    `| 🟡 Moderate | ${summary.byImpact.moderate} | ${open.filter((f) => f.impact === 'moderate' && f.status === 'spotted').length} | ${open.filter((f) => f.impact === 'moderate' && f.status === 'scoped').length} | ${open.filter((f) => f.impact === 'moderate' && f.status === 'planned').length} |`,
    ''
  ];

  if (Array.isArray(config.quality_reference_files) && config.quality_reference_files.length > 0) {
    lines.push('**Repository quality references**', '');
    for (const ref of config.quality_reference_files) lines.push(`- \`${clean(ref)}\``);
    lines.push('');
  }

  lines.push('## Immediate attention', '');
  if (immediate.length === 0) {
    lines.push('No open P0 or P1 findings.', '');
  } else {
    lines.push('| ID | Finding | Impact | Priority | Affects | Status |', '|---|---|---|---|---|---|');
    for (const finding of immediate) {
      lines.push(`| ${finding.id} | ${tableEscape(finding.title)} | ${impactText(finding)} | ${finding.priority} | ${titleCase(finding.affects)} | ${titleCase(finding.status)} |`);
    }
    lines.push('');
  }

  lines.push('## Open findings', '');
  if (open.length === 0) {
    lines.push('No open findings are recorded.', '');
  } else {
    for (const finding of open) lines.push(renderOpenDetail(finding));
  }

  lines.push('## Closed findings', '');
  if (closed.length === 0) {
    lines.push('No fixed, accepted or dismissed findings are recorded.', '');
  } else {
    lines.push('| ID | Finding | Status | Verified | Resolution |', '|---|---|---|---|---|');
    for (const finding of closed) {
      const resolution = finding.resolution || {};
      lines.push(`| ${finding.id} | ${tableEscape(finding.title)} | ${titleCase(finding.status)} | ${tableEscape(formatTimestamp(resolution.verified_at))} | ${tableEscape(resolution.summary || resolution.reason || '')} |`);
    }
    lines.push('');
  }

  lines.push(
    '## Register controls',
    '',
    '- Grounded entries only: every finding needs a file-and-line reference, reproducible test, trace, log, runtime observation or documented invariant.',
    '- Incidental findings remain outside the current task and are not fixed inline.',
    '- Blocking findings use P0, stop the affected work and are surfaced immediately.',
    '- Closed findings retain their history and require resolution evidence.',
    '',
    `Generated by Grounded Register ${PLUGIN_VERSION}.`,
    ''
  );

  return lines.join('\n');
}
