import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

const recruiterRoutes = (
  jobsCollection,
  verifyMessageCollection,
  applicationsCollection,
  usersCollection,
) => {
  router.post("/post-job", async (req, res) => {
    try {
      const jobData = req.body;
      console.log(jobData);

      if (!jobData || Object.keys(jobData).length === 0) {
        return res.status(400).send({ message: "Job data is required" });
      }

      const result = await jobsCollection.insertOne(jobData);
      res.status(201).send(result);
    } catch (error) {
      console.error("Error posting job:", error);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  router.post("/profile-verify-message", async (req, res) => {
    try {
      const message = req.body;
      console.log(message);

      if (!message || Object.keys(message).length === 0) {
        return res.status(400).send({ message: "Message data is required" });
      }

      const result = await verifyMessageCollection.insertOne(message);
      res.status(201).send(result);
    } catch (error) {
      console.error("Error inserting verify message:", error);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  router.get("/job-applications", async (req, res) => {
    try {
      const result = await applicationsCollection.find().toArray();
      res.status(200).send(result);
    } catch (error) {
      console.error("Error fetching job applications:", error);
      json
        .status(500)
        .send({ message: "Server error while fetching applications" });
    }
  });

  router.patch("/job-applications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid application ID" });
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No update data provided" });
      }

      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: updateData };
      const options = { returnDocument: "after" };

      const result = await applicationsCollection.findOneAndUpdate(
        query,
        updateDoc,
        options,
      );

      if (!result) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  router.get("/resume-data/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await usersCollection.findOne(query);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching resume data:", error);
      return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
  });

  return router;
};

export default recruiterRoutes;
