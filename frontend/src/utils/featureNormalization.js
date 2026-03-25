const PRIORITY_RE = /^P[0-2]$/i;
export const FEATURE_WORK_ITEM_TYPES = ['epic', 'feature', 'task'];

const toSentenceCase = (value = '') => {
    const text = String(value).trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        return value
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const toFeatureId = (value = '', type = 'feature') => {
    const slug = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
    const prefix = type === 'epic' ? 'epic' : (type === 'task' ? 'task' : 'feat');
    return slug ? `${prefix}_${slug}` : `${prefix}_${Date.now()}`;
};

const toWorkItemType = (decision = {}) => {
    const raw = String(decision.work_item_type || decision.workItemType || '').toLowerCase().trim();
    if (FEATURE_WORK_ITEM_TYPES.includes(raw)) return raw;

    const id = String(decision.id || '').toLowerCase();
    if (id.startsWith('epic_')) return 'epic';
    if (id.startsWith('task_')) return 'task';
    return 'feature';
};

const normalizeParentId = (decision = {}, type = 'feature') => {
    if (type === 'epic') return null;
    const explicit = decision.parent_id ?? decision.parentId ?? null;
    if (!explicit) return null;
    return String(explicit);
};

const defaultAcceptanceCriteria = (question, context) => {
    const label = toSentenceCase(question || 'Feature');
    const contextText = String(context || '').trim();
    return [
        `${label} is implemented end-to-end and available in the product flow.`,
        contextText
            ? `Behavior aligns with scope: ${contextText}.`
            : `${label} behavior is covered with clear user-facing outcomes.`
    ];
};

export const normalizeFeatureDecision = (decision = {}) => {
    const workItemType = toWorkItemType(decision);
    const question = String(decision.question || '').trim() || 'New Feature';
    const context = String(decision.context || '').trim() || 'Feature details captured from conversation.';
    const acceptanceCriteria = asArray(decision.acceptance_criteria);
    const dependencies = asArray(decision.dependencies);
    const rawPriority = String(decision.priority || '').toUpperCase();

    return {
        ...decision,
        id: decision.id ? String(decision.id) : toFeatureId(question, workItemType),
        question,
        context,
        work_item_type: workItemType,
        parent_id: normalizeParentId(decision, workItemType),
        acceptance_criteria: acceptanceCriteria.length > 0
            ? acceptanceCriteria
            : defaultAcceptanceCriteria(question, context),
        technical_context: String(decision.technical_context || '').trim() || 'Technical approach to be detailed during implementation planning.',
        dependencies,
        priority: PRIORITY_RE.test(rawPriority) ? rawPriority : 'P1'
    };
};

const makeVirtualFeature = (epicId) => ({
    id: `feat_general_${String(epicId || 'default').replace(/[^a-z0-9_]/gi, '_')}`,
    question: 'General Features',
    context: '',
    work_item_type: 'feature',
    parent_id: epicId || null,
    acceptance_criteria: [],
    technical_context: '',
    dependencies: [],
    priority: 'P2',
    __virtual: true
});

export const buildFeatureHierarchy = (decisions = []) => {
    const normalized = (decisions || []).map((item) => normalizeFeatureDecision(item));
    const epics = [];
    const epicById = new Map();
    const featureById = new Map();

    normalized.forEach((item) => {
        if (item.work_item_type !== 'epic') return;
        const node = { epic: item, features: [] };
        epics.push(node);
        epicById.set(item.id, node);
    });

    if (epics.length === 0) {
        const virtualEpic = {
            epic: {
                id: 'epic_core_product',
                question: 'Core Product Epic',
                context: 'Primary product scope.',
                work_item_type: 'epic',
                acceptance_criteria: [],
                technical_context: '',
                dependencies: [],
                priority: 'P1',
                __virtual: true
            },
            features: []
        };
        epics.push(virtualEpic);
        epicById.set(virtualEpic.epic.id, virtualEpic);
    }

    const defaultEpic = epics[0];

    normalized.forEach((item) => {
        if (item.work_item_type !== 'feature') return;
        const epicNode = epicById.get(item.parent_id) || defaultEpic;
        const featureNode = { feature: item, tasks: [] };
        epicNode.features.push(featureNode);
        featureById.set(item.id, featureNode);
    });

    const ensureGeneralFeature = (epicNode) => {
        let existing = epicNode.features.find((f) => f.feature.__virtual);
        if (existing) return existing;
        existing = { feature: makeVirtualFeature(epicNode.epic.id), tasks: [] };
        epicNode.features.unshift(existing);
        featureById.set(existing.feature.id, existing);
        return existing;
    };

    normalized.forEach((item) => {
        if (item.work_item_type !== 'task') return;
        const directFeature = item.parent_id ? featureById.get(item.parent_id) : null;
        if (directFeature) {
            directFeature.tasks.push(item);
            return;
        }

        const epicNode = item.parent_id ? epicById.get(item.parent_id) : defaultEpic;
        const containerFeature = ensureGeneralFeature(epicNode || defaultEpic);
        containerFeature.tasks.push(item);
    });

    return epics;
};
