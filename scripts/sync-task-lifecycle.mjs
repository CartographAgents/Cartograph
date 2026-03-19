#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readMarkdownWithFrontmatter, writeMarkdownWithFrontmatter } from './lib/frontmatter.mjs';
import { TASK_KEY_ORDER, getTaskTargetPath } from './lib/task-workflow.mjs';
import { loadWorkflowConfig, getWorkflowPath, toAbsolutePath } from './lib/workflow-config.mjs';

function runGit(args) {
    const result = spawnSync('git', args, { encoding: 'utf8' });
    if (result.status !== 0) {
        const out = result.stderr || result.stdout;
        console.error(`git ${args.join(' ')} failed: ${out}`);
        return result;
    }
    return result;
}

function todayDateString() {
    return new Date().toISOString().slice(0, 10);
}

async function main() {
    const rootDir = process.cwd();
    const config = loadWorkflowConfig(rootDir);
    const tasksRootRel = getWorkflowPath(config, 'tasks_root');
    const tasksDir = toAbsolutePath(rootDir, tasksRootRel);
    const prDir = path.join(tasksDir, 'pull_requested');

    if (!fs.existsSync(prDir)) {
        console.log('No pull_requested directory found. Skipping.');
        return;
    }

    const files = fs.readdirSync(prDir).filter(f => f.endsWith('.md') && f !== 'README.md');

    if (files.length === 0) {
        console.log('No pull-requested tasks found.');
        return;
    }

    console.log(`Processing ${files.length} pull-requested tasks...`);

    let changed = false;
    for (const file of files) {
        const filePath = path.join(prDir, file);
        const { frontmatter, body } = readMarkdownWithFrontmatter(filePath);

        if (frontmatter.status !== 'pull_requested') {
            console.log(`Skipping ${file}: status is not pull_requested.`);
            continue;
        }

        const updated = { ...frontmatter };
        updated.status = 'completed';
        updated.claim_status = 'released';
        updated.claim_expires_at = null;
        updated.last_updated = todayDateString();

        const targetPath = getTaskTargetPath(tasksDir, filePath, updated);

        console.log(`Moving ${file} to completed...`);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        writeMarkdownWithFrontmatter(targetPath, updated, body, TASK_KEY_ORDER);
        fs.unlinkSync(filePath);

        runGit(['add', targetPath]);
        runGit(['rm', filePath]);
        changed = true;
    }

    if (changed) {
        console.log('Staging changes for commit...');
    } else {
        console.log('No changes made.');
    }

    console.log('Task lifecycle sync complete.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
