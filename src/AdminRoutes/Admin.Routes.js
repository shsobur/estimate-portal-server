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
const adminRoutes = (clientsCollection, projectsCollection) => {
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

  // ====== GET /clients ======
  // Supports: search by name/email + sort by status (or createdAt)__
  router.get("/clients", async (req, res) => {
    try {
      const { search, sort = "status", order = "asc" } = req.query;

      // Build query for search__
      let query = {};
      if (search?.trim()) {
        const searchRegex = new RegExp(search.trim(), "i");
        query.$or = [{ clientName: searchRegex }, { email: searchRegex }];
      }

      // Whitelist safe sort fields (prevent injection)__
      const allowedSortFields = ["status", "createdAt", "clientName"];
      const sortField = allowedSortFields.includes(sort) ? sort : "status";
      const sortOrder = order === "desc" ? -1 : 1;

      // Sort by chosen field + createdAt as tie-breaker (newest first)__
      const sortOption = {
        [sortField]: sortOrder,
        createdAt: -1,
      };

      const result = await clientsCollection
        .find(query)
        .sort(sortOption)
        .toArray();

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

  router.post("/client-by-code", async (req, res) => {
    try {
      const { clientCode } = req.body;
      console.log(req.body);

      if (!clientCode) {
        return res.status(400).json({ message: "clientCode is required" });
      }

      const result = await clientsCollection.findOne(
        { clientCode },
        {
          projection: {
            _id: 1,
            clientName: 1,
            companyName: 1,
            projectName: 1,
            phone: 1,
            email: 1,
            status: 1,
            clientCode: 1,
            assignedTeam: 1,
          },
        },
      );

      if (!result) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/add-project", async (req, res) => {
    try {
      const projectData = req.body;
      console.log(projectData);

      if (!projectData) {
        return res.status(400).json({ message: "Project data is required" });
      }

      const result = await projectsCollection.insertOne({
        ...projectData,
        createdAt: new Date(),
      });

      res.status(201).json({
        message: "Project added successfully",
        insertedId: result.insertedId,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ====== GET /projects ======
  router.get("/projects", async (req, res) => {
    try {
      const { search, status = "All Status" } = req.query;
      const clientCollName = clientsCollection.collectionName || "clients";

      // build aggregation pipeline incrementally for good performance
      const pipeline = [
        {
          $lookup: {
            from: clientCollName,
            localField: "clientCode",
            foreignField: "clientCode",
            as: "client",
          },
        },
        { $unwind: "$client" },
      ];

      // apply search if provided
      if (search && search.trim()) {
        const rgx = new RegExp(search.trim(), "i");
        pipeline.push({
          $match: {
            $or: [
              { "client.projectName": rgx },
              { "client.companyName": rgx },
            ],
          },
        });
      }

      // apply status filter except when user selects "All Status"
      if (status && status !== "All Status") {
        pipeline.push({ $match: { "client.status": status } });
      }

      pipeline.push({
        $project: {
          _id: 1,
          projectName: "$client.projectName",
          clientName: "$client.clientName",
          status: "$client.status",
          deadline: 1,
        },
      });

      const result = await projectsCollection.aggregate(pipeline).toArray();
      res.json(result);
    } catch (error) {
      console.error("Error fetching project summaries:", error);
      res.status(500).json({ message: "Failed to fetch projects summary" });
    }
  });

  // ====== GET /projects/:id ======
  // Returns detailed information for a single project by its _id.
  // Combines fields from the project document and its linked client.
  router.get("/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid project id" });
      }

      const clientCollName = clientsCollection.collectionName || "clients";

      const pipeline = [
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: clientCollName,
            localField: "clientCode",
            foreignField: "clientCode",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            _id: 0,
            projectCost: 1,
            stackName: 1,
            totalTasks: 1,
            deadline: 1,
            createdAt: 1,
            timeline: 1,
            projectDescription: 1,
            "client.clientName": 1,
            "client.projectName": 1,
            "client.status": 1,
            "client.assignedTeam": 1,
          },
        },
      ];

      const [doc] = await projectsCollection.aggregate(pipeline).toArray();
      if (!doc) {
        return res.status(404).json({ message: "Project not found" });
      }

      // flatten client object
      const {
        client: { clientName, projectName, status, assignedTeam },
        ...projectFields
      } = doc;

      res.json({ clientName, projectName, status, assignedTeam, ...projectFields });
    } catch (error) {
      console.error("Error fetching project detail:", error);
      res.status(500).json({ message: "Failed to fetch project detail" });
    }
  });

  return router;
};

export default adminRoutes;
