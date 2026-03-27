import { Server } from "socket.io";

const initializeSocket = (server, collections) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://job-hunting-d689c.web.app",
        "https://job-hunting-d689c.firebaseapp.com",
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("🔗 New connection:", socket.id);
    const { email, userId, role } = socket.handshake.query;

    // Store user as online
    if (email) {
      onlineUsers.set(email, socket.id);
      console.log(`🟢 ${email} is online`);

      // Broadcast to others that this user is online
      socket.broadcast.emit("user_online", { email });
    }

    // Handle send_message event
    socket.on("send_message", async (data) => {
      console.log("📨 Message received:", data);
      const { to, text, timestamp } = data;
      const from = email;

      try {
        // 1. Find or create conversation
        const conversation = await collections.conversationsCollection.findOne({
          participants: { $all: [from, to] },
        });

        let conversationId;

        if (!conversation) {
          // Create new conversation
          const newConversation = {
            participants: [from, to],
            lastMessage: {
              text,
              senderEmail: from,
              timestamp: new Date(),
            },
            updatedAt: new Date(),
            createdAt: new Date(),
          };

          const result =
            await collections.conversationsCollection.insertOne(
              newConversation,
            );
          conversationId = result.insertedId;
        } else {
          conversationId = conversation._id;

          // Update last message
          await collections.conversationsCollection.updateOne(
            { _id: conversationId },
            {
              $set: {
                lastMessage: {
                  text,
                  senderEmail: from,
                  timestamp: new Date(),
                },
                updatedAt: new Date(),
              },
            },
          );
        }

        // 2. Save message
        const message = {
          conversationId,
          senderEmail: from,
          receiverEmail: to,
          text,
          timestamp: new Date(),
          read: false,
        };

        await collections.messagesCollection.insertOne(message);

        // 3. Check if receiver is online
        const receiverSocketId = onlineUsers.get(to);
        if (receiverSocketId) {
          // Send to receiver
          io.to(receiverSocketId).emit("receive_message", message);
        }

        // Send confirmation to sender
        socket.emit("message_sent", { success: true, message });
      } catch (error) {
        console.error("Error saving message:", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    // Handle recruiter auto message__
    socket.on("send_auto_message", async (data) => {
      console.log("🤖 Auto-message received:", data);
      const { to, from, text, timestamp } = data;

      try {
        // 1. Find or create conversation
        const conversation = await collections.conversationsCollection.findOne({
          participants: { $all: [from, to] },
        });

        let conversationId;

        if (!conversation) {
          // Create new conversation
          const newConversation = {
            participants: [from, to],
            lastMessage: {
              text,
              senderEmail: from,
              timestamp: new Date(timestamp),
            },
            updatedAt: new Date(),
            createdAt: new Date(),
          };

          const result =
            await collections.conversationsCollection.insertOne(
              newConversation,
            );
          conversationId = result.insertedId;
        } else {
          conversationId = conversation._id;

          // Update last message
          await collections.conversationsCollection.updateOne(
            { _id: conversationId },
            {
              $set: {
                lastMessage: {
                  text,
                  senderEmail: from,
                  timestamp: new Date(timestamp),
                },
                updatedAt: new Date(),
              },
            },
          );
        }

        // 2. Save auto message
        const message = {
          conversationId,
          senderEmail: from,
          receiverEmail: to,
          text,
          timestamp: new Date(timestamp),
          read: false,
          isAutoMessage: true,
        };

        await collections.messagesCollection.insertOne(message);

        // 3. Check if receiver is online
        const receiverSocketId = onlineUsers.get(to);
        if (receiverSocketId) {
          // Send to receiver
          io.to(receiverSocketId).emit("receive_message", message);
        }

        // Send confirmation to sender
        socket.emit("auto_message_sent", { success: true, message });
      } catch (error) {
        console.error("Error saving auto message:", error);
        socket.emit("auto_message_error", {
          error: "Failed to send auto message",
        });
      }
    });

    // Handle typing event (optional)
    socket.on("typing", (data) => {
      const { to, isTyping } = data;
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user_typing", {
          from: email,
          isTyping,
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
      if (email) {
        onlineUsers.delete(email);
        socket.broadcast.emit("user_offline", { email });
      }
    });
  });

  console.log("✅ Socket.IO server initialized");
  return io;
};

export default initializeSocket;
