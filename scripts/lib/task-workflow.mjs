import fs from 'node:fs';
import path from 'node:path';

export const TASK_KEY_ORDER = [
  'id',
  'title',
  'type',
  'status',
  'priority',
  'owner',
  'claim_owner',
  'claim_status',
  'claim_expires_at',
  'sla_due_at',
  'depends_on',
  'acceptance_criteria',
  'last_updated',
];

export const STATUS_TRANSITIONS = {
  backlog: new Set(['backlog', 'todo', 'in_progress', 'blocked', 'cancelled']),
  todo: new Set(['todo', 'in_progress', 'blocked', 'cancelled']),
  in_progress: new Set(['in_progress', 'blocked', 'todo', 'pull_requested', 'cancelled']),
  pull_requested: new Set(['pull_requested', 'in_progress', 'blocked', 'completed', 'cancelled']),
  blocked: new Set(['blocked', 'in_progress', 'todo', 'pull_requested', 'cancelled']),
  completed: new Set(['completed']),
  done: new Set(['done', 'completed']),
  cancelled: new Set(['cancelled']),
};

export const CLAIM_TRANSITIONS = {
  unclaimed: new Set(['unclaimed', 'claimed']),
  claimed: new Set(['claimed', 'released', 'expired']),
  expired: new Set(['expired', 'unclaimed', 'claimed']),
  released: new Set(['released', 'claimed']),
};

export function collectTaskFilesRecursively(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTaskFilesRecursively(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md' && entry.name.startsWith('task-')) {
      files.push(fullPath);
    }
  }

  return files;
}


export function validateTaskUniqueness(tasksRoot) {
  const allFiles = collectTaskFilesRecursively(tasksRoot);
  const idToPaths = new Map();
  const errors = [];

  for (const filePath of allFiles) {
    const fileName = path.basename(filePath);
    const match = fileName.match(/^(task-\d+)/);
    if (match) {
      const taskId = match[1];
      if (!idToPaths.has(taskId)) {
        idToPaths.set(taskId, []);
      }
      idToPaths.get(taskId).push(filePath);
    }
  }

  const tasksDir = path.dirname(tasksRoot);
  for (const [taskId, paths] of idToPaths.entries()) {
    if (paths.length > 1) {
      errors.push(`Duplicate Task ID found for ${taskId}:\n- ${paths.map(p => path.relative(tasksDir, p)).join('\n- ')}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Task uniqueness validation failed:\n\n${errors.join('\n\n')}\n\nTasks must be MOVED across status folders, never copied.`);
  }
}

export function getTaskStatusBucket(frontmatter) {
  const status = String(frontmatter.status || '').toLowerCase();
  const claimStatus = String(frontmatter.claim_status || '').toLowerCase();

  if (status === 'completed' || status === 'done') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  if (claimStatus === 'expired') return 'claim_expired';
  if (status === 'pull_requested') return 'pull_requested';
  if (status === 'blocked') return 'blocked';
  if (status === 'in_progress') return 'in_progress';
  if (claimStatus === 'claimed') return 'claimed';
  return 'todo';
}

export function getTaskTargetPath(tasksDir, filePath, frontmatter) {
  const targetDir = path.join(tasksDir, getTaskStatusBucket(frontmatter));
  return path.join(targetDir, path.basename(filePath));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getTaskPathKind(filePath, tasksRoot) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const root = String(tasksRoot || '').replace(/\\/g, '/').replace(/\/$/, '');
  const escapedRoot = escapeRegex(root);
  const nested = new RegExp(`^${escapedRoot}/[^/]+/task-\\d+-.+\\.md$`).test(normalized);
  const flat = new RegExp(`^${escapedRoot}/task-\\d+-.+\\.md$`).test(normalized);
  return { nested, flat };
}

export function parseIsoDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}
