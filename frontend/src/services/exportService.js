import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const generateBlueprintZip = async (pillars) => {
    const zip = new JSZip();

    // 1. Generate agents.md
    let agentsMd = "# Architecture Strategy Blueprint\n\n";

    pillars.forEach(p => {
        agentsMd += `## ${p.title}\n`;
        p.decisions.forEach(d => {
            agentsMd += `- **${d.question}**: ${d.answer || 'TBD'}\n`;
        });
        agentsMd += "\n";
    });

    zip.file("agents.md", agentsMd);

    // 2. Generate task.md files for each pillar
    pillars.forEach((p, idx) => {
        let taskMd = `# Task: ${p.title}\n\n`;
        taskMd += `${p.description}\n\n## Decisions\n`;
        p.decisions.forEach(d => {
            taskMd += `- [ ] Implement ${d.question} (Selected: ${d.answer})\n`;
        });
        zip.file(`tasks/${idx + 1}-${p.title.replace(/\s+/g, '-').toLowerCase()}.md`, taskMd);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "Cartograph_Blueprint.zip");
};
