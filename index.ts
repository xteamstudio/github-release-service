import bodyParser from "body-parser";
import express from "express";
import {Release} from "github-webhook-event-types";
import {WebhookService} from "./src/WebhookService";

const port = process.env.PORT || 4000;
const token = process.env.GITHUB_TOKEN || "";
const prefix = process.env.PREFIX || "";

function startServer() {
  const webhookService = new WebhookService(token, prefix);

  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  app.use("/", async (req, res) => {
    const hook: Release = JSON.parse(req.body.payload);
    await webhookService.process(hook);
    res.end();
  });

  app.listen(port, () => console.log(`[WebhookEngine] Webhook is listening ${port}`));
}

if (token === "") {
  console.error("Missing the GITHUB_TOKEN");
} else {
  startServer();
}
