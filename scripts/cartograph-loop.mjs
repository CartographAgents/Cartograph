#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getCurrentBranch, getPrStatus, syncMain, deleteBranch } from './lib/git-helper.mjs';
import { loadWorkflowConfig, getWorkflowPath, toAbsolutePath } from './lib/workflow-config.mjs';
import { collectTaskFilesRecursively } from './lib/task-workflow.mjs';

const SLEEP_MS = 60000; // 1 minute sleep between checks for PR merge

function parseArgs(argv) {
    const options = {
        dryRun: false,
        maxLoops: -1, // Infinite
        autoMerge: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--dry-run') options.dryRun = true;
        else if (arg === '--max-loops') options.maxLoops = parseInt(argv[++i], 10);
        else if (arg === '--auto-merge') options.autoMerge = true;
    }
    return options;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function runCommand(command, args, options = {}) {
    console.log(`[LOOP] Running: ${command} ${args.join(' ')}`);
    const status = spawnSync(command, args, { stdio: 'inherit', ...options });
    if (status.status !== 0) {
        console.error(`[ERROR] Command failed with exit code ${status.status}`);
        if (options.allowFailure) return status;
        throw new Error(`Command ${command} failed`);
    }
    return status;
}

function getAvailableTaskCount(rootDir) {
    const config = loadWorkflowConfig(rootDir);
    const tasksRootRel = getWorkflowPath(config, 'tasks_root');
    const tasksDir = toAbsolutePath(rootDir, tasksRootRel);
    const todoDir = path.join(tasksDir, 'todo');
    
    if (!fs.existsSync(todoDir)) return 0;
    return collectTaskFilesRecursively(todoDir).length;
}

async function loop() {
    const options = parseArgs(process.argv.slice(2));
    const rootDir = process.cwd();
    let loops = 0;

    console.log('🚀 Starting Cartograph Recursive Loop...');

    // Pre-flight check: gh auth status
    const authCheck = spawnSync('gh', ['auth', 'status'], { stdio: 'pipe' });
    if (authCheck.status !== 0) {
        console.warn('\n⚠️ [WARNING] GitHub CLI (gh) is not authenticated. PR operations will fail.');
        console.warn('Please run \'gh auth login\' to authenticate.\n');
    }

    while (options.maxLoops === -1 || loops < options.maxLoops) {
        loops++;
        console.log(`\n🔄 --- Loop ${loops} ---`);

        const branch = getCurrentBranch();

        if (branch !== 'main') {
            console.log(`- Detected feature branch: ${branch}. Checking PR status...`);
            const pr = getPrStatus(branch);

            if (!pr) {
                console.log('- No PR found for current branch. Running closeout...');
                runCommand('node', ['scripts/cartograph-closeout.mjs', '--create-pr', '--non-interactive']);
                continue; // Re-check PR status in next loop
            }

            if (pr.state === 'MERGED' || pr.state === 'CLOSED') {
                console.log(`- PR is ${pr.state}. Syncing back to main...`);
                syncMain();
                deleteBranch(branch);
                continue;
            }

            console.log(`[LOOP] PR is currently ${pr.state}. URL: ${pr.url}`);
            if (options.autoMerge && pr.state === 'OPEN') {
                const checkStatus = pr.statusCheckRollup?.state;
                if (checkStatus === 'SUCCESS') {
                    console.log('[LOOP] CI passed! Attempting auto-merge...');
                    runCommand('gh', ['pr', 'merge', '--auto', '--delete-branch', '--squash']);
                } else if (checkStatus === 'FAILURE') {
                    console.log('⚠️ [ALERT] CI failed for current PR. Manual intervention likely required.');
                    break;
                } else {
                    console.log(`[LOOP] Waiting for CI... (Current status: ${checkStatus || 'PENDING'})`);
                }
            }
            
            console.log(`[LOOP] Sleeping for ${SLEEP_MS / 1000}s...`);
            await sleep(SLEEP_MS);
            continue;
        }

        // We are on main. Decide what to do next.
        const availableTasks = getAvailableTaskCount(rootDir);
        console.log(`[LOOP] On main branch. Available tasks in todo/: ${availableTasks}`);

        if (availableTasks === 0) {
            console.log('[TASK] Backlog is empty. Running Gap Analysis...');
            try {
                runCommand('node', ['scripts/cartograph-tasker.mjs']);
                console.log('\n[TASK] Switching to TASK MODE to create new work items.');
            } catch (err) {
                console.error('[ERROR] Failed to run tasker:', err.message);
            }
            // In a recursive loop, we might want to stop here so the agent can reflect/create tasks.
            break; 
        }

        console.log('[WORK] Picking a new task from the todo/ bucket...');
        try {
            const contributeArgs = ['scripts/cartograph-contribute.mjs', '--auto'];
            if (options.dryRun) contributeArgs.push('--dry-run');
            // If the loop is in dry-run/allow-dirty, assume we want sub-commands to be too
            contributeArgs.push('--allow-dirty'); 
            
            runCommand('node', contributeArgs);
            console.log('[WORK] New task branch created. Continuing execution...');
        } catch (err) {
            console.error('[ERROR] Failed to pick new task:', err.message);
            break;
        }
    }

    console.log('\n🏁 Loop execution complete.');
}

loop().catch(err => {
    console.error(`\n❌ Loop failed: ${err.message}`);
    process.exit(1);
});
