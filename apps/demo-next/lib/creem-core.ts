import { Creem } from "creem";

let cachedClient: Creem | undefined;

export function getCreemCoreClient() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!process.env.CREEM_API_KEY) {
    throw new Error("Missing required demo environment variable: CREEM_API_KEY");
  }

  cachedClient = new Creem({
    apiKey: process.env.CREEM_API_KEY,
    serverIdx: 1,
  });

  return cachedClient;
}
