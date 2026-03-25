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

const normalizeSourceCitations = (value) => {
    if (!Array.isArray(value)) return [];
    const output = [];
    const seen = new Set();
    value.forEach((source) => {
        const title = String(source?.title || source?.name || '').trim();
        const url = String(source?.url || source?.link || '').trim();
        const publisher = String(source?.publisher || source?.domain || '').trim();
        if (!title && !url) return;
        const key = `${url}|${title}`;
        if (seen.has(key)) return;
        seen.add(key);
        output.push({
            title: title || url,
            url,
            publisher
        });
    });
    return output.slice(0, 12);
};

const buildFallbackResearchResult = (query = '', reason = 'provider_not_configured') => ({
    summary: query
        ? `Research request captured for "${query}".`
        : 'Research request captured.',
    findings: [
        'No live provider is configured for web-grounded research yet.'
    ],
    recommendations: [
        'Configure provider/model settings to enable grounded web search outputs.'
    ],
    risks: [],
    follow_up_question: 'Which provider/model should the Research Agent use?',
    reason
});

const runModelCompletion = async ({
    providerConfig,
    model,
    systemPrompt,
    userPrompt,
    fallback,
    temperature = 0.1,
    maxTokens = 2200
}) => {
    const payload = buildCompletionPayload(
        providerConfig.provider,
        model,
        systemPrompt,
        userPrompt,
        { temperature, maxTokens }
    );
    const { completion } = await agentService.requestProviderCompletion({
        provider: providerConfig.provider,
        payload,
        clientKeys: providerConfig.keys
    });
    return parseJson(completion, fallback) || fallback;
};

const runResearchJsonPass = async ({
    runtimeConfig = null,
    providerConfig: injectedProviderConfig = null,
    modelTask = 'research',
    systemPrompt,
    userPrompt,
    fallback = {},
    allowWebSearch = true,
    temperature = 0.1,
    maxTokens = 2200,
    timeoutMs = 120000
}) => {
    const providerConfig = injectedProviderConfig || await resolveProviderConfig(runtimeConfig);
    const provider = providerConfig?.provider || null;
    const model = provider
        ? getModelForTask(providerConfig.models, provider, modelTask)
        : null;

    if (!provider || !model) {
        return {
            parsed: fallback,
            provider: provider || 'fallback',
            model: model || null,
            groundedSearchUsed: false,
            groundedSearchError: 'No provider/model configured for research.',
            sources: []
        };
    }

    if (allowWebSearch && provider === 'openai') {
        try {
            const { completion, sources } = await agentService.requestProviderGroundedCompletion({
                provider,
                clientKeys: providerConfig.keys,
                payload: {
                    model,
                    instructions: systemPrompt,
                    input: userPrompt,
                    tools: [{ type: 'web_search' }],
                    include: ['web_search_call.action.sources'],
                    tool_choice: 'auto',
                    reasoning: { effort: 'medium' },
                    timeoutMs
                }
            });
            return {
                parsed: parseJson(completion, fallback) || fallback,
                provider,
                model,
                groundedSearchUsed: true,
                groundedSearchError: null,
                sources: normalizeSourceCitations(sources || [])
            };
        } catch (error) {
            const parsed = await runModelCompletion({
                providerConfig,
                model,
                systemPrompt,
                userPrompt,
                fallback,
                temperature,
                maxTokens
            });
            return {
                parsed,
                provider,
                model,
                groundedSearchUsed: false,
                groundedSearchError: String(error?.message || 'Grounded web search unavailable.'),
                sources: []
            };
        }
    }

    const parsed = await runModelCompletion({
        providerConfig,
        model,
        systemPrompt,
        userPrompt,
        fallback,
        temperature,
        maxTokens
    });
    return {
        parsed,
        provider,
        model,
        groundedSearchUsed: false,
        groundedSearchError: null,
        sources: []
    };
};

const buildResearchReply = ({
    summary,
    findings,
    recommendations,
    risks,
    followUpQuestion,
    sources
}) => {
    const lines = [];
    lines.push(summary || 'Research completed.');

    if (findings.length > 0) {
        lines.push('Key findings:');
        findings.forEach((finding) => lines.push(`- ${finding}`));
    }

    if (recommendations.length > 0) {
        lines.push('Recommendations:');
        recommendations.forEach((recommendation) => lines.push(`- ${recommendation}`));
    }

    if (risks.length > 0) {
        lines.push('Risks to watch:');
        risks.forEach((risk) => lines.push(`- ${risk}`));
    }

    if (followUpQuestion) {
        lines.push(`Next question: ${followUpQuestion}`);
    }

    if (sources.length > 0) {
        lines.push('Sources:');
        sources.slice(0, 6).forEach((source, index) => {
            const title = source.title || source.url || `Source ${index + 1}`;
            const url = source.url ? `(${source.url})` : '';
            lines.push(`${index + 1}. [${title}]${url}`);
        });
    }

    return lines.filter(Boolean).join('\n');
};

const runResearchAgentQuery = async ({
    query,
    context = null,
    runtimeConfig = null
}) => {
    const safeQuery = String(query || '').trim();
    if (!safeQuery) {
        throw new Error('Research query is required.');
    }

    const providerConfig = await resolveProviderConfig(runtimeConfig);
    const fallback = buildFallbackResearchResult(safeQuery, 'provider_not_configured');
    const contextBlock = context && typeof context === 'object'
        ? JSON.stringify(context, null, 2)
        : String(context || '').trim();

    const systemPrompt = [
        'You are the Cartograph Research Agent.',
        'Produce concise, domain-grounded research for architecture and planning decisions.',
        'Use web search when available and avoid unsupported assumptions.',
        'Return strict JSON only with keys:',
        'summary, findings, recommendations, risks, follow_up_question.'
    ].join(' ');

    const userPrompt = [
        `Research request:\n${safeQuery}`,
        contextBlock ? `Project context:\n${contextBlock}` : null,
        'Focus on concrete, high-signal guidance that PM and Architect agents can act on immediately.'
    ].filter(Boolean).join('\n\n');

    const pass = await runResearchJsonPass({
        providerConfig,
        modelTask: 'research',
        systemPrompt,
        userPrompt,
        fallback,
        allowWebSearch: true,
        temperature: 0.1,
        maxTokens: 2200,
        timeoutMs: 120000
    });

    const summary = String(pass.parsed?.summary || fallback.summary || '').trim();
    const findings = toStringList(pass.parsed?.findings);
    const recommendations = toStringList(pass.parsed?.recommendations);
    const risks = toStringList(pass.parsed?.risks);
    const followUpQuestion = String(
        pass.parsed?.follow_up_question || pass.parsed?.followUpQuestion || ''
    ).trim();
    const sources = normalizeSourceCitations([
        ...(pass.parsed?.source_citations || []),
        ...(pass.sources || [])
    ]);

    return {
        agent: 'research',
        query: safeQuery,
        summary: summary || fallback.summary,
        findings,
        recommendations,
        risks,
        follow_up_question: followUpQuestion,
        sources,
        provider: pass.provider || providerConfig.provider || 'fallback',
        model: pass.model || null,
        grounded_search_used: !!pass.groundedSearchUsed,
        grounded_search_error: pass.groundedSearchError || null,
        reply: buildResearchReply({
            summary: summary || fallback.summary,
            findings,
            recommendations,
            risks,
            followUpQuestion,
            sources
        })
    };
};

module.exports = {
    runResearchJsonPass,
    runResearchAgentQuery
};
