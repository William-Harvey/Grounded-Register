import { createHash, randomBytes } from 'node:crypto';
import { access, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  CONFIG_RELATIVE_PATH,
  DEFAULT_CONFIG
} from './constants.mjs';

export async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function findExistingProjectRoot(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    if (await exists(path.join(current, CONFIG_RELATIVE_PATH))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export async function findProjectRootForInit(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    if (await exists(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start);
    current = parent;
  }
}

export async function loadConfig(root) {
  const configPath = path.join(root, CONFIG_RELATIVE_PATH);
  const parsed = JSON.parse(await readFile(configPath, 'utf8'));
  return { ...DEFAULT_CONFIG, ...parsed };
}

export function resolveProjectPath(root, relativePath) {
  return path.resolve(root, relativePath);
}

export function isSafeRelativePath(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  if (path.isAbsolute(value)) return false;
  const normal = value.replaceAll('\\', '/');
  if (normal.split('/').includes('..')) return false;
  return !normal.startsWith('~');
}

export async function atomicWrite(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, content, 'utf8');
  await rename(temp, filePath);
}

export async function listFindingRecords(root, config) {
  const dir = resolveProjectPath(root, config.findings_path);
  if (!(await exists(dir))) return { records: [], parseErrors: [] };
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  const records = [];
  const parseErrors = [];
  for (const filename of names) {
    const fullPath = path.join(dir, filename);
    try {
      const raw = await readFile(fullPath, 'utf8');
      records.push({ filename, fullPath, finding: JSON.parse(raw), raw });
    } catch (error) {
      parseErrors.push({ filename, fullPath, message: error.message });
    }
  }
  return { records, parseErrors };
}

export function hashText(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function hashRecordMap(records) {
  return Object.fromEntries(records.map(({ filename, raw }) => [filename, hashText(raw)]));
}

export function newFindingId(date = new Date()) {
  const day = date.toISOString().slice(0, 10).replaceAll('-', '');
  return `GR-${day}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function getGitCommit(root) {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

export async function countLines(filePath) {
  const text = await readFile(filePath, 'utf8');
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}

export async function readStdinJson() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

export function pluginDataDir() {
  return process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'grounded-register-plugin-data');
}

export function safeSessionId(value) {
  return String(value || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function loadSessionState(sessionId) {
  const filePath = path.join(pluginDataDir(), 'sessions', `${safeSessionId(sessionId)}.json`);
  if (!(await exists(filePath))) return null;
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export async function saveSessionState(sessionId, state) {
  const filePath = path.join(pluginDataDir(), 'sessions', `${safeSessionId(sessionId)}.json`);
  await atomicWrite(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

export async function fileMtime(filePath) {
  try {
    return (await stat(filePath)).mtimeMs;
  } catch {
    return null;
  }
}

export function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}
