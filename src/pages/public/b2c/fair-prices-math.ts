import type { ApiBusinessToCustomerSettings, ApiQrTagPublic } from "@/client/types.gen";


const POUND_TO_KG = 0.453592;

/** Bar values for "price paid to the producer" vs. world market and Fairtrade prices. */
export function producerPrices(s: ApiBusinessToCustomerSettings, qr: ApiQrTagPublic) {
  const mode = s.graphicPriceToProducer;
  const worldMarket = s.worldMarket ?? 0;
  const fairTrade = s.fairTrade ?? 0;
  const container = s.containerSize ?? 0;
  const producerPrice = qr.priceToProducer || s.manualProducerPrice || 0;

  let world = 0;
  let fair = 0;
  let product = 0;
  if (mode === "PER_CONTAINER") {
    world = Math.ceil((worldMarket / POUND_TO_KG) * container);
    fair = Math.ceil((fairTrade / POUND_TO_KG) * container);
    product = Math.ceil(producerPrice * container);
  } else if (mode === "PER_KG") {
    world = Math.ceil(worldMarket / POUND_TO_KG);
    fair = Math.ceil(fairTrade / POUND_TO_KG);
    product = Math.ceil(producerPrice);
  } else if (mode === "PERCENT_VALUE") {
    world = 100;
    fair = Math.round((fairTrade / worldMarket) * 100);
    product = Math.round((producerPrice / (worldMarket / POUND_TO_KG)) * 100);
  }
  return { world, fair, product };
}

/**
 * Farm-gate graphic values: the region `average`, the formatted `increase`, and the bar's
 * `total` height relative to the average (average = 100).
 */
export function farmGatePrices(s: ApiBusinessToCustomerSettings, qr: ApiQrTagPublic) {
  const mode = s.graphicFarmGatePrice;
  const container = s.containerSize ?? 0;
  const farmGatePrice = qr.priceToFarmer || s.manualFarmGatePrice || 0;
  const regionAverage = s.averageRegionFarmGatePrice ?? 0;

  let average = 0;
  let product = 0;
  let increase = "";
  if (mode === "PER_CONTAINER") {
    average = Math.ceil((regionAverage / POUND_TO_KG) * container);
    product = farmGatePrice * container;
    increase = `$${Math.ceil(product)}`;
  } else if (mode === "PER_KG") {
    average = Math.ceil(regionAverage / POUND_TO_KG);
    product = farmGatePrice;
    increase = `$${Math.ceil(product)}`;
  } else if (mode === "PERCENT_VALUE") {
    average = Math.ceil(regionAverage / POUND_TO_KG);
    product = (farmGatePrice / average) * 100 - 100;
    increase = `+${Math.round(product)}%`;
  }
  const total = (100 * (mode === "PERCENT_VALUE" ? farmGatePrice : product)) / average;
  return { average, increase, total };
}
