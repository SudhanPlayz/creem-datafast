import { cache } from "react";

import { getCreemCoreClient } from "./creem-core";

export const getDirectPaymentLink = cache(async (): Promise<string> => {
  const productId = process.env.CREEM_PRODUCT_ID;
  if (!productId) {
    return "";
  }

  try {
    const product = await getCreemCoreClient().products.get(productId);
    return product.productUrl ?? "";
  } catch {
    return "";
  }
});
