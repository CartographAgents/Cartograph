import { Sequelize, DataTypes } from 'sequelize';

const DB_NAME = 'cartograph_db';
const DB_USER = 'cartograph';
const DB_PASS = 'cartograph_pass';
const DB_HOST = 'localhost';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'mysql',
    logging: false
});

const Project = sequelize.define('Project', {
    idea: { type: DataTypes.TEXT, allowNull: false },
});

async function runTest() {
    try {
        console.log("Starting test-transaction.mjs...");

        const initialCount = await Project.count();
        console.log(`Initial project count: ${initialCount}`);

        const apiUrl = 'http://localhost:3000/api/save-state';

        // Attempt to save project with one invalid pillar
        console.log("Attempting to save project with an invalid pillar (missing title)...");
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idea: "Transaction Test Idea",
                pillars: [
                    { id: 'p-valid', title: 'Valid Pillar', description: 'desc' },
                    { id: 'p-invalid', description: 'Missing title!' } // Should fail
                ]
            })
        });

        const data = await res.json();
        console.log("Response status:", res.status);
        console.log("Response data:", data);

        if (res.status === 200) {
            throw new Error("FAIL: Request should have failed but returned 200.");
        }

        const finalCount = await Project.count();
        console.log(`Final project count: ${finalCount}`);

        if (finalCount !== initialCount) {
            throw new Error(`FAIL: Project was persisted despite pillar failure. Rollback failed! Expected ${initialCount}, got ${finalCount}`);
        }

        console.log("Success: Rollback verified. Database state preserved after failure.");

        // Verify successful save works
        console.log("Verifying successful save still works...");
        const resSuccess = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idea: "Successful Transaction Idea",
                pillars: [
                    { id: 'p-success', title: 'Success Pillar', description: 'desc' }
                ]
            })
        });

        if (resSuccess.status !== 200) {
            throw new Error(`FAIL: Successful save failed with status ${resSuccess.status}`);
        }

        const countAfterSuccess = await Project.count();
        if (countAfterSuccess !== initialCount + 1) {
            throw new Error(`FAIL: Expected ${initialCount + 1} projects after successful save, got ${countAfterSuccess}`);
        }
        console.log("Success: Verified successful transaction committed correctly.");

        // 7. Verify update rollback
        console.log("\nVerifying update rollback...");
        // First get the latest project ID
        const resList = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: "Update Test Original", pillars: [] })
        });
        const dList = await resList.json();
        const idC = dList.projectId;
        console.log(`Created project for update test: ${idC}`);

        console.log("Attempting to update project with invalid data...");
        const resUpdate = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idea: "This should NOT be saved",
                pillars: [
                    { id: 'p-invalid-update', description: 'Missing title!' } // Fail after idea update
                ],
                projectId: idC
            })
        });

        console.log("Response status:", resUpdate.status);
        if (resUpdate.status !== 500) {
            throw new Error(`FAIL: Update should have failed but returned ${resUpdate.status}`);
        }

        const projectC = await Project.findByPk(idC);
        if (projectC.idea !== "Update Test Original") {
            throw new Error(`FAIL: Original idea was updated but not rolled back! Idea: ${projectC.idea}`);
        }
        console.log("Success: Original idea preserved after failed update.");

        console.log("\nALL TRANSACTION TESTS PASSED!");
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runTest();
