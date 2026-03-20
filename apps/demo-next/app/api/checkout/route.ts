import { pushDebugEvent } from "@/lib/debug-store";
import { getCreemDataFast } from "@/lib/creem-datafast";
import { demoConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const client = getCreemDataFast();
  const checkout = await client.createCheckout(
    {
      productId: demoConfig.creemProductId,
      successUrl: `${demoConfig.appBaseUrl}/success`,
    },
    {
      request,
    },
  );

  pushDebugEvent({
    kind: "checkout",
    title: "Created checkout with resolved tracking",
    payload: {
      checkoutUrl: checkout.checkoutUrl,
      resolvedTracking: checkout.resolvedTracking,
      metadata: checkout.metadata,
    },
  });

  if (!checkout.checkoutUrl) {
    throw new Error("Creem did not return a checkoutUrl.");
  }

  return Response.redirect(checkout.checkoutUrl, 303);
}
