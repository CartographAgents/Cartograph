import { useState, useEffect } from 'react';
import { generatePillarsFromIdea, processChatTurn, generateCategoriesForPillar } from '../services/agentService';
import { generateBlueprintZip } from '../services/exportService';
import { saveStateToBackend, fetchLatestProject, fetchProjectById } from '../services/apiService';
import { findNodeById, updateNodeDecisions } from '../utils/treeUtils';

export function useAppLogic() {
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Hello! I'm your Cartograph Agent. Describe the application you want to build, and I'll generate the architectural pillars for us to work through. We can chat about decisions, or you can supply them directly." }
  ]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [activePillarId, setActivePillarId] = useState(null);
  const [agentFeedback, setAgentFeedback] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('pillar'); // 'pillar' | 'graph'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [llmConfig, setLlmConfig] = useState(() => {
    const savedKeys = localStorage.getItem('cartograph_keys');
    const savedProvider = localStorage.getItem('cartograph_provider');
    return {
      keys: savedKeys ? JSON.parse(savedKeys) : { openai: '', anthropic: '', gemini: '' },
      provider: savedProvider || 'mock'
    };
  });

  useEffect(() => {
    async function hydrate() {
      setIsWaiting(true);
      try {
        const data = await fetchLatestProject();
        if (data && data.projectId) {
          setProjectId(data.projectId);
          setPillars(data.pillars || []);
          setMessages([
            { role: 'agent', content: "Hello! I'm your Cartograph Agent. Describe the application you want to build, and I'll generate the architectural pillars for us to work through. We can chat about decisions, or you can supply them directly." },
            { role: 'user', content: data.idea },
            { role: 'agent', content: "I've restored your latest session. The architectural framework is fully staged! Which area would you like to discuss first?" }
          ]);
        }
      } catch (err) {
        console.error("Hydration failed:", err);
      } finally {
        setIsWaiting(false);
      }
    }
    hydrate();
  }, []);

  const handleNewProject = () => {
    setProjectId(null);
    setPillars([]);
    setActivePillarId(null);
    setAgentFeedback([]);
    setMessages([
      { role: 'agent', content: "New session started! Describe the application you want to build, and I'll generate the architectural pillars for us to work through." }
    ]);
  };

  const handleSelectProject = async (id) => {
    setIsWaiting(true);
    setIsProjectsOpen(false);
    try {
      const data = await fetchProjectById(id);
      if (data) {
        setProjectId(data.projectId);
        setPillars(data.pillars || []);
        setActivePillarId(null);
        setMessages([
          { role: 'agent', content: "I've restored your session. The architectural framework is fully staged! Which area would you like to discuss first?" },
          { role: 'user', content: data.idea },
          { role: 'agent', content: "Restored from your project history. What would you like to refine?" }
        ]);
      }
    } catch (err) {
      console.error("Failed to load project:", err);
      setErrorMessage("Could not load the selected project.");
    } finally {
      setIsWaiting(false);
    }
  };

  const handleSendMessage = async (content) => {
    setErrorMessage(null);
    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setIsWaiting(true);

    try {
      if (pillars.length === 0) {
        const generatedPillars = await generatePillarsFromIdea(content, llmConfig);
        setMessages([...newMessages, { role: 'agent', content: "I've extracted the top-level pillars rapidly. I am now deploying sub-agents in parallel to draft the specific categories and decisions..." }]);
        setPillars(generatedPillars);
        setIsWaiting(false);

        const parallelPromises = generatedPillars.map(async (pillar) => {
          try {
            const subData = await generateCategoriesForPillar(content, pillar, llmConfig);
            setPillars(current => current.map(p => {
              if (p.id === pillar.id) {
                return { ...p, subcategories: subData.subcategories || [], decisions: subData.decisions || [] };
              }
              return p;
            }));
            return subData;
          } catch (err) {
            console.error(`Pillar expansion failed for ${pillar.title}:`, err);
            return { subcategories: [], decisions: [] };
          }
        });

        await Promise.all(parallelPromises);

        setMessages(msgs => [...msgs, { role: 'agent', content: "All sub-agents have reported back. The architectural framework is fully staged! Which area would you like to discuss first?" }]);

        const finalPillars = await Promise.all(generatedPillars.map(async (p, idx) => {
          const subData = await parallelPromises[idx];
          return { ...p, subcategories: subData.subcategories || [], decisions: subData.decisions || [] };
        }));
        const resultData = await saveStateToBackend(content, finalPillars, null);
        if (resultData && resultData.projectId) {
          setProjectId(resultData.projectId);
        }
      } else {
        const result = await processChatTurn(newMessages, pillars, llmConfig);

        let nextPillars = [...pillars];
        if (result.newCategories && result.newCategories.length > 0) {
          nextPillars = [...nextPillars, ...result.newCategories];
        }

        if (result.updatedDecisions && result.updatedDecisions.length > 0) {
            nextPillars = updateNodeDecisions(nextPillars, result.updatedDecisions, (d, update) => ({ ...d, answer: update.answer }));
        }

        setPillars(nextPillars);
        setMessages([...newMessages, { role: 'agent', content: result.reply }]);

        if (result.conflicts && result.conflicts.length > 0) {
          setAgentFeedback(result.conflicts.map(c => `Conflict: ${c.description}`));
        } else {
          setAgentFeedback([]);
        }

        const ideaMsg = newMessages.find(m => m.role === 'user');
        if (ideaMsg) {
          const resultData = await saveStateToBackend(ideaMsg.content, nextPillars, projectId);
          if (resultData && resultData.projectId) {
            setProjectId(resultData.projectId);
          }
        }
      }
    } catch (err) {
      console.error("Chat flow failed:", err);
      setMessages([...newMessages, { role: 'agent', content: "I encountered an error while processing your request. Please check the alert above." }]);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsWaiting(false);
    }
  };

  const handleUpdateDecision = async (pillarId, decisionId, answer) => {
    setErrorMessage(null);
    const nextPillars = updateNodeDecisions(pillars, decisionId, (d) => ({ ...d, answer }));
    setPillars(nextPillars);
    setActivePillarId(null);

    try {
      const ideaMsg = messages.find(m => m.role === 'user');
      if (ideaMsg) {
        const resultData = await saveStateToBackend(ideaMsg.content, nextPillars, projectId);
        if (resultData && resultData.projectId) {
          setProjectId(resultData.projectId);
        }
      }
    } catch (err) {
      console.error("Decision persistence failed:", err);
      setErrorMessage("Failed to save decision to the cloud. You can continue, but changes may not persist if you refresh.");
    } finally {
      setAgentFeedback([]);
    }
  };

  const handleExport = async () => {
    setErrorMessage(null);
    try {
      await generateBlueprintZip(pillars, { projectId, version: '0.1.0' });
    } catch (err) {
      console.error("Export failed:", err);
      setErrorMessage("Failed to generate export package: " + err.message);
    }
  };

  const activePillar = activePillarId ? findNodeById(pillars, activePillarId) : null;

  return {
    messages,
    isWaiting,
    pillars,
    activePillarId,
    setActivePillarId,
    activePillar,
    agentFeedback,
    projectId,
    errorMessage,
    setErrorMessage,
    isProjectsOpen,
    setIsProjectsOpen,
    viewMode,
    setViewMode,
    isSettingsOpen,
    setIsSettingsOpen,
    llmConfig,
    setLlmConfig,
    handleNewProject,
    handleSelectProject,
    handleSendMessage,
    handleUpdateDecision,
    handleExport
  };
}
