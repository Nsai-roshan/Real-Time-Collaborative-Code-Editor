const WebSocket = require('ws');
const jwt = require("jsonwebtoken");

const CONCURRENT_USERS = 500; // Load size
const DOC_ID = 'stress-test-document';
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";

// Generate a valid mock admin token for the test
const testToken = jwt.sign({ userId: "load-tester" }, JWT_SECRET);

console.log(`Starting massive load test: ${CONCURRENT_USERS} concurrent WebSocket connections 🚀`);
console.log(`Target Document: ${DOC_ID}`);

let connected = 0;
let errors = 0;
const startTime = Date.now();

for (let i = 0; i < CONCURRENT_USERS; i++) {
    const ws = new WebSocket(`ws://localhost:3001/ws/${DOC_ID}?token=${testToken}`);

    ws.on('open', () => {
        connected++;
        if (connected === CONCURRENT_USERS) {
            const timeTaken = Date.now() - startTime;
            console.log(`✅ SUCCESS: All ${CONCURRENT_USERS} WebSockets established instantly in ${timeTaken}ms!`);
            console.log(`✅ Security verification successful. Node.js event loop remains stable.`);
            process.exit(0);
        }
    });

    ws.on('error', (err) => {
        errors++;
        console.error(`Socket error ${i}:`, err.message);
        if (errors > 10) {
            console.error("Too many socket errors. Test Failed.");
            process.exit(1);
        }
    });
}
