import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "node:http";
import { MongoClient, ServerApiVersion } from "mongodb";

// Import routes__
import chatRoutes from "./Chat/chat.routes.js";
import uploadRoute from "./image/upload.js";
import commonRoutes from "./Common/common.routes.js";
import usersRoutes from "./User/user.routes.js";
import recruiterRoutes from "./Recruiter/recruiter.routes.js";
import adminRoutes from "./Admin/admin.routes.js";
import initializeSocket from "./Socket.IO/socket.js";

const app = express();
const port = process.env.PORT || 5000;
const server = createServer(app);
dotenv.config();

// MongoDB Connection__
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g4yea9q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware__
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://job-hunting-d689c.web.app",
      "https://job-hunting-d689c.firebaseapp.com",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// DB setup
async function run() {
  try {
    await client.connect();

    // DB Collections__
    const db = client.db("jobHuntingDB");

    const usersCollection = db.collection("users");
    const jobsCollection = db.collection("jobs");
    const verifyMessageCollection = db.collection("verifyMessage");
    const applicationsCollection = db.collection("applications");
    const conversationsCollection = db.collection("conversations");
    const messagesCollection = db.collection("messages");

    // All Routes collections__
    // Chat__
    app.use(
      "/chat-api",
      chatRoutes(conversationsCollection, messagesCollection, usersCollection),
    );

    // Cloudinary__
    app.use("/upload", uploadRoute);

    // All__
    app.use("/common-api", commonRoutes(usersCollection, jobsCollection));

    // User__
    app.use(
      "/user-api",
      usersRoutes(usersCollection, applicationsCollection, jobsCollection),
    );

    // Recruiter__
    app.use(
      "/recruiter-api",
      recruiterRoutes(
        jobsCollection,
        verifyMessageCollection,
        applicationsCollection,
        usersCollection,
      ),
    );

    // Admin__
    app.use(
      "/admin-api",
      adminRoutes(verifyMessageCollection, usersCollection),
    );

    // Socket__
    initializeSocket(server, {
      conversationsCollection,
      messagesCollection,
      usersCollection,
    });

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB successfully!");
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
  }
}
run().catch(console.dir);

// Test route__
app.get("/", (req, res) => {
  res.send("Job-Hunting Server is running...");
});

// Start server__
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🔗 Socket.IO ready at ws://localhost:${port}`);
});