const { Project, Pillar, Decision } = require('../models');
const agentService = require('./agentService');

/**
 * Clustering Service
 * 
 * Responsible for mapping high-dimensional decision embeddings into 2D space
 * for visualization and grouping them into semantic clusters.
 */

// Simple PCA implementation for 2D reduction
function simplePCA(data) {
    if (data.length === 0) return [];
    if (data[0].length < 2) return data.map(d => [d[0] || 0, 0]);

    const numRows = data.length;
    const numCols = data[0].length;

    // 1. Center the data
    const means = new Array(numCols).fill(0);
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            means[j] += data[i][j];
        }
    }
    for (let j = 0; j < numCols; j++) {
        means[j] /= numRows;
    }

    const centeredData = data.map(row => row.map((val, j) => val - means[j]));

    // 2. Simple Iterative PCA (Power Method for first two components)
    // This is an approximation but works well for small/medium datasets without heavy math libraries
    function getPrincipalComponent(matrix, iterations = 10) {
        let vector = new Array(numCols).fill(0).map(() => Math.random());
        
        for (let iter = 0; iter < iterations; iter++) {
            let nextVector = new Array(numCols).fill(0);
            for (let i = 0; i < numRows; i++) {
                let dotProduct = 0;
                for (let j = 0; j < numCols; j++) {
                    dotProduct += matrix[i][j] * vector[j];
                }
                for (let j = 0; j < numCols; j++) {
                    nextVector[j] += matrix[i][j] * dotProduct;
                }
            }
            
            // Normalize
            const norm = Math.sqrt(nextVector.reduce((sum, val) => sum + val * val, 0));
            vector = nextVector.map(val => val / (norm || 1));
        }
        return vector;
    }

    const pc1 = getPrincipalComponent(centeredData);

    // Remove projection onto pc1 to find pc2
    const residual = centeredData.map(row => {
        const dotProduct = row.reduce((sum, val, j) => sum + val * pc1[j], 0);
        return row.map((val, j) => val - dotProduct * pc1[j]);
    });

    const pc2 = getPrincipalComponent(residual);

    // 3. Project data onto pc1 and pc2
    return data.map(row => {
        const x = row.reduce((sum, val, j) => sum + val * pc1[j], 0);
        const y = row.reduce((sum, val, j) => sum + val * pc2[j], 0);
        return [x, y];
    });
}

// Simple K-means (K=3 for now, or based on sqrt(N))
function simpleKMeans(coordinates, k = 3) {
    if (coordinates.length === 0) return [];
    const centroids = coordinates.slice(0, k).map(c => [...c]);
    const clusters = new Array(coordinates.length).fill(0);

    for (let iter = 0; iter < 5; iter++) {
        // Assign clusters
        for (let i = 0; i < coordinates.length; i++) {
            let minDist = Infinity;
            for (let j = 0; j < k; j++) {
                const dist = Math.hypot(coordinates[i][0] - centroids[j][0], coordinates[i][1] - centroids[j][1]);
                if (dist < minDist) {
                    minDist = dist;
                    clusters[i] = j;
                }
            }
        }

        // Update centroids
        const newCentroids = new Array(k).fill(0).map(() => [0, 0]);
        const counts = new Array(k).fill(0);
        for (let i = 0; i < coordinates.length; i++) {
            const c = clusters[i];
            newCentroids[c][0] += coordinates[i][0];
            newCentroids[c][1] += coordinates[i][1];
            counts[c]++;
        }
        for (let j = 0; j < k; j++) {
            if (counts[j] > 0) {
                centroids[j][0] = newCentroids[j][0] / counts[j];
                centroids[j][1] = newCentroids[j][1] / counts[j];
            }
        }
    }
    return clusters;
}

const getProjectClusters = async (projectId) => {
    const project = await Project.findByPk(projectId);
    if (!project) return null;

    const allPillars = await Pillar.findAll({ where: { ProjectId: project.id } });
    const pillarIds = allPillars.map(p => p.id);

    const decisions = await Decision.findAll({
        where: { PillarId: pillarIds }
    });

    if (decisions.length === 0) return [];

    // Ensure all decisions have embeddings
    const provider = process.env.OPENAI_API_KEY ? 'openai' : 'gemini';
    
    let updated = false;
    for (const decision of decisions) {
        if (!decision.embedding) {
            try {
                // Combine question and context for better semantic embedding
                const text = `${decision.question} ${decision.context || ''}`;
                const { embedding } = await agentService.requestProviderEmbedding({
                    provider,
                    text
                });
                decision.embedding = JSON.stringify(embedding);
                await decision.save();
                updated = true;
                console.log(`[Clustering] Generated embedding for decision ${decision.decisionId}`);
            } catch (err) {
                console.error(`[Clustering] Failed to generate embedding for decision ${decision.decisionId}:`, err.message);
            }
        }
    }

    // Prepare data for PCA
    const dataForPca = [];
    const validDecisions = [];

    for (const decision of decisions) {
        if (decision.embedding) {
            try {
                const embedding = JSON.parse(decision.embedding);
                if (Array.isArray(embedding)) {
                    dataForPca.push(embedding);
                    validDecisions.push(decision);
                }
            } catch (err) {
                console.error(`[Clustering] Error parsing embedding for ${decision.decisionId}`);
            }
        }
    }

    if (dataForPca.length < 2) {
        // Fallback for single or zero valid embeddings
        return validDecisions.map((d, i) => ({
            decisionId: d.decisionId,
            x: i,
            y: 0,
            clusterLabel: 'Unclustered'
        }));
    }

    // Dimensionality reduction
    const coords2d = simplePCA(dataForPca);

    // Normalization (-10 to 10 for better visualization)
    const maxX = Math.max(...coords2d.map(c => Math.abs(c[0]))) || 1;
    const maxY = Math.max(...coords2d.map(c => Math.abs(c[1]))) || 1;
    
    const normalizedCoords = coords2d.map(c => [
        (c[0] / maxX) * 10,
        (c[1] / maxY) * 10
    ]);

    // Clustering
    const k = Math.min(Math.floor(Math.sqrt(validDecisions.length)) + 1, 5);
    const clusterIndices = simpleKMeans(normalizedCoords, k);

    // Assign labels (could be something like "Cluster 1", etc.)
    const results = validDecisions.map((d, i) => {
        const clusterLabel = `Cluster ${clusterIndices[i] + 1}`;
        
        // Update DB if they have changed significantly or are missing (to ensure stability)
        // For now, we update if they were null
        if (d.clusterX === null || d.clusterY === null || d.clusterLabel === null) {
            d.clusterX = normalizedCoords[i][0];
            d.clusterY = normalizedCoords[i][1];
            d.clusterLabel = clusterLabel;
            d.save();
        }

        return {
            decisionId: d.decisionId,
            x: normalizedCoords[i][0],
            y: normalizedCoords[i][1],
            clusterLabel
        };
    });

    return results;
};

module.exports = {
    getProjectClusters
};
