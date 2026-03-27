import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

const commonRoutes = (usersCollection, jobsCollection) => {
  router.get("/profile-data/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await usersCollection.findOne(query);

      if (!result) {
        return res.status(404).send({ message: "User not found" });
      }

      res.status(200).send(result);
    } catch (error) {
      console.error("Error fetching profile data:", error);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  router.get("/jobs", async (req, res) => {
    try {
      const {
        search = "",
        page = 1,
        limit = 10,
        workType = "",
        minSalary = "",
        maxSalary = "",
        experienceLevel = "",
        userId = "",
      } = req.query;

      let query = {};

      // Search filter__
      if (search.trim() !== "") {
        query.$or = [
          { jobTitle: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      // Work type filter__
      if (workType) {
        const workTypeArray = workType.split(",");
        query.workplaceType = { $in: workTypeArray };
      }

      // Salary filter__
      if (minSalary || maxSalary) {
        query.$and = [];

        if (minSalary) {
          query.$and.push({
            "salaryRange.min": { $gte: parseInt(minSalary) },
          });
        }

        if (maxSalary) {
          query.$and.push({
            "salaryRange.max": { $lte: parseInt(maxSalary) },
          });
        }
      }

      // Experience filter__
      if (experienceLevel) {
        const experienceArray = experienceLevel.split(",");
        query.experienceLevel = { $in: experienceArray };
      }

      // Is jobs already applied by this user__
      if (userId) {
        query["jobApplicants.seekerId"] = { $ne: userId };
      }

      // Get only non-expired jobs__
      query.isExpired = false;

      // Page number__
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;

      const result = await jobsCollection
        .find(query)
        .skip(skip)
        .limit(limitNumber)
        .toArray();

      // Count total jobs for page number__
      const totalJobs = await jobsCollection.countDocuments(query);
      const totalPages = Math.ceil(totalJobs / limitNumber);

      res.json({
        success: true,
        data: result,
        pagination: {
          currentPage: pageNumber,
          totalPages: totalPages,
          totalJobs: totalJobs,
          hasNext: pageNumber < totalPages,
          hasPrev: pageNumber > 1,
        },
      });
    } catch (error) {
      console.error("Error in /jobs route:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  });

  router.get("/job-details/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching job details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  return router;
};

export default commonRoutes;