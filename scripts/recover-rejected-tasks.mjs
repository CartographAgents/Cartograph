#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readMarkdownWithFrontmatter, writeMarkdownWithFrontmatter } from './lib/frontmatter.mjs';
import {
    TASK_KEY_ORDER,
    collectTaskFilesRecursively,
} from './lib/task-workflow.mjs';
import {
    loadWorkflowConfig,
    getWorkflowPath,
    toAbsolutePath,
} from './lib/workflow-config.mjs';

function formatTimestampWithOffset(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteOffsetMinutes = Math.abs(offsetMinutes);
    const offsetHours = pad(Math.floor(absoluteOffsetMinutes / 60));
    const offsetRemainderMinutes = pad(absoluteOffsetMinutes % 60);

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainderMinutes}`;
}

async function main() {
    const rootDir = process.cwd();
    const config = loadWorkflowConfig(rootDir);
    const tasksRootRel = getWorkflowPath(config, 'tasks_root');
    const stateRootRel = getWorkflowPath(config, 'state_root');
    const tasksDir = toAbsolutePath(rootDir, tasksRootRel);
    const progressLogPath = toAbsolutePath(rootDir, path.join(stateRootRel, 'progress-log.md'));

    const branchName = process.env.PR_HEAD_REF || '';
    const prNumber = process.env.PR_NUMBER || 'UNKNOWN';
    const prUrl = process.env.PR_URL || '';

    if (!branchName) {
        throw new Error('PR_HEAD_REF environment variable is required.');
    }

    const idMatches = branchName.match(/(task|bug|spike|feature)-\d+/g) || [];
    const taskIds = [...new Set(idMatches)];

    if (taskIds.length === 0) {
        console.log(`- No task IDs found in branch name: ${branchName}. Skipping recovery.`);
        return;
    }

    console.log(`[RECOVERY] Identified task IDs for recovery: ${taskIds.join(', ')}`);

    const allTasks = collectTaskFilesRecursively(tasksDir);
    let recoveredCount = 0;

    for (const taskId of taskIds) {
        const taskPath = allTasks.find(t => path.basename(t).startsWith(`${taskId}-`));
        if (!taskPath) {
            console.warn(`- Task file for ${taskId} not found in backlog. Skipping.`);
            continue;
        }

        const relPath = path.relative(rootDir, taskPath).replace(/\\/g, '/');
        const { frontmatter, body } = readMarkdownWithFrontmatter(taskPath);

        if (frontmatter.status !== 'pull_requested') {
            console.log(`- Task ${taskId} is currently ${frontmatter.status}, not pull_requested. Skipping recovery to avoid overwriting progress.`);
            continue;
        }

        console.log(`- Recovering ${taskId} from ${relPath}...`);

        const updated = {
            ...frontmatter,
            status: 'todo',
            claim_owner: null,
            claim_status: 'released',
            claim_expires_at: null,
            last_updated: new Date().toISOString().slice(0, 10),
        };

        const targetDir = path.join(tasksDir, 'todo');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const targetPath = path.join(targetDir, path.basename(taskPath));

        writeMarkdownWithFrontmatter(targetPath, updated, body, TASK_KEY_ORDER);
        
        if (targetPath !== taskPath) {
            fs.unlinkSync(taskPath);
            console.log(`  Moved to: ${path.relative(rootDir, targetPath).replace(/\\/g, '/')}`);
        }

        // Update progress log
        if (fs.existsSync(progressLogPath)) {
            const logContent = fs.readFileSync(progressLogPath, 'utf8');
            const prReference = prUrl ? `[PR #${prNumber}](${prUrl})` : `PR #${prNumber}`;
            const entryLines = [
                `- ${formatTimestampWithOffset()} | \`${taskId}\` | \`todo\` | Recovered to backlog after ${prReference} closed without merge.`,
                '  - Evidence:',
                `    - \`${path.relative(rootDir, targetPath).replace(/\\/g, '/')}\``,
                `  - Next step: Available for re-claiming. Check original PR for rejection feedback.`,
            ];
            const entryBlock = `${entryLines.join('\n')}\n`;
            
            if (logContent.includes('## Latest Entries')) {
                const updatedLog = logContent.replace(/(## Latest Entries\r?\n)/, `$1${entryBlock}`);
                fs.writeFileSync(progressLogPath, updatedLog, 'utf8');
                console.log(`  Appended recovery entry to progress-log.md`);
            }
        }

        recoveredCount++;
    }

    if (recoveredCount > 0) {
        console.log(`\n[SUCCESS] Successfully recovered ${recoveredCount} task(s).`);
    } else {
        console.log(`\n[SKIP] No tasks required recovery.`);
    }
}

main().catch(err => {
    console.error(`\n[ERROR] Recovery failed: ${err.message}`);
    process.exit(1);
});
