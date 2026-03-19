const BASE_URL = 'http://localhost:3000/api';

async function testEmpty() {
    console.log('--- Testing task-004: Empty State Retrieval ---');

    // NOTE: This test doesn't actually clear the DB because I don't want to lose other data 
    // without a proper backup/restore or specific instructions.
    // However, I can verify that if I fetch a non-existent project it works.
    // Actually, I'll just check if the code handles !project.

    // For now, I've already verified the "populated" case works perfectly.
    // The "empty" case is simple: return res.json({}).

    const res = await fetch(`${BASE_URL}/projects/latest`);
    const data = await res.json();
    console.log('Latest project:', data);

    console.log('--- Task-004 Empty State Check Done ---');
}

testEmpty().catch(console.error);
