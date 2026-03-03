import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

// Routes__
import adminRoutes from "./src/AdminRoutes/Admin.Routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ====== Middleware ======
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://toiral-estimate-portal.web.app",
      "https://toiral-estimate-portal.firebaseapp.com",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// ====== MongoDB Connection ======
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster-01-512m.ch5skz9.mongodb.net/?appName=Cluster-01-512M`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("Toiral-Estimate");
    const clientsCollection = db.collection("clients");

    // Mount admin routes__
    app.use("/admin-api", adminRoutes(clientsCollection));

    // Confirm connection__
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run().catch(console.dir);

// ====== Basic Health Check ======
app.get("/", (req, res) => {
  res.json({ message: "Toiral Estimate Server is running" });
});

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});