import { Router } from "express";
import { CosmosClient } from "@azure/cosmos";

const router = Router();

/*─────────────────────────────────────────────
  Helpers to read required environment variables
─────────────────────────────────────────────*/
function must(name: string, value?: string): string {
  if (!value) throw new Error(`Environment variable ${name} is missing`);
  return value;
}

/*─────────────────────────────────────────────
  Cosmos DB client + database
─────────────────────────────────────────────*/
const client = new CosmosClient({
  endpoint: must("COSMOS_URI", process.env.COSMOS_URI),
  key:      must("COSMOS_KEY", process.env.COSMOS_KEY)
});

const database = client.database(
  must("COSMOS_DB", process.env.COSMOS_DB)
);

// Convenience: obtain a container object for every request
const getContainer = (name: string) => database.container(name);

/*─────────────────────────────────────────────
  Routes
─────────────────────────────────────────────*/

/* GET /api/items/:container            -> all docs in container */
router.get("/:container", async (req, res, next) => {
  try {
    const container = database.container(req.params.container);
    const { resources } = await container.items.readAll().fetchAll();
    res.json(resources);
  } catch (err) {
    next(err);
  }
});

/* GET /api/items/:container/:id        -> single document */
router.get("/:container/:id", async (req, res, next) => {
  try {
    const { container: cName, id } = req.params;
    const container = database.container(cName);
    const { resource } = await container.item(id, id).read(); // id = pk
    if (!resource) return res.status(404).send("Not found");
    res.json(resource);
  } catch (err) {
    if (err.code === 404) return res.status(404).send("Not found");
    next(err);
  }
});

/* POST /api/items/:container           -> upsert body */
router.post("/:container", async (req, res, next) => {
  try {
    const container = database.container(req.params.container);
    const { resource } = await container.items.upsert(req.body);
    res.json(resource);
  } catch (err) {
    next(err);
  }
});

export default router;