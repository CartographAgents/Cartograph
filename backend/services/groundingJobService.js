const { randomUUID } = require('crypto');
const agentService = require('./agentService');
const {
    resolveProviderConfig,
    getModelForTask,
    buildCompletionPayload
} = require('./providerConfigService');

const JOB_TTL_MS = 30 * 60 * 1000;
const MAX_EVENTS = 200;
const jobs = new Map();

const parseJson = (raw, fallback = null) => {
    if (typeof raw !== 'string' || !raw.trim()) return fallback;
    const trimmed = raw.trim();
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        try {
            return JSON.parse(objectMatch[0]);
        } catch {
            return fallback;
        }
    }
    try {
        return JSON.parse(trimmed);
    } catch {
        return fallback;
    }
};

const toStringList = (value, limit = 30) => {
    if (!Array.isArray(value)) return [];
    const cleaned = value
        .map((item) => {
            if (item == null) return '';
            if (typeof item === 'string') return item.trim();
            if (typeof item === 'object') return String(item.title || item.name || item.label || item.id || '').trim();
            return String(item).trim();
        })
        .filter(Boolean);
    return [...new Set(cleaned)].slice(0, limit);
};

const mergeStringLists = (...lists) => {
    const merged = [];
    lists.forEach((list) => {
        toStringList(list, 300).forEach((entry) => {
            if (!merged.includes(entry)) merged.push(entry);
        });
    });
    return merged;
};

