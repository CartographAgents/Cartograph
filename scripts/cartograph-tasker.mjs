#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadWorkflowConfig, getWorkflowPath, toAbsolutePath } from './lib/workflow-config.mjs';
import { collectTaskFilesRecursively } from './lib/task-workflow.mjs';
import { readMarkdownWithFrontmatter } from './lib/frontmatter.mjs';

function parseRoadmap(roadmapContent) {
    const lines = roadmapContent.split('\n');
    const items = [];
    let currentPhase = '';

    for (const line of lines) {
        if (line.startsWith('## ')) {
            currentPhase = line.replace('## ', '').trim();
        } else if (line.startsWith('* **')) {
            const title = line.match(/\* \*\*(.*?)\*\*/)[1];
            const description = line.split(': ')[1] || '';
            items.push({ phase: currentPhase, title, description });
        }
    }
    return items;
}

function analyzeBacklog(rootDir, config) {
    const tasksRootRel = getWorkflowPath(config, 'tasks_root');
    const tasksDir = toAbsolutePath(rootDir, tasksRootRel);
    const allTaskFiles = collectTaskFilesRecursively(tasksDir);
    
    const taskTitles = allTaskFiles.map(file => {
        try {
            const { frontmatter } = readMarkdownWithFrontmatter(file);
            return (frontmatter.title || '').toLowerCase();
        } catch (e) {
            return path.basename(file).toLowerCase();
        }
    });

    return taskTitles;
}

function findGaps(roadmapItems, taskTitles) {
    return roadmapItems.filter(item => {
        const itemLower = item.title.toLowerCase();
        // Simple heuristic: if any task title contains significant words from the roadmap item
        const keywords = itemLower.split(/\s+/).filter(w => w.length > 3);
        const covered = taskTitles.some(title => {
            return keywords.every(kw => title.includes(kw));
        });
        return !covered;
    });
}

function main() {
    const rootDir = process.cwd();
    const config = loadWorkflowConfig(rootDir);
    const agentPackRel = getWorkflowPath(config, 'agent_pack_root');
    const roadmapPath = toAbsolutePath(rootDir, `${agentPackRel}/00-context/roadmap.md`);

    if (!fs.existsSync(roadmapPath)) {
        console.error('Roadmap not found at:', roadmapPath);
        process.exit(1);
    }

    const roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
    const roadmapItems = parseRoadmap(roadmapContent);
    const taskTitles = analyzeBacklog(rootDir, config);

    const gaps = findGaps(roadmapItems, taskTitles);

    console.log('\n--- Cartograph Roadmap Gap Analysis ---');
    if (gaps.length === 0) {
        console.log('✅ All roadmap items appear to have corresponding tasks.');
    } else {
        console.log(`⚠️ Found ${gaps.length} roadmap items without clear tasks:`);
        gaps.forEach(gap => {
            console.log(`\n[${gap.phase}]`);
            console.log(`- Title: ${gap.title}`);
            console.log(`- Goal: ${gap.description}`);
        });
        
        console.log('\n--- Suggested Next Steps for Agent (TASK MODE) ---');
        console.log('1. Pick one of the gaps above.');
        const tasksRootRel = getWorkflowPath(config, 'tasks_root');
    console.log(`2. Create a new task file in ${tasksRootRel.replace(/\\/g, '/')}/todo/ following the template.`);
        console.log('3. Ensure the task is atomic and has clear acceptance criteria.');
    }
}

main();
