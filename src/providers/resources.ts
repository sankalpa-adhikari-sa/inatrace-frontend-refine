import type { BaseKey } from "@refinedev/core";
import { type Args, type Endpoint, type RequestShape } from "@/lib/endpoint";
import { ep } from "@/lib/endpoints";

/** One backend request: the endpoint plus its path / query / body arguments. */
export type ResourceRequest = { ep: Endpoint<any, any>; args?: unknown };

type Meta = Record<string, any>;

/** Per-resource mapping of Refine's CRUD methods to InaTrace endpoints. */
export type ResourceDef = {
  /** Paging, sorting and filter params are added by the data provider. */
  list?: (meta: Meta) => ResourceRequest;
  one?: (id: BaseKey, meta: Meta) => ResourceRequest;
  create?: (variables: any, meta: Meta) => ResourceRequest;
  update?: (id: BaseKey, variables: any, meta: Meta) => ResourceRequest;
  remove?: (id: BaseKey, meta: Meta) => ResourceRequest;
};

/** Type-check the arguments against the endpoint's generated request type. */
function req<D extends RequestShape, R>(e: Endpoint<D, R>, args?: Partial<Args<D>>): ResourceRequest {
  return { ep: e, args };
}

const num = (id: unknown) => Number(id);
const withId = (id: BaseKey) => ({ path: { id: num(id) } });

/**
 * Maps Refine resource names to InaTrace endpoints (consumed by the
 * `@refinedev/rest` data provider in ./data.ts). Operations that are not
 * CRUD-shaped are called with `call` / `useApi` from `@/lib/http`.
 */
