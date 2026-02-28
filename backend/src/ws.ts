const WebSocket = require("ws");
const Y = require("yjs");
const { setupWSConnection } = require("y-websocket/bin/utils");
const Redis = require("ioredis");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Configure Redis for scaling WebSockets if multiple servers are running.
// We publish Yjs updates here.
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const pubClient = new Redis(redisUrl);
export const subClient = new Redis(redisUrl);

// Keep an in-memory cache of Yjs documents
const docs: Map<string, any> = new Map();

/**
 * Persists a Yjs document to PostgreSQL
 */
const saveDocumentToDb = async (documentId: string, doc: any) => {
    const state = Y.encodeStateAsUpdate(doc);
    const buffer = Buffer.from(state);

    try {
        await prisma.document.update({
            where: { id: documentId },
            data: { content: buffer },
        });
        console.log(`Document ${documentId} saved to database`);
    } catch (error) {
        console.error("Failed to save document to DB:", error);
    }
};

/**
 * Initializes the WebSocket server for Yjs sync
 */
export const setupSocketServer = (wss: any) => {
    wss.on("connection", async (ws: any, req: any) => {
        // Determine document ID from the URL (e.g. wss://localhost/ws/docId?token=xyz)
        const urlParts = req.url?.split("?token=") || [];
        const documentId = urlParts[0]?.split("/").pop() || "default";
        const token = urlParts[1];

        if (!token) {
            ws.close(1008, "Authentication token required");
            return;
        }

        try {
            const jwt = require("jsonwebtoken");
            const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
            jwt.verify(token, JWT_SECRET);
        } catch (err) {
            ws.close(1008, "Invalid authentication token");
            return;
        }

        // Setup y-websocket connection
        setupWSConnection(ws, req, { docName: documentId });

        // Periodically save the document state
        const currentDoc = docs.get(documentId);
        if (!currentDoc) {
            // In a real app we'd load the binary content from PostgreSQL here first
            const loadedDoc = await prisma.document.findUnique({ where: { id: documentId } });
            const doc = new Y.Doc();
            if (loadedDoc?.content) {
                Y.applyUpdate(doc, new Uint8Array(loadedDoc.content));
            }
            docs.set(documentId, doc);
        }

        // Set a timeout or interval to save document
        const saveInterval = setInterval(() => {
            const docToSave = docs.get(documentId);
            if (docToSave) {
                saveDocumentToDb(documentId, docToSave);
            }
        }, 10000); // save every 10 seconds for prototyping

        ws.on("close", () => {
            clearInterval(saveInterval);
        });
    });
};
