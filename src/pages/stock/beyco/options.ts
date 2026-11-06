

const opts = <T extends string>(values: T[], labels?: Partial<Record<T, string>>) =>
  values.map((v) => ({ value: v, label: labels?.[v] ?? v.replace(/([a-z])([A-Z0-9])/g, "$1 $2") }));

export const INCOTERMS = opts([
  "Tbd",
  "Fob",
  "Fot",
  "Fca",
  "Fas",
  "Exw",
  "Cfr",
  "Cif",
  "Cpt",
  "Cip",
  "Dap",
  "Dpu",
  "Ddp",
  "Other",
]);

export const PRICE_UNITS = opts(["Kg", "Lb", "Mg"]);

export const CURRENCIES = opts(["Usd", "UsdCt", "Eur"], { UsdCt: "USD cents" });

export const SPECIES = opts(["Arabica", "Robusta"]);

export const PROCESSES = opts(["FullyWashed", "SemiWashedHoney", "Natural", "Other"]);

export const VARIETIES = opts([
  "Bourbon",
  "Castillo",
  "Catimor",
  "Catuai",
  "Caturra",
  "Geisha",
  "Heirloom",
  "Ih90",
  "Jackson",
  "Java",
  "Lempira",
  "MundoNovo",
  "Sl14",
  "Sl28",
  "Sl34",
  "Typica",
  "Other",
]);

export const QUALITY = opts(["Specialty", "CommodityConventional", "LowGrade"]);

export const GRADES = opts([
  "Na",
  "Grade1",
  "Grade2",
  "Grade3",
  "Grade4",
  "Grade5",
  "Aa",
  "A",
  "Ab",
  "B",
  "C",
  "Pb",
  "X",
  "E",
  "Psc",
  "Y1",
  "Y2",
  "T",
  "HgHb",
  "ShgShb",
  "Other",
]);

export const CERTIFICATES = opts(["Ra", "Fairtrade", "Organic", "Practices", "FourC"], {
  Ra: "Rainforest Alliance",
  FourC: "4C",
});
