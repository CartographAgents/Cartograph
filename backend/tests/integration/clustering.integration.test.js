process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const { app, sequelize, models } = require('../../server');
const { Project, Pillar, Decision } = models;

describe('Backend integration: Clustering and Semantic Mapping', () => {
    let fetchSpy;

    beforeEach(async () => {
        await sequelize.sync({ force: true });
        fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('GET /api/projects/:id/clusters returns 2D coordinates and cluster labels', async () => {
        process.env.OPENAI_API_KEY = 'test-key';
        
        // Seed project with 3 decisions
        const saveResponse = await request(app)
            .post('/api/save-state')
            .send({
                idea: 'Test Project for Clustering',
                pillars: [
                    {
                        id: 'p1',
                        title: 'Architecture',
                        decisions: [
                            { id: 'd1', question: 'Frontend tech?', context: 'React or Vue?' },
                            { id: 'd2', question: 'Backend tech?', context: 'Node or Go?' }
                        ]
                    },
                    {
                        id: 'p2',
                        title: 'Operations',
                        decisions: [
                            { id: 'd3', question: 'Deployment?', context: 'Docker or K8s?' }
                        ]
                    }
                ]
            });

        const projectId = saveResponse.body.projectId;

        // Mock OpenAI embedding responses (one for each decision)
        // We use different embeddings to ensure PCA works
        fetchSpy
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: [{ embedding: [1, 0, 0] }], usage: {} })
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: [{ embedding: [0, 1, 0] }], usage: {} })
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: [{ embedding: [0, 0, 1] }], usage: {} })
            });

        const response = await request(app).get(`/api/projects/${projectId}/clusters`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(3);

        response.body.forEach(cluster => {
            expect(cluster.decisionId).toBeDefined();
            expect(typeof cluster.x).toBe('number');
            expect(typeof cluster.y).toBe('number');
            expect(cluster.clusterLabel).toMatch(/Cluster \d/);
        });

        // Verify that embeddings and coordinates were cached in the DB
        const decisionsInDb = await Decision.findAll();
        decisionsInDb.forEach(d => {
            expect(d.embedding).toBeDefined();
            expect(d.clusterX).not.toBeNull();
            expect(d.clusterY).not.toBeNull();
            expect(d.clusterLabel).not.toBeNull();
        });
    });

    test('returns empty array for project with no decisions', async () => {
        const project = await Project.create({ idea: 'Empty project' });
        const response = await request(app).get(`/api/projects/${project.id}/clusters`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test('returns 404 for non-existent project', async () => {
        const response = await request(app).get('/api/projects/9999/clusters');
        expect(response.status).toBe(404);
    });
});
