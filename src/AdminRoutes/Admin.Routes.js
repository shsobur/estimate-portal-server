import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

const adminRoutes = (clientsCollection) => {
  router.post("/add-client", async (req, res) => {
    try {
      const clientData = req.body;
      const result = await clientsCollection.insertOne(clientData);
      res.status(201).json({ message: "Client added successfully", result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/clients-codes", async (req, res) => {
    try {
      const result = await clientsCollection
        .find({}, { projection: { clientCode: 1, _id: 0 } })
        .toArray();

      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Failed to fetch client codes" });
    }
  });

  router.patch("/clients/:id", async (req, res) => {
    try {
      const id = req.params.id;
      console.log(id);
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
