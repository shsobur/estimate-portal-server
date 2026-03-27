import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

const adminRoutes = (verifyMessageCollection, usersCollection) => {
  router.get("/company-verify-request", async (req, res) => {
    try {
      const query = { isVerify: "Unverified" };
      const result = await verifyMessageCollection.find(query).toArray();
      res.status(200).send(result);
    } catch (error) {
      res
        .status(500)
        .send({ message: "Failed to fetch company verify requests" });
    }
  });

  router.put("/company-verify-approve-data/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const approveData = req.body;
      console.log(approveData);
      const result = await verifyMessageCollection.replaceOne(
        query,
        approveData
      );
      res.status(200).send(result);
    } catch {
      console.error("Error fetching company verify requests:", error);
      res.status(500).send({ message: "Approve data replace failed" });
    }
  });

  router.patch("/company-profile-status/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const filter = { userEmail: email };
      const updatedDoc = { $set: { verified: "Verified" } };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.status(200).send(result);
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  router.get("/all-user-list", async (req, res) => {
    try {
      const { search, role } = req.query;
      const filter = {
        projection: {
          _id: 0,
          profilePhoto: 1,
          userName: 1,
          userRole: 1,
          userEmail: 1,
          companyName: 1,
          companyLogo: 1,
        },
      };
      let query = {};

      if (search) {
        query.$or = [
          { userName: { $regex: search, $options: "i" } },
          { companyName: { $regex: search, $options: "i" } },
          { userEmail: { $regex: search, $options: "i" } },
        ];
      }

      if (role && role !== "all") {
        query.userRole = role;
      } else {
        query.userRole = {
          $ne: "Admin",
        };
      }

      const users = await usersCollection.find(query, filter).toArray();

      res.status(200).json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
};

export default adminRoutes;