import 'dotenv/config';
import express from "express";
import cors from 'cors';
import itemsRouter from './routes/items.js';   // adjust path if needed

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api/items", itemsRouter);

app.get("/", (_req, res) => res.send("API is up"));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));