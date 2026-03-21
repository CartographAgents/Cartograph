#!/usr/bin/env node
/**
 * Mission Pack Integrity Validator (CLI)
 * Mirror of the Frontend validationService.js logic.
 * Ensures an exported or in-progress mission pack is "Agent Ready".
 */
import fs from 'node:fs';
import path from 'node:path';
import { readMarkdownWithFrontmatter } from './lib/frontmatter.mjs';

const CRITICAL_PILLARS = ['Frontend', 'Backend', 'Data'];
const MIN_DESCRIPTION_WORDS = 10;

function parseArgs(argv) {
    const options = {
        path: 'agent-pack',
        strict: false
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--path') options.path = argv[++i];
        else if (arg === '--strict') options.strict = true;
    }
    return options;
}

function getWordCount(text) {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function validatePillars(rootDir) {
    const errors = [];
    const warnings = [];
    
    // Find architecture/system overview or individual pillar files
    const archDir = path.join(rootDir, '01-architecture');
    if (!fs.existsSync(archDir)) {
        errors.push('Missing 01-architecture directory.');
        return { errors, warnings };
    }

    const files = fs.readdirSync(archDir).filter(f => f.endsWith('.md'));
    const pillarContent = files.map(f => fs.readFileSync(path.join(archDir, f), 'utf8')).join('\n');
    const combinedText = pillarContent.toLowerCase();

    // 1. Critical Pillars Check
    CRITICAL_PILLARS.forEach(pillar => {
        if (!combinedText.includes(pillar.toLowerCase())) {
            errors.push(`Missing critical pillar coverage for: "${pillar}" in 01-architecture.`);
        }
    });

    // 2. Individual Pillar Quality (Heuristic: Top-level files in 01-architecture are pillars)
    files.forEach(file => {
        let body = '';
        try {
            const result = readMarkdownWithFrontmatter(path.join(archDir, file));
            body = result.body;
        } catch {
            // Fallback for plain markdown
            body = fs.readFileSync(path.join(archDir, file), 'utf8');
        }
        const wordCount = getWordCount(body);
        if (wordCount < MIN_DESCRIPTION_WORDS) {
            warnings.push(`Pillar "${file}" has a thin description (${wordCount}/${MIN_DESCRIPTION_WORDS} words).`);
        }
    });

    // 3. Pending Decisions Check
    const tasksDir = path.join(rootDir, '04-task-system', 'tasks');
    if (fs.existsSync(tasksDir)) {
        const traverseTasks = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    traverseTasks(fullPath);
                } else if (entry.name.endsWith('.md')) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('[BLOCKER]') || content.includes('[PENDING]')) {
                        const matches = content.match(/\[(BLOCKER|PENDING)\]\s*(.*)/g);
                        matches?.forEach(m => {
                            warnings.push(`Unresolved decision in ${path.relative(rootDir, fullPath)}: ${m}`);
                        });
                    }
                }
            }
        };
        traverseTasks(tasksDir);
    }

    return { errors, warnings };
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const rootDir = path.resolve(process.cwd(), options.path);

    console.log(`\n[MISSION-PACK VALIDATION] Checking "${options.path}" for agent-readiness...`);

    if (!fs.existsSync(rootDir)) {
        console.error(`Error: Directory not found: ${options.path}`);
        process.exit(1);
    }

    const { errors, warnings } = validatePillars(rootDir);

    if (warnings.length > 0) {
        console.warn('\nQuality Warnings:');
        warnings.forEach(w => console.warn(`- ${w}`));
    }

    if (errors.length > 0) {
        console.error('\nIntegrity Failures:');
        errors.forEach(e => console.error(`- ${e}`));
        process.exit(1);
    }

    if (warnings.length === 0 && errors.length === 0) {
        console.log('\n[PASS] Mission pack is balanced and agent-ready.');
    } else if (errors.length === 0) {
        console.log('\n[PASS] Mission pack is valid, but consider addressing quality warnings.');
    }
}

main();
