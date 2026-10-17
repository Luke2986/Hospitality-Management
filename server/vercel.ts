import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "./app";

// One Express app per serverless instance, created on the first request and reused afterwards.
const appPromise = createApp().then(({ app }) => app);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await appPromise;
  app(req as any, res as any);
}
