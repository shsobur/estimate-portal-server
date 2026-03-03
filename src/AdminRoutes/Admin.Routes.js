import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

// ====== Helper: Generate Unique Client Code (Server-side) ======
// Used only inside /add-client__
const generateCode = () => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const letters =
    String.fromCharCode(97 + Math.floor(Math.random() * 26)) +
    String.fromCharCode(97 + Math.floor(Math.random() * 26));
  return `CL-${digits}${letters}`;
};

// ====== Admin Routes Factory ======
const adminRoutes = (clientsCollection) => {
  // ====== POST /add-client ======
  router.post("/add-client", async (req, res) => {
    try {
      const clientData = req.body;

      // Generate unique code with safety loop__
      let newCode;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        newCode = generateCode();
        attempts++;

        // Check if code already exists__
        const existing = await clientsCollection.findOne({
          clientCode: newCode,
        });
        if (!existing) break;

        if (attempts > maxAttempts) {
          throw new Error(
            "Unable to generate unique client code after 10 attempts.",
          );
        }
      } while (true);

      // Insert client + code in ONE atomic operation__
      const result = await clientsCollection.insertOne({
        ...clientData,
        clientCode: newCode,
        createdAt: new Date(),
      });

      res.status(201).json({
        message: "Client added successfully",
        _id: result.insertedId,
        clientCode: newCode, // ← frontend will use this
      });
    } catch (error) {
      console.error("Add client error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ====== GET /all-clients ======
  router.get("/all-clients", async (req, res) => {
    try {
      const result = await clientsCollection.find().toArray();
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Failed to fetch all clients" });
    }
  });

  // ====== PATCH /clients/:id ======
  router.patch("/clients/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updatedData = req.body;

      const result = await clientsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json({ message: "Client updated successfully", result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

export default adminRoutes;