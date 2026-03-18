// src/services/agentService.js

const SYSTEM_PROMPT = `You are the Cartograph Agent, an expert software architect. 
Analyze the application idea and break it down into high-level architectural Pillars (e.g., Frontend, Backend, Data, Security, Infrastructure). 
For each pillar, provide specific architectural Decision points with discrete options.
You MUST respond with ONLY a valid JSON array of pillar objects! NO markdown wrappers like \`\`\`json. Just the raw array.

Format MUST match exactly:
[
  {
    "id": "pillar_id_string",
    "title": "Pillar Title",
    "description": "Short explanation of this pillar.",
    "decisions": [
      {
        "id": "decision_id_string",
        "question": "What is the specific architectural question?",
        "context": "Why is this decision important?",
        "options": ["Option 1", "Option 2", "Option 3"],
        "answer": null
      }
    ]
  }
]
`;

const parseLLMResponse = (text) => {
    try {
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
        return JSON.parse(cleanText.trim());
    } catch (e) {
        console.error("Failed to parse JSON:", text);
        throw new Error("Invalid output format from LLM. It failed to produce valid JSON.");
    }
};

export const generatePillarsFromIdea = async (ideaDescription, config) => {
    const { provider, keys } = config;

    if (provider === 'mock') return mockGenerate();

    const prompt = `Application Idea:\n${ideaDescription}`;

    try {
        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys.openai}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' } // OpenAI requires `json_object` to wrap in `{ "pillars": [...] }`, so let's just use text and parse
                })
            });
            // OpenAI JSON mode requires the output to be an object, but our schema is an Array. We'll disable response_format and rely on the prompt instructing raw JSON.
        }
    } catch (e) { } // Refactoring fetch below to handle the JSON object constraint properly.

    try {
        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys.openai}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT + "\nRemember, return ONLY the raw JSON array." },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return parseLLMResponse(data.choices[0].message.content);
        }

        if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': keys.anthropic,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    system: SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return parseLLMResponse(data.content[0].text);
        }

        if (provider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keys.gemini}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return parseLLMResponse(data.candidates[0].content.parts[0].text);
        }
    } catch (err) {
        console.error("LLM Error:", err);
        return [{ id: 'err', title: 'Error Generation', description: err.message, decisions: [] }];
    }
};

const mockGenerate = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: 'pillar-frontend',
                    title: 'Frontend & UI',
                    description: 'The user-facing application interface.',
                    decisions: [
                        {
                            id: 'd-fe-fw',
                            question: 'Which frontend framework will you use?',
                            context: 'A robust framework helps manage complex state.',
                            options: ['React', 'Vue', 'Angular', 'Vanilla JS'],
                            answer: null
                        }
                    ]
                }
            ]);
        }, 1500);
    });
};

export const evaluateDecisions = async (pillars, config) => {
    // We can just use mock evaluation for now to prevent spamming APIs on every click
    return new Promise((resolve) => resolve(["Notice: Real LLM evaluation triggers upon export review in upcoming version. Tracking decisions locally."]));
};
