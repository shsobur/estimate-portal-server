import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

// This function will receive collections from index.js
export default function chatRoutes(
  conversationsCollection,
  messagesCollection,
  usersCollection
) {
  // 1. Get conversations for a user
  router.get("/conversations/:email", async (req, res) => {
    try {
      const { email } = req.params;

      // Find conversations where this user is a participant
      const conversations = await conversationsCollection
        .find({ participants: email })
        .sort({ updatedAt: -1 }) // Newest first
        .toArray();

      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to load conversations" });
    }
  });

  // 2. Get messages for a conversation
  router.get("/messages/:conversationId", async (req, res) => {
    try {
      const { conversationId } = req.params;

      // Validate conversationId format
      if (!ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const messages = await messagesCollection
        .find({ conversationId: new ObjectId(conversationId) })
        .sort({ timestamp: 1 }) // Oldest first (chronological order)
        .toArray();

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to load messages" });
    }
  });

  // 3. Get user info by email__
  router.get("/user/:email", async (req, res) => {
    try {
      const { email } = req.params;

      const user = await usersCollection.findOne(
        { userEmail: email },
        {
          projection: {
            _id: 1,
            userEmail: 1,
            userName: 1,
            profilePhoto: 1,
            companyPhoto: 1,
            userRole: 1,
          },
        }
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to load user" });
    }
  });

  return router;
}