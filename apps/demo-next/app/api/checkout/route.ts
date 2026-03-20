import { pushDebugEvent } from "@/lib/debug-store";
import { getCreemDataFast } from "@/lib/creem-datafast";
import { demoConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const client = getCreemDataFast();
  const requestUrl = new URL(request.url);
  const successUrl = new URL(`${demoConfig.appBaseUrl}/success`);

  for (const key of ["datafast_visitor_id", "datafast_session_id"]) {
    const value = requestUrl.searchParams.get(key);
    if (value) {
      successUrl.searchParams.set(key, value);
    }
  }

  const checkout = await client.createCheckout(
    {
      productId: demoConfig.creemProductId,
      successUrl: successUrl.toString(),
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
