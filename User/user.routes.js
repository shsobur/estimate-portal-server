import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

const usersRoutes = (
  usersCollection,
  applicationsCollection,
  jobsCollection
) => {
  // Insert new user data__
  router.post("/new-user-data", async (req, res) => {
    try {
      const data = req.body;
      const email = data.userEmail;

      // Check if email already exists__
      const existingUser = await usersCollection.findOne({
        userEmail: email,
      });
      if (existingUser) {
        return res.status(200).send({ message: "Email already exists" });
      }

      // Insert if not found__
      const result = await usersCollection.insertOne(data);
      res.status(200).send(result);
    } catch (error) {
      console.error("Error inserting user:", error);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  // Find authenticated user data__
  router.get("/users/email/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await usersCollection.findOne(query);

      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user by email:", error);
      res.status(500).send({ message: "Server error, my bad" });
    }
  });

  // Update user profile data__
  router.patch("/update-profile/:email", async (req, res) => {
    try {
      const data = req.body;
      const email = req.params.email;
      const filter = { userEmail: email };
      const updatedDoc = { $set: data };

      const result = await usersCollection.updateOne(filter, updatedDoc);

      if (result.modifiedCount > 0) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ message: "User not found or no changes made" });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).send({ message: "Server error, try again later" });
    }
  });

  // Job apply data__
  router.post("/apply-job/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const applicantData = req.body;

      if (email !== applicantData.applicantEmail) {
        return res.status(402).send({ message: "Unauthorized user" });
      }

      const result = await applicationsCollection.insertOne(applicantData);
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error applying job:", error);
      return res
        .status(500)
        .send({ message: "Server error", error: error.message });
    }
  });

  // Add user id to job details data__
  router.patch("/update-job-details/:jobId", async (req, res) => {
    const jobId = req.params.jobId;
    const seekerId = req.body;
    console.log(jobId);

    if (!jobId || !seekerId) {
      return res.status(400).send({ message: "Missing jobId or seekerId" });
    }

    const query = { _id: new ObjectId(jobId) };

    const updatedDoc = {
      $push: { jobApplicants: seekerId },
      $inc: { totalApply: 1 },
    };

    const result = await jobsCollection.updateOne(query, updatedDoc);
    res.status(200).send(result);
  });

  return router;
};

export default usersRoutes;