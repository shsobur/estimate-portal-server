import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
// Routes file__
import adminRoutes from "./src/AdminRoutes/Admin.Routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware__
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://toiral-estimate-portal.web.app/",
      "https://toiral-estimate-portal.firebaseapp.com/",
    ],
    credentials: true,
  }),
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster-01-512m.ch5skz9.mongodb.net/?appName=Cluster-01-512M`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // DB Collections__
    const db = client.db("Toiral-Estimate");

    const clientsCollection = db.collection("clients");

    // API routes__
    app.use("/admin-api", adminRoutes(clientsCollection));

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "MERN Server is running!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
