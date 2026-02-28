import { Router } from "express";
const { PrismaClient } = require("@prisma/client");
import * as jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const bcrypt = require("bcryptjs");

// Simple signup for testing
router.post("/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name },
        });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.json({ token, user });
    } catch (error) {
        res.status(400).json({ error: "Email might be taken" });
    }
});

// Simple login for testing
router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user });
});

// Middleware to protect routes
const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        req.userId = payload.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
};

// Create a new document
router.post("/documents", authMiddleware, async (req: any, res: any) => {
    const { title } = req.body;
    try {
        const doc = await prisma.document.create({
            data: {
                title: title || "Untitled Document",
                ownerId: req.userId,
            },
        });
        // Auto-add owner as collaborator
        await prisma.documentCollaboration.create({
            data: { userId: req.userId, documentId: doc.id }
        });
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: "Failed to create document" });
    }
});

// List user's documents
router.get("/documents", authMiddleware, async (req: any, res: any) => {
    const docs = await prisma.document.findMany({
        where: {
            collaborators: {
                some: { userId: req.userId }
            }
        }
    });
    res.json(docs);
});

// Get document history
router.get("/documents/:id/history", authMiddleware, async (req: any, res: any) => {
    const history = await prisma.documentHistory.findMany({
        where: { documentId: req.params.id },
        orderBy: { createdAt: 'desc' }
    });
    // Prisma Bytes are serialized as { type: "Buffer", data: [...] }
    res.json(history);
});

// Save a named version snapshot
router.post("/documents/:id/history", authMiddleware, async (req: any, res: any) => {
    const { reason } = req.body;
    const documentId = req.params.id;

    try {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc || !doc.content) return res.status(404).json({ error: "No content to snapshot" });

        const history = await prisma.documentHistory.create({
            data: {
                documentId,
                snapshot: doc.content, // Copy current binary state
                reason: reason || "Manual Snapshot"
            }
        });
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: "Failed to save snapshot" });
    }
});

// Delete a document
router.delete("/documents/:id", authMiddleware, async (req: any, res: any) => {
    const documentId = req.params.id;
    try {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) return res.status(404).json({ error: "Document not found" });
        if (doc.ownerId !== req.userId) return res.status(403).json({ error: "Only the owner can delete this document" });

        // Prisma handles cascading deletes for collaborators & history
        await prisma.document.delete({ where: { id: documentId } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete document" });
    }
});


// Invite a user to a document
router.post("/documents/:id/invite", authMiddleware, async (req: any, res: any) => {
    const documentId = req.params.id;
    const { email } = req.body;

    try {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) return res.status(404).json({ error: "Document not found" });
        if (doc.ownerId !== req.userId) return res.status(403).json({ error: "Only the owner can invite collaborators" });

        const invitee = await prisma.user.findUnique({ where: { email } });
        if (!invitee) return res.status(404).json({ error: "User with that email not found" });

        const existingCollab = await prisma.documentCollaboration.findUnique({
            where: {
                userId_documentId: {
                    userId: invitee.id,
                    documentId: documentId
                }
            }
        });

        if (existingCollab) {
            return res.status(400).json({ error: "User is already a collaborator" });
        }

        await prisma.documentCollaboration.create({
            data: { userId: invitee.id, documentId: documentId }
        });

        res.json({ success: true, message: `Invited ${email}` });
    } catch (e) {
        res.status(500).json({ error: "Failed to invite user" });
    }
});

export default router;
