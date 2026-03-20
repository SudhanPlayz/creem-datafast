import { createNextWebhookHandler } from "@itzsudhan/creem-datafast/next";

import { getCreemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const handler = createNextWebhookHandler(getCreemDataFast());
  return handler(request);
}
