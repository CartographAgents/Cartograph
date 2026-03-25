const agentService = require('./agentService');
const {
    resolveProviderConfig,
    getModelForTask,
    buildCompletionPayload
} = require('./providerConfigService');

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

const toStringList = (value, limit = 8) => {
    if (!Array.isArray(value)) return [];
    const cleaned = value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    return [...new Set(cleaned)].slice(0, limit);
};

const normalizeQuestions = (value) => {
    if (!Array.isArray(value)) return [];
    const normalized = [];
    value.forEach((entry, index) => {
        if (!entry) return;
        if (typeof entry === 'string') {
            const question = entry.trim();
            if (!question) return;
            normalized.push({
                id: `q_${index + 1}`,
                question,
                why: 'Required before architecture synthesis.'
            });
            return;
        }
        const question = String(entry.question || entry.text || '').trim();
        if (!question) return;
        normalized.push({
            id: String(entry.id || `q_${index + 1}`),
            question,
            why: String(entry.why || entry.rationale || 'Required before architecture synthesis.').trim()
        });
    });
    return normalized;
};

const normalizeConfidence = (value, fallback = 0.5) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(1, parsed));
};

const buildOperationalFallback = (idea = '', reason = 'provider_not_configured') => ({
    agent: 'project_management',
    mode: 'requirements_discovery',
    confidence: 0.05,
    understanding: String(idea || '').trim() || 'A project brief is required before architecture work can begin.',
    missing_information: [
        'AI provider configuration is required for PM intake assessment.'
    ],
    questions: [
        {
            id: 'pm_configure_provider',
            question: 'Which provider/model should PM intake use for requirements discovery and handoff decisions?',
            why: 'PM intake is AI-driven and requires a configured model.'
        }
    ],
    assumptions: [],
    handoff_brief: '',
    reason
});

const normalizeIntakeResult = (raw = {}, fallback = {}, { idea = '' } = {}) => {
    const fallbackQuestions = normalizeQuestions(fallback.questions).slice(0, 1);
    const mode = String(raw.mode || fallback.mode || '').trim() === 'ready_for_architecture'
        ? 'ready_for_architecture'
        : 'requirements_discovery';

    let questions = normalizeQuestions(raw.questions);
    if (mode === 'requirements_discovery') {
        questions = (questions.length > 0 ? questions : fallbackQuestions).slice(0, 1);
    } else {
        questions = [];
    }

    const understanding = String(
        raw.understanding || fallback.understanding || idea || ''
    ).trim();

    const handoffBriefRaw = String(
        raw.handoff_brief || raw.handoffBrief || fallback.handoff_brief || ''
    ).trim();

    return {
        agent: 'project_management',
        mode,
        confidence: normalizeConfidence(raw.confidence, normalizeConfidence(fallback.confidence, 0.5)),
        understanding,
        missing_information: toStringList(raw.missing_information || raw.missingInformation || fallback.missing_information),
        questions,
        assumptions: toStringList(raw.assumptions || fallback.assumptions),
        handoff_brief: mode === 'ready_for_architecture'
            ? (handoffBriefRaw || understanding || String(idea || '').trim())
            : '',
        reason: String(raw.reason || fallback.reason || '').trim()
    };
};

const buildPrimaryAssessmentPrompts = ({
    safeIdea,
    hasArchitecture,
    priorState,
    condensedHistory
}) => {
    const systemPrompt = [
        'You are the Cartograph Project Management Agent.',
        'Decide whether the project has enough context to hand off to the Architect Agent.',
        'If context is insufficient, ask exactly ONE highest-impact next question.',
        'If context is sufficient, return ready_for_architecture with a concise handoff_brief.',
        'Ground your judgment in domain/platform context from the prompt and chat history.',
        'When web tools are available, use them to avoid domain mistakes and unsupported assumptions.',
        'Be platform-agnostic; do not impose fixed software taxonomies.',
        'Return strict JSON keys only:',
        'mode, confidence, understanding, missing_information, questions, assumptions, handoff_brief, reason.',
        'questions must contain exactly one item when mode=requirements_discovery.'
    ].join(' ');

    const userPrompt = [
        `Latest user input:\n${safeIdea}`,
        `Has existing architecture in progress: ${hasArchitecture ? 'yes' : 'no'}`,
        `Prior intake state:\n${JSON.stringify(priorState || {}, null, 2)}`,
        `Recent chat history:\n${JSON.stringify(condensedHistory, null, 2)}`
    ].join('\n\n');

    return { systemPrompt, userPrompt };
};