export const resources: Record<string, ResourceDef> = {
  users: {
    // meta.scope: "mine" (users of my companies), "all" (system admin), "regional"
    list: (meta) =>
      meta.scope === "regional" ? req(ep.regionalAdminListUsers) : meta.scope === "all" ? req(ep.adminListUsers) : req(ep.listUsers),
    one: (id) => req(ep.getProfileForAdmin, withId(id)),
    update: (id, variables) => req(ep.adminUpdateProfile, { body: { ...variables, id: num(id) } }),
  },

  companies: {
    // meta.scope: "mine" or "all" (system admin)
    list: (meta) => (meta.scope === "all" ? req(ep.listCompaniesAdmin) : req(ep.listCompanies)),
    one: (id) => req(ep.getCompany, withId(id)),
    create: (variables) => req(ep.createCompany, { body: variables }),
    update: (id, variables) => req(ep.updateCompany, { body: { ...variables, id: num(id) } }),
  },

  facilities: {
    list: (meta) => req(ep.listAllFacilitiesByCompany, { path: { id: num(meta.companyId) } }),
    // The plain getFacility leaves out translations, which the edit form needs.
    one: (id) => req(ep.getFacilityDetail, withId(id)),
    create: (variables) => req(ep.createOrUpdateFacility, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateFacility, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteFacility, withId(id)),
  },

  "processing-actions": {
    list: (meta) => req(ep.listProcessingActionsByCompany, { path: { id: num(meta.companyId) } }),
    one: (id) => req(ep.getProcessingActionDetail, withId(id)),
    create: (variables) => req(ep.createOrUpdateProcessingAction, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateProcessingAction, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteProcessingAction, withId(id)),
  },

  // Farmers and collectors. meta.companyId and meta.type ("FARMER" | "COLLECTOR") for list / create.
  "user-customers": {
    list: (meta) =>
      req(ep.getUserCustomersForCompanyAndType, { path: { companyId: num(meta.companyId), type: meta.type } }),
    one: (id) => req(ep.getUserCustomer, withId(id)),
    create: (variables, meta) => req(ep.addUserCustomer, { path: { companyId: num(meta.companyId) }, body: variables }),
    update: (id, variables) => req(ep.updateUserCustomer, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteUserCustomer, withId(id)),
  },

  "company-customers": {
    list: (meta) => req(ep.getCompanyCustomersList, { path: { companyId: num(meta.companyId) } }),
    one: (id) => req(ep.getCompanyCustomer, withId(id)),
    create: (variables) => req(ep.createCompanyCustomer, { body: variables }),
    update: (id, variables) => req(ep.updateCompanyCustomer, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteCompanyCustomer, withId(id)),
  },

  // meta.facilityId lists one facility, otherwise meta.companyId lists the company.
  "stock-orders": {
    list: (meta) =>
      meta.facilityId
        ? req(ep.getStockOrderListByFacilityId, { path: { facilityId: num(meta.facilityId) } })
        : req(ep.getStockOrderListByCompanyId, { path: { companyId: num(meta.companyId) } }),
    one: (id, meta) => req(ep.getStockOrder, { ...withId(id), query: { withProcessingOrder: !!meta.withProcessingOrder } }),
    create: (variables) => req(ep.createOrUpdateStockOrder, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateStockOrder, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteStockOrder, withId(id)),
  },

  // meta.kind "RECEIVED" (quotes to us) or "PLACED" (our orders for customers)
  orders: {
    list: (meta) =>
      meta.kind === "RECEIVED"
        ? req(ep.getQuoteOrdersInFacility, { path: { companyId: num(meta.companyId) } })
        : req(ep.getStockOrdersInFacilityForCustomer, { path: { companyId: num(meta.companyId) } }),
  },

  "group-stock-orders": {
    list: (meta) => req(ep.getGroupedStockOrderList, { path: { facilityId: num(meta.facilityId) } }),
  },

  payments: {
    list: (meta) => req(ep.listPaymentsByCompany, { path: { id: num(meta.companyId) } }),
    one: (id) => req(ep.getPayment, withId(id)),
    create: (variables) => req(ep.createOrUpdatePayment, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdatePayment, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deletePayment, withId(id)),
  },

  "bulk-payments": {
    list: (meta) => req(ep.listBulkPaymentsByCompany, { path: { id: num(meta.companyId) } }),
    one: (id) => req(ep.getBulkPayment, withId(id)),
  },

  // meta.scope: "mine" or "all" (system admin)
  products: {
    list: (meta) => (meta.scope === "all" ? req(ep.listProductsAdmin) : req(ep.listProducts)),
    one: (id) => req(ep.getProduct, withId(id)),
    remove: (id) => req(ep.deleteProduct, withId(id)),
  },

  "label-batches": {
    list: (meta) => req(ep.getProductLabelBatches, { path: { id: num(meta.labelId) } }),
    one: (id) => req(ep.getProductLabelBatch, withId(id)),
    create: (variables) => req(ep.createProductLabelBatch, { body: variables }),
    update: (id, variables) => req(ep.updateProductLabelBatch, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteProductLabelBatch, withId(id)),
  },

  // Listed by the label's uuid (a public endpoint).
  "label-feedbacks": {
    list: (meta) => req(ep.listProductLabelFeedbacks, { path: { labelUid: meta.labelUid } }),
    remove: (id) => req(ep.deleteProductLabelFeedback, withId(id)),
  },

  "knowledge-blogs": {
    list: (meta) => req(ep.getProductKnowledgeBlogs, { path: { productId: num(meta.productId) } }),
    one: (id) => req(ep.getProductKnowledgeBlog, withId(id)),
    create: (variables, meta) => req(ep.addProductKnowledgeBlog, { path: { productId: num(meta.productId) }, body: variables }),
    update: (id, variables) => req(ep.updateProductKnowledgeBlog, { body: { ...variables, id: num(id) } }),
  },

  // Nested under a product: meta.productId is required for every operation.
  "final-products": {
    list: (meta) => req(ep.getFinalProductList, { path: { productId: num(meta.productId) } }),
    one: (id, meta) => req(ep.getFinalProduct, { path: { productId: num(meta.productId), finalProductId: num(id) } }),
    create: (variables, meta) => req(ep.createOrUpdateFinalProduct, { path: { productId: num(meta.productId) }, body: variables }),
    update: (id, variables, meta) =>
      req(ep.createOrUpdateFinalProduct, { path: { productId: num(meta.productId) }, body: { ...variables, id: num(id) } }),
    remove: (id, meta) => req(ep.deleteFinalProduct, { path: { productId: num(meta.productId), finalProductId: num(id) } }),
  },

  "value-chains": {
    list: () => req(ep.getValueChainList),
    one: (id) => req(ep.getValueChain, withId(id)),
    create: (variables) => req(ep.createOrUpdateValueChain, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateValueChain, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteValueChain, withId(id)),
  },

  // meta.enabled: true / false
  currencies: {
    list: (meta) => (meta.enabled ? req(ep.getEnabledCurrencyTypes) : req(ep.getDisabledCurrencyTypes)),
  },

  "facility-types": {
    list: () => req(ep.getFacilityTypeList),
    one: (id) => req(ep.getFacilityType, withId(id)),
    create: (variables) => req(ep.createOrUpdateFacilityType, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateFacilityType, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteFacilityType, withId(id)),
  },

  "measurement-unit-types": {
    list: () => req(ep.getMeasureUnitTypeList),
    one: (id) => req(ep.getMeasurementUnitType, withId(id)),
    create: (variables) => req(ep.createOrUpdateMeasurementUnitType, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateMeasurementUnitType, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteMeasurementUnitType, withId(id)),
  },

  "processing-evidence-types": {
    list: () => req(ep.getProcessingEvidenceTypeList),
    one: (id) => req(ep.getProcessingEvidenceType, withId(id)),
    create: (variables) => req(ep.createOrUpdateProcessingEvidenceType, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateProcessingEvidenceType, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteProcessingEvidenceType, withId(id)),
  },

  "processing-evidence-fields": {
    list: () => req(ep.getProcessingEvidenceFieldList),
    one: (id) => req(ep.getProcessingEvidenceField, withId(id)),
    create: (variables) => req(ep.createOrUpdateProcessingEvidenceField, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateProcessingEvidenceField, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteProcessingEvidenceField, withId(id)),
  },

  "semi-products": {
    list: () => req(ep.getSemiProductList),
    one: (id) => req(ep.getSemiProduct, withId(id)),
    create: (variables) => req(ep.createOrUpdateSemiProduct, { body: variables }),
    update: (id, variables) => req(ep.createOrUpdateSemiProduct, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteSemiProduct, withId(id)),
  },

  // The backend reads the product type id from the query string (`/{id}?id=`).
  "product-types": {
    list: () => req(ep.getProductTypes),
    one: (id) => req(ep.getProductType, { query: { id: num(id) } }),
    create: (variables) => req(ep.createProductType, { body: variables }),
    update: (id, variables) => req(ep.updateProductType, { body: { ...variables, id: num(id) } }),
    remove: (id) => req(ep.deleteProductType, { query: { id: num(id) } }),
  },
};
