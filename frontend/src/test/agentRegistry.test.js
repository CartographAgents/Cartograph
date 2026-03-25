import { describe, it, expect } from 'vitest';
import { getAgentById, listAgentMentions, resolveMentionedAgent } from '../agents/agentRegistry';

describe('agent registry mention routing', () => {
    it('resolves a known @mention and strips it from routed content', () => {
        const parsed = resolveMentionedAgent('@pm help me clarify scope');
        expect(parsed.agentId).toBe('pm');
        expect(parsed.cleanedContent).toBe('help me clarify scope');
        expect(parsed.unknownHandle).toBeNull();
    });

    it('captures unknown @mention handles', () => {
        const parsed = resolveMentionedAgent('please route this to @qa-agent');
        expect(parsed.agentId).toBeNull();
        expect(parsed.unknownHandle).toBe('qa-agent');
    });

    it('resolves @research mentions to research agent', () => {
        const parsed = resolveMentionedAgent('@research validate Dataverse table relationships');
        expect(parsed.agentId).toBe('research');
        expect(parsed.cleanedContent).toBe('validate Dataverse table relationships');
        expect(parsed.unknownHandle).toBeNull();
    });

    it('lists research handle in mention hint output', () => {
        const mentions = listAgentMentions();
        expect(mentions).toContain('@pm');
        expect(mentions).toContain('@architect');
        expect(mentions).toContain('@research');
    });

    it('falls back to coordinator for unknown ids', () => {
        const agent = getAgentById('not-real');
        expect(agent.id).toBe('coordinator');
    });
});
