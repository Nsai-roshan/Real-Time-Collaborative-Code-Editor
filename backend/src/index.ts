import * as express from "express";
import * as cors from "cors";
const dotenv = require("dotenv");
const WebSocket = require("ws");
import * as http from "http";
const Redis = require("ioredis");
import apiRoutes from "./routes";
import { setupSocketServer } from "./ws";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

const server = http.createServer(app);

// WebSocket server setup
const wss = new WebSocket.Server({ server });

// Redis setup for scaling
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const pub = new Redis(redisUrl);
const sub = new Redis(redisUrl);

// REST API routes mapping
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.post("/api/auth/login", (req, res) => {
    // TODO: implement logic
    res.json({ message: "Login logic here" });
});

// WebSocket connection handling (delegated to ws.ts)
setupSocketServer(wss);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