const normalizeSourceCitations = (value) => {
    if (!Array.isArray(value)) return [];
    const deduped = [];
    const seen = new Set();
    value.forEach((source) => {
        const title = String(source?.title || source?.name || '').trim();
        const url = String(source?.url || source?.link || '').trim();
        const publisher = String(source?.publisher || source?.domain || '').trim();
        if (!title && !url) return;
        const key = `${url}|${title}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push({ title: title || url, url, publisher });
    });
    return deduped.slice(0, 24);
};

const normalizeDomainGrounding = (raw = {}, idea = '', mode = 'fallback', injectedSources = []) => ({
    mode,
    ecosystem: String(raw.detected_ecosystem || raw.domain || raw.platform || '').trim(),
    domain_summary: String(raw.domain_summary || raw.summary || idea).trim(),
    platform_signals: mergeStringLists(raw.platform_signals, raw.platforms, raw.signals),
    domain_primitives: mergeStringLists(raw.domain_primitives, raw.platform_primitives, raw.required_artifacts, raw.core_objects),
    decision_axes: mergeStringLists(raw.critical_decision_axes, raw.decision_axes),
    failure_modes: mergeStringLists(raw.common_failure_modes, raw.failure_modes, raw.pitfalls),
    ambiguity_flags: mergeStringLists(raw.ambiguities, raw.ambiguity_flags),
    source_citations: normalizeSourceCitations([...(raw.source_citations || []), ...injectedSources]),
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : null
});

const getFallbackGrounding = (idea = '') => ({
    detected_ecosystem: '',
    domain_summary: String(idea || '').trim(),
    platform_signals: [],
    domain_primitives: [],
    critical_decision_axes: [],
    common_failure_modes: [],
    ambiguities: [],
    confidence: 0.2,
    source_citations: []
});

const addEvent = (job, type, message, meta = {}) => {
    const event = {
        timestamp: new Date().toISOString(),
        type,
        message: String(message || '').trim(),
        ...meta
    };
    job.events.push(event);
    if (job.events.length > MAX_EVENTS) {
        job.events = job.events.slice(job.events.length - MAX_EVENTS);
    }
    job.updatedAt = new Date().toISOString();
};

const snapshotJob = (job) => ({
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    error: job.error || null,
    events: Array.isArray(job.events) ? job.events : [],
    result: job.status === 'completed' ? job.result : null
});

const buildQueryPlannerPrompts = (idea) => {
    const systemPrompt = [
        'You are planning domain-grounding web research.',
        'Return strict JSON with key queries.',
        'Schema: { queries: [{ id, query, purpose }] }',
        'Provide 3-5 focused, high-signal queries for architecture decisions.'
    ].join(' ');
    const userPrompt = [
        `Project idea:\n${idea}`,
        'Generate the most informative web research queries for grounding architecture decisions.'
    ].join('\n\n');
    return { systemPrompt, userPrompt };
};

const normalizeQueryPlan = (raw = {}, idea = '') => {
    const input = Array.isArray(raw.queries) ? raw.queries : [];
    const normalized = input
        .map((entry, index) => {
            const query = String(entry?.query || entry?.q || '').trim();
            if (!query) return null;
            return {
                id: String(entry?.id || `q_${index + 1}`),
                query,
                purpose: String(entry?.purpose || 'Ground domain assumptions with web evidence.').trim()
            };
        })
        .filter(Boolean)
        .slice(0, 5);

    if (normalized.length > 0) return normalized;
    return [
        {
            id: 'q_1',
            query: `${String(idea || '').trim()} architecture best practices`,
            purpose: 'Fallback grounding query when query planner output is unavailable.'
        }
    ];
};

const runCompletion = async ({
    providerConfig,
    model,
    systemPrompt,
    userPrompt,
    fallback = {}
}) => {
    const payload = buildCompletionPayload(
        providerConfig.provider,
        model,
        systemPrompt,
        userPrompt,
        { temperature: 0.1, maxTokens: 2200 }
    );
    const { completion } = await agentService.requestProviderCompletion({
        provider: providerConfig.provider,
        payload,
        clientKeys: providerConfig.keys
    });
    return parseJson(completion, fallback) || fallback;
};

const runGroundedQuery = async ({
    providerConfig,
    model,
    idea,
    query
}) => {
    const fallback = {
        summary: '',
        platform_signals: [],
        domain_primitives: [],
        critical_decision_axes: [],
        common_failure_modes: [],
        ambiguities: [],
        source_citations: []
    };

    const systemPrompt = [
        'You are executing one grounded domain research query for architecture planning.',
        'Return strict JSON only with keys:',
        'summary, platform_signals, domain_primitives, critical_decision_axes, common_failure_modes, ambiguities, source_citations.'
    ].join(' ');
    const userPrompt = [
        `Project idea:\n${idea}`,
        `Research query:\n${query}`,
        'Use authoritative sources where possible and focus on architecture-relevant findings.'
    ].join('\n\n');

    if (providerConfig.provider === 'openai') {
        const { completion, sources } = await agentService.requestProviderGroundedCompletion({
            provider: providerConfig.provider,
            clientKeys: providerConfig.keys,
            payload: {
                model,
                instructions: systemPrompt,
                input: userPrompt,
                tools: [{ type: 'web_search' }],
                include: ['web_search_call.action.sources'],
                tool_choice: 'auto',
                reasoning: { effort: 'medium' },
                timeoutMs: 120000
            }
        });
        const parsed = parseJson(completion, fallback) || fallback;
        return {
            ...parsed,
            source_citations: normalizeSourceCitations([
                ...(parsed.source_citations || []),
                ...(sources || [])
            ])
        };
    }

    return runCompletion({
        providerConfig,
        model,
        systemPrompt,
        userPrompt,
        fallback
    });
};

const synthesizeGrounding = async ({
    providerConfig,
    model,
    idea,
    evidence
}) => {
    const fallback = getFallbackGrounding(idea);
    const systemPrompt = [
        'You are synthesizing final domain grounding for planner.v2.',
        'Return strict JSON with keys:',
        'detected_ecosystem, domain_summary, platform_signals, domain_primitives, critical_decision_axes, common_failure_modes, ambiguities, confidence, source_citations.'
    ].join(' ');
    const userPrompt = [
        `Project idea:\n${idea}`,
        `Grounding evidence:\n${JSON.stringify(evidence, null, 2)}`,
        'Synthesize one coherent grounded output for downstream planning.'
    ].join('\n\n');

    return runCompletion({
        providerConfig,
        model,
        systemPrompt,
        userPrompt,
        fallback
    });
};

const scheduleCleanup = (jobId) => {
    const timer = setTimeout(() => {
        const existing = jobs.get(jobId);
        if (!existing) return;
        const completedAt = new Date(existing.completedAt || existing.updatedAt || existing.createdAt).getTime();
        if (Date.now() - completedAt >= JOB_TTL_MS) {
            jobs.delete(jobId);
        }
    }, JOB_TTL_MS + 1000);
    if (typeof timer?.unref === 'function') {
        timer.unref();
    }
};

const runGroundingJob = async (job) => {
    const timings = {};
    const timed = async (label, fn) => {
        const started = Date.now();
        const result = await fn();
        timings[label] = Date.now() - started;
        return result;
    };

    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.updatedAt = job.startedAt;
    addEvent(job, 'status', 'Grounding job started.');

    try {
        const providerConfig = await resolveProviderConfig(job.runtimeConfig);
        job.provider = providerConfig.provider || 'fallback';
        const model = getModelForTask(providerConfig.models, providerConfig.provider, 'research');

        if (!providerConfig.provider || providerConfig.provider === 'mock') {
            const fallbackGrounding = normalizeDomainGrounding(
                getFallbackGrounding(job.idea),
                job.idea,
                'fallback'
            );
            addEvent(job, 'status', 'No provider configured. Returning fallback grounding.');
            job.result = {
                grounding: fallbackGrounding,
                planner_meta: {
                    provider: 'fallback',
                    grounded_search_used: false,
                    grounded_search_error: 'No provider configured for grounded research.',
                    grounding_mode: 'fallback',
                    sources_used: 0,
                    pass_timings_ms: timings,
                    passes: ['domain_grounding'],
                    grounding_prerequisite_complete: true,
                    grounding_activity: job.events
                }
            };
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.updatedAt = job.completedAt;
            scheduleCleanup(job.jobId);
            return;
        }

        addEvent(job, 'plan', 'Building grounded research query plan...');
        const queryPrompts = buildQueryPlannerPrompts(job.idea);
        const queryPlanRaw = await timed('query_planning', async () => runCompletion({
            providerConfig,
            model,
            systemPrompt: queryPrompts.systemPrompt,
            userPrompt: queryPrompts.userPrompt,
            fallback: { queries: [] }
        }));
        const queries = normalizeQueryPlan(queryPlanRaw, job.idea).slice(0, 4);
        addEvent(job, 'plan', `Planned ${queries.length} grounded search request${queries.length === 1 ? '' : 's'}.`);
        queries.forEach((q, idx) => {
            addEvent(job, 'plan', `Query ${idx + 1}: ${q.query}`);
        });

        const evidence = [];
        for (let i = 0; i < queries.length; i += 1) {
            const q = queries[i];
            addEvent(job, 'search', `Running search ${i + 1}/${queries.length}: ${q.query}`);
            const queryEvidence = await timed(`search_${i + 1}`, async () => runGroundedQuery({
                providerConfig,
                model,
                idea: job.idea,
                query: q.query
            }));
            evidence.push({
                query: q.query,
                purpose: q.purpose,
                ...queryEvidence
            });
            const sourceCount = Array.isArray(queryEvidence.source_citations)
                ? queryEvidence.source_citations.length
                : 0;
            addEvent(
                job,
                'search',
                `Completed search ${i + 1}/${queries.length}: ${sourceCount} source${sourceCount === 1 ? '' : 's'} captured.`
            );
        }

        addEvent(job, 'synthesis', 'Synthesizing final grounded context from research evidence...');
        const groundingRaw = await timed('synthesis', async () => synthesizeGrounding({
            providerConfig,
            model,
            idea: job.idea,
            evidence
        }));
        const injectedSources = evidence.flatMap((item) => item.source_citations || []);
        const grounding = normalizeDomainGrounding(
            groundingRaw,
            job.idea,
            providerConfig.provider === 'openai' ? 'web_grounded' : 'model_only',
            injectedSources
        );

        job.result = {
            grounding,
            planner_meta: {
                provider: providerConfig.provider || 'fallback',
                grounded_search_used: providerConfig.provider === 'openai',
                grounded_search_error: null,
                grounding_mode: grounding.mode,
                sources_used: (grounding.source_citations || []).length,
                pass_timings_ms: timings,
                passes: ['domain_grounding'],
                grounding_prerequisite_complete: true,
                grounding_activity: job.events
            }
        };
        addEvent(
            job,
            'status',
            `Grounding complete: ${(grounding.domain_primitives || []).length} primitives, ${(grounding.source_citations || []).length} sources.`
        );
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.updatedAt = job.completedAt;
        scheduleCleanup(job.jobId);
    } catch (error) {
        const message = String(error?.message || 'Grounding job failed.');
        addEvent(job, 'error', `Grounding failed: ${message}`);
        job.status = 'failed';
        job.error = message;
        job.completedAt = new Date().toISOString();
        job.updatedAt = job.completedAt;
        scheduleCleanup(job.jobId);
    }
};

const startGroundingJob = ({ idea, runtimeConfig = null }) => {
    const jobId = randomUUID();
    const now = new Date().toISOString();
    const job = {
        jobId,
        idea: String(idea || '').trim(),
        runtimeConfig,
        status: 'queued',
        createdAt: now,
        startedAt: null,
        updatedAt: now,
        completedAt: null,
        provider: null,
        error: null,
        events: [],
        result: null
    };

    addEvent(job, 'status', 'Queued grounding job.');
    jobs.set(jobId, job);
    setImmediate(() => {
        runGroundingJob(job).catch((err) => {
            const message = String(err?.message || 'Grounding job execution error.');
            addEvent(job, 'error', message);
            job.status = 'failed';
            job.error = message;
            job.completedAt = new Date().toISOString();
            job.updatedAt = job.completedAt;
            scheduleCleanup(job.jobId);
        });
    });

    return snapshotJob(job);
};

const getGroundingJob = (jobId) => {
    const job = jobs.get(String(jobId || '').trim());
    if (!job) return null;
    return snapshotJob(job);
};

module.exports = {
    startGroundingJob,
    getGroundingJob
};
