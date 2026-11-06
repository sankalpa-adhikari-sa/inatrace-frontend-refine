import { type CSSProperties, createContext, useContext } from "react";
import type {
  ApiBusinessToCustomerSettings,
  ApiProductLabelValuesExtended,
  ApiQrTagPublic,
} from "@/client/types.gen";

/** What every B2C tab needs, provided by `B2cPage` once the label (and QR tag) are loaded. */
export type B2c = {
  uuid: string;
  qrTag: string;
  label: ApiProductLabelValuesExtended;
  /** Data of the scanned QR tag; empty when the label was opened without one (`EMPTY`). */
  qr: ApiQrTagPublic;
  settings: ApiBusinessToCustomerSettings;
  productName: string;
  /** Value of a published label field (null when the label hides it). */
  field: <T = string>(name: string) => T | null;
  textFont?: CSSProperties;
  productFont?: CSSProperties;
};

export const B2cContext = createContext<B2c | null>(null);
export const useB2c = () => useContext(B2cContext)!;