const buildRefinementPrompts = ({
    safeIdea,
    hasArchitecture,
    priorState,
    condensedHistory,
    draftResult
}) => {
    const systemPrompt = [
        'You are PM Intake QA for Cartograph.',
        'Validate and improve the draft intake decision.',
        'No hardcoded heuristic gating: rely on semantic context and project intent.',
        'Keep mode semantics strict:',
        '- requirements_discovery => exactly one question.',
        '- ready_for_architecture => no questions, include handoff_brief.',
        'Return strict JSON keys only:',
        'mode, confidence, understanding, missing_information, questions, assumptions, handoff_brief, reason.'
    ].join(' ');

    const userPrompt = [
        `Latest user input:\n${safeIdea}`,
        `Has existing architecture in progress: ${hasArchitecture ? 'yes' : 'no'}`,
        `Prior intake state:\n${JSON.stringify(priorState || {}, null, 2)}`,
        `Recent chat history:\n${JSON.stringify(condensedHistory, null, 2)}`,
        `Draft intake decision to refine:\n${JSON.stringify(draftResult || {}, null, 2)}`
    ].join('\n\n');

    return { systemPrompt, userPrompt };
};

const requestModelCompletion = async ({
    providerConfig,
    model,
    systemPrompt,
    userPrompt,
    fallback,
    useGroundedSearch = false
}) => {
    if (useGroundedSearch && providerConfig.provider === 'openai') {
        try {
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
                parsed: {
                    ...parsed,
                    source_citations: Array.isArray(sources) ? sources : []
                },
                groundedSearchUsed: true,
                groundedSearchError: null
            };
        } catch (error) {
            // Fall through to standard completion.
            const groundedSearchError = String(error?.message || 'Grounded search unavailable');
            const payload = buildCompletionPayload(
                providerConfig.provider,
                model,
                systemPrompt,
                userPrompt,
                { temperature: 0.05, maxTokens: 1800 }
            );
            const { completion } = await agentService.requestProviderCompletion({
                provider: providerConfig.provider,
                payload,
                clientKeys: providerConfig.keys
            });
            return {
                parsed: parseJson(completion, fallback) || fallback,
                groundedSearchUsed: false,
                groundedSearchError
            };
        }
    }

    const payload = buildCompletionPayload(
        providerConfig.provider,
        model,
        systemPrompt,
        userPrompt,
        { temperature: 0.05, maxTokens: 1800 }
    );
    const { completion } = await agentService.requestProviderCompletion({
        provider: providerConfig.provider,
        payload,
        clientKeys: providerConfig.keys
    });
    return {
        parsed: parseJson(completion, fallback) || fallback,
        groundedSearchUsed: false,
        groundedSearchError: null
    };
};

const assessIntakeV2 = async ({
    idea,
    chatHistory = [],
    priorState = null,
    hasArchitecture = false,
    runtimeConfig = null
}) => {
    const safeIdea = String(idea || '').trim();
    const providerConfig = await resolveProviderConfig(runtimeConfig);

    if (!providerConfig.provider) {
        return buildOperationalFallback(safeIdea, 'provider_not_configured');
    }

    const researchModel = getModelForTask(providerConfig.models, providerConfig.provider, 'research');
    const intakeModel = getModelForTask(providerConfig.models, providerConfig.provider, 'interactions');
    const condensedHistory = Array.isArray(chatHistory)
        ? chatHistory.slice(-12).map((msg) => ({
            role: msg?.role || 'user',
            content: String(msg?.content || '').slice(0, 1200)
        }))
        : [];

    const operationalFallback = buildOperationalFallback(safeIdea, 'ai_assessment_failed');
    const primaryPrompts = buildPrimaryAssessmentPrompts({
        safeIdea,
        hasArchitecture,
        priorState,
        condensedHistory
    });

    try {
        const primary = await requestModelCompletion({
            providerConfig,
            model: researchModel,
            systemPrompt: primaryPrompts.systemPrompt,
            userPrompt: primaryPrompts.userPrompt,
            fallback: operationalFallback,
            useGroundedSearch: true
        });

        const refinementPrompts = buildRefinementPrompts({
            safeIdea,
            hasArchitecture,
            priorState,
            condensedHistory,
            draftResult: primary.parsed
        });

        let refinedParsed = primary.parsed;
        try {
            const refined = await requestModelCompletion({
                providerConfig,
                model: intakeModel,
                systemPrompt: refinementPrompts.systemPrompt,
                userPrompt: refinementPrompts.userPrompt,
                fallback: primary.parsed,
                useGroundedSearch: false
            });
            refinedParsed = refined.parsed;
        } catch {
            // If refinement fails, use primary assessment result.
        }

        return normalizeIntakeResult(
            refinedParsed,
            {
                ...operationalFallback,
                reason: primary.groundedSearchError
                    ? `ai_assessment_fallback:${primary.groundedSearchError}`
                    : operationalFallback.reason
            },
            { idea: safeIdea }
        );
    } catch {
        return buildOperationalFallback(safeIdea, 'ai_assessment_unavailable');
    }
};

module.exports = {
    assessIntakeV2
};
