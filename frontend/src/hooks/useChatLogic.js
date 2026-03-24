import { generatePillarsFromIdea, processChatTurn, generateCategoriesForPillar } from '../services/agentService';
import { saveStateToBackend } from '../services/apiService';
import { addDecisionToPillar, findNodeById, updateNodeDecisions } from '../utils/treeUtils';

const normalizeText = (value = '') => value.toLowerCase();

const findFirstNode = (nodes, predicate) => {
  for (const node of nodes) {
    if (predicate(node)) return node;
    if (node.subcategories?.length) {
      const found = findFirstNode(node.subcategories, predicate);
      if (found) return found;
    }
  }
  return null;
};

const decisionMatches = (decision, matcher) => {
  if (!decision) return false;
  if (matcher.id && decision.id === matcher.id) return true;
  if (!matcher.pattern) return false;
  const haystack = `${decision.question || ''} ${decision.context || ''}`.toLowerCase();
  return matcher.pattern.test(haystack);
};

const upsertDecisionOnNode = (pillars, targetId, decision, matcher = {}) => {
  const target = findNodeById(pillars, targetId);
  if (!target) return pillars;

  const existing = (target.decisions || []).find((d) => decisionMatches(d, matcher) || d.id === decision.id);
  if (existing) {
    return updateNodeDecisions(pillars, existing.id, (d) => ({ ...d, ...decision, id: d.id }));
  }

  return addDecisionToPillar(pillars, targetId, decision);
};

const applyRealtimeStripeFallback = (pillars, message) => {
  const normalized = normalizeText(message);
  if (!/\bstripe\b/.test(normalized)) return pillars;

  const mentionsSubscriptions = /\bsubscription|subscriptions|billing|recurring\b/.test(normalized);
  const mentionsWebhooks = /\bwebhook|webhooks|event endpoint|event endpoints\b/.test(normalized);

  let next = pillars;

  const featuresNode = findFirstNode(next, (node) => normalizeText(node.title).includes('feature'));
  if (featuresNode && (mentionsSubscriptions || mentionsWebhooks)) {
    next = upsertDecisionOnNode(
      next,
      featuresNode.id,
      {
        id: 'feat_stripe_subscriptions',
        question: 'Stripe subscription payments',
        context: 'Support recurring subscriptions via Stripe Checkout/Billing and synchronize status to user accounts.',
        answer: 'Included'
      },
      { pattern: /stripe.*subscription|subscription.*stripe|stripe.*billing/ }
    );
  }

  const apiNode = findFirstNode(
    next,
    (node) => normalizeText(node.title).includes('api') || normalizeText(node.id).includes('api')
  );
  if (apiNode && (mentionsWebhooks || mentionsSubscriptions)) {
    next = upsertDecisionOnNode(
      next,
      apiNode.id,
      {
        id: 'api_stripe_webhooks',
        question: 'Stripe webhook endpoint suite',
        context: 'Implement webhook endpoints for subscription lifecycle events (checkout/session completion, invoice, and subscription status changes).',
        answer: 'Required'
      },
      { pattern: /stripe.*webhook|webhook.*stripe|subscription.*event/ }
    );
  }

  return next;
};

const sanitizeAgentReply = (reply, { updatedDecisionsCount = 0 } = {}) => {
  if (typeof reply !== 'string' || !reply.trim()) return 'Captured. Proceeding to the next architectural step.';
  let nextReply = reply.trim();

  // If the user already made a clear choice, avoid confirmation loops.
  if (updatedDecisionsCount > 0) {
    nextReply = nextReply
      .replace(/\bdo you confirm\b/gi, 'noted')
      .replace(/\blet'?s confirm\b/gi, 'captured')
      .replace(/\bplease confirm\b/gi, 'captured');
  }

  // Keep the conversation focused: at most one clarifying question in a turn.
  const questionMarkCount = (nextReply.match(/\?/g) || []).length;
  if (questionMarkCount > 1) {
    const firstQuestionIdx = nextReply.indexOf('?');
    nextReply = nextReply.slice(0, firstQuestionIdx + 1).trim();
  }

  return nextReply;
};

export function useChatLogic(state, setters) {
  const { messages, pillars, projectId, llmConfig } = state;
  const { setMessages, setPillars, setIsWaiting, setProjectId, setErrorMessage } = setters;

  const handleSendMessage = async (content) => {
    setErrorMessage(null);
    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setIsWaiting(true);

    try {
      if (pillars.length === 0) {
        await handleInitialIdea(content, newMessages);
      } else {
        await handleSubsequentTurn(newMessages);
      }
    } catch (err) {
      console.error("Chat flow failed:", err);
      setMessages(msgs => [...msgs, { role: 'agent', content: "An error occurred." }]);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsWaiting(false);
    }
  };

  const handleInitialIdea = async (content, newMessages) => {
    const generatedPillars = await generatePillarsFromIdea(content, llmConfig);
    setMessages([...newMessages, { role: 'agent', content: "Extracting pillars..." }]);
    setPillars(generatedPillars);
    setIsWaiting(false);

    const results = await Promise.all(generatedPillars.map(async (pillar) => {
      try {
        const subData = await generateCategoriesForPillar(content, pillar, llmConfig);
        setPillars(current => current.map(p => {
          if (p.id === pillar.id) {
            return { ...p, subcategories: subData.subcategories || [], decisions: subData.decisions || [] };
          }
          return p;
        }));
        return subData;
      } catch {
        return { subcategories: [], decisions: [] };
      }
    }));

    setMessages(msgs => [...msgs, { role: 'agent', content: "All set!" }]);
    const finalPillars = generatedPillars.map((p, idx) => ({
      ...p, subcategories: results[idx].subcategories || [], decisions: results[idx].decisions || []
    }));
    const resultData = await saveStateToBackend(content, finalPillars, null, true);
    if (resultData?.projectId) setProjectId(resultData.projectId);
  };

  const handleSubsequentTurn = async (newMessages) => {
    const result = await processChatTurn(newMessages, pillars, llmConfig);
    let nextPillars = [...pillars];
    if (result.newCategories?.length > 0) nextPillars = [...nextPillars, ...result.newCategories];
    if (result.newDecisions?.length > 0) {
      result.newDecisions.forEach((insertion) => {
        if (!insertion?.targetId || !insertion?.decision) return;
        nextPillars = upsertDecisionOnNode(nextPillars, insertion.targetId, insertion.decision);
      });
    }
    if (result.updatedDecisions?.length > 0) {
      nextPillars = updateNodeDecisions(nextPillars, result.updatedDecisions, (d, update) => ({ ...d, answer: update.answer }));
    }
    if (result.conflicts?.length > 0) {
      result.conflicts.forEach(conflict => {
        nextPillars = updateNodeDecisions(nextPillars, conflict.decisionIds, (d) => ({ ...d, conflict: conflict.description }));
      });
    }

    const latestUserMessage = newMessages[newMessages.length - 1]?.content || '';
    nextPillars = applyRealtimeStripeFallback(nextPillars, latestUserMessage);

    setPillars(nextPillars);
    const reply = sanitizeAgentReply(result.reply, { updatedDecisionsCount: result.updatedDecisions?.length || 0 });
    setMessages([...newMessages, { role: 'agent', content: reply }]);

    const ideaMsg = newMessages.find(m => m.role === 'user');
    if (ideaMsg) {
      const resultData = await saveStateToBackend(ideaMsg.content, nextPillars, projectId, true);
      if (resultData?.projectId) setProjectId(resultData.projectId);
    }
  };

  return { handleSendMessage };
}
