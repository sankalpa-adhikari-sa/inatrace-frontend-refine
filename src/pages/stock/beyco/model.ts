import type { ApiBeycoCoffee, ApiBeycoOrderCoffees, ApiBeycoOrderFields } from "@/client/types.gen";
import { day, toApiDate } from "../shared";

export type CoffeeForm = Omit<ApiBeycoCoffee, "varieties" | "qualitySegments" | "grades" | "certificates"> &
  Pick<ApiBeycoOrderCoffees, "price" | "priceUnit" | "currency" | "incoterms" | "customIncoterms"> & {
    varieties: string[];
    customVariety?: string;
    qualitySegments: string[];
    grades: string[];
    certificates: string[];
  };

export type OfferForm = {
  title?: string;
  availableAt?: string;
  address?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  coffees: CoffeeForm[];
};

export function toForm(f: ApiBeycoOrderFields): OfferForm {
  return {
    title: f.title,
    availableAt: day(f.availableAt),
    address: f.portOfExport?.address,
    country: f.portOfExport?.country,
    latitude: f.portOfExport?.latitude,
    longitude: f.portOfExport?.longitude,
    coffees: (f.offerCoffees ?? []).map((c) => ({
      ...c.coffee,
      harvestAt: day(c.coffee?.harvestAt),
      price: c.price,
      priceUnit: c.priceUnit,
      currency: c.currency,
      incoterms: c.incoterms,
      customIncoterms: c.customIncoterms,
      varieties: (c.coffee?.varieties ?? []).map((v) => v.type!),
      customVariety: c.coffee?.varieties?.find((v) => v.type === "Other")?.customVariety,
      qualitySegments: (c.coffee?.qualitySegments ?? []).map((q) => q.type!),
      grades: (c.coffee?.grades ?? []).map((g) => g.type!),
      certificates: (c.coffee?.certificates ?? []).map((g) => g.type!),
    })),
  };
}

export function toApi(v: OfferForm): ApiBeycoOrderFields {
  return {
    title: v.title,
    availableAt: toApiDate(v.availableAt),
    portOfExport: { address: v.address, country: v.country, latitude: v.latitude, longitude: v.longitude },
    offerCoffees: v.coffees.map((c) => ({
      currency: c.currency,
      price: Number(c.price),
      priceUnit: c.priceUnit,
      incoterms: c.incoterms,
      customIncoterms: c.incoterms === "Other" ? c.customIncoterms : undefined,
      coffee: {
        name: c.name,
        quantity: c.quantity,
        unit: c.unit,
        region: c.region,
        country: c.country,
        harvestAt: toApiDate(c.harvestAt),
        species: c.species,
        process: c.process,
        minScreenSize: c.minScreenSize,
        maxScreenSize: c.maxScreenSize,
        cuppingScore: c.cuppingScore,
        isBulk: c.isBulk,
        varieties: c.varieties.map((t) => ({
          type: t as never,
          customVariety: t === "Other" ? c.customVariety : undefined,
        })),
        qualitySegments: c.qualitySegments.map((t) => ({ type: t as never })),
        grades: c.grades.map((t) => ({ type: t as never })),
        additionalQualityDescriptors: c.grades.includes("Other") ? c.additionalQualityDescriptors : undefined,
        certificates: c.certificates.map((t) => ({ type: t as never })),
      },
    })),
  };
}
