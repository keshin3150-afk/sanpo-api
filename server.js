import express from "express";
import { extract } from "./extract.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

app.post("/extract", (req, res) => {
  const { html } = req.body;
  const result = extract(html);
  res.json(result);
});

app.listen(3000, () => {
  console.log("sanpo-api running on http://localhost:3000");
});
