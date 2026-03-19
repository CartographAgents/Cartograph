const BASE_URL = 'http://localhost:3000/api';

async function test() {
    console.log('--- Testing task-004: Latest Project Retrieval ---');

    // 1. Save a complex project
    const complexProject = {
        idea: 'Verification Project ' + Date.now(),
        pillars: [
            {
                id: 'p1',
                title: 'Infrastructure',
                description: 'Core backend services',
                decisions: [
                    { id: 'd1', question: 'Use Sequelize?', context: 'ORM choice', answer: 'Yes' }
                ],
                subcategories: [
                    {
                        id: 'p1-1',
                        title: 'Database',
                        description: 'Persistence layer',
                        decisions: [
                            { id: 'd2', question: 'Which DB?', context: 'SQL or NoSQL', answer: 'MySQL' }
                        ]
                    }
                ]
            },
            {
                id: 'p2',
                title: 'Security',
                description: 'Identity and Access'
            }
        ]
    };

    console.log('Saving complex project...');
    const saveRes = await fetch(`${BASE_URL}/save-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complexProject)
    });
    const saveData = await saveRes.json();
    console.log('Save result:', saveData);

    if (!saveData.success) {
        console.error('Failed to save project');
        process.exit(1);
    }

    // 2. Retrieve latest project
    console.log('Retrieving latest project...');
    const getRes = await fetch(`${BASE_URL}/projects/latest`);
    const project = await getRes.json();

    console.log('Retrieved project:', JSON.stringify(project, null, 2));

    // 3. Assertions
    if (project.idea !== complexProject.idea) {
        console.error('Idea mismatch!');
        process.exit(1);
    }

    if (project.pillars.length !== 2) {
        console.error('Pillar count mismatch!');
        process.exit(1);
    }

    const infraPillar = project.pillars.find(p => p.id === 'p1');
    if (!infraPillar || infraPillar.subcategories.length !== 1 || infraPillar.decisions.length !== 1) {
        console.error('Infrastructure pillar structure mismatch!');
        process.exit(1);
    }

    const dbPillar = infraPillar.subcategories[0];
    if (dbPillar.id !== 'p1-1' || dbPillar.decisions.length !== 1) {
        console.error('Database sub-pillar structure mismatch!');
        process.exit(1);
    }

    console.log('--- Task-004 Verification SUCCESS ---');
}

test().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
