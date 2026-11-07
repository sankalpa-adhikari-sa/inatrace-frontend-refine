import { Authenticated, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { AppLayout, GuestLayout } from "./components/app/app-layout";
import { CookieConsent } from "./components/app/cookie-consent";
import { DropLastSegment, LoggedInRedirect } from "./components/app/redirects";
import { RequireActive, RequireAdmin, RequireCompanyAdmin, RequireCompanyManager } from "./components/app/guards";
import { ErrorComponent } from "./components/refine-ui/layout/error-component";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";
import { Toaster } from "./components/ui/toast";
import "./App.css";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { PageLoader, documentTitle } from "./components/app/page";
import { lazyPage } from "./lib/lazy-page";
import { LOCALES } from "./lib/i18n";
import { queryClient } from "./lib/query-client";
import { PublicLayout } from "./pages/public/layout";
import { authProvider } from "./providers/auth";

// Pages are code-split per module, so public pages (B2C label page, QR redirects, landing)
// don't download the admin app, and each area loads on first visit.

// Auth
const AccountActivationPage = lazyPage(() => import("./pages/auth"), "AccountActivationPage");
const ConfirmEmailPage = lazyPage(() => import("./pages/auth"), "ConfirmEmailPage");
const LoginPage = lazyPage(() => import("./pages/auth"), "LoginPage");
const RegisterPage = lazyPage(() => import("./pages/auth"), "RegisterPage");
const ResetPasswordPage = lazyPage(() => import("./pages/auth"), "ResetPasswordPage");
const ResetPasswordRequestPage = lazyPage(() => import("./pages/auth"), "ResetPasswordRequestPage");

// Public
const B2cPage = lazyPage(() => import("./pages/public/b2c"), "B2cPage");
const B2cIntro = lazyPage(() => import("./pages/public/b2c"), "B2cIntro");
const B2cJourney = lazyPage(() => import("./pages/public/b2c"), "B2cJourney");
const B2cFairPrices = lazyPage(() => import("./pages/public/b2c"), "B2cFairPrices");
const B2cProducers = lazyPage(() => import("./pages/public/b2c"), "B2cProducers");
const B2cQuality = lazyPage(() => import("./pages/public/b2c"), "B2cQuality");
const B2cFeedback = lazyPage(() => import("./pages/public/b2c"), "B2cFeedback");
const B2cTerms = lazyPage(() => import("./pages/public/b2c"), "B2cTerms");
const B2cPrivacy = lazyPage(() => import("./pages/public/b2c"), "B2cPrivacy");
const PublicBlogPage = lazyPage(() => import("./pages/public/blog"), "PublicBlogPage");
const AppVersionPage = lazyPage(() => import("./pages/public/misc"), "AppVersionPage");
const LandingPage = lazyPage(() => import("./pages/public/misc"), "LandingPage");
const LocalePrefixRedirect = lazyPage(() => import("./pages/public/misc"), "LocalePrefixRedirect");
const QrRedirect = lazyPage(() => import("./pages/public/misc"), "QrRedirect");
const ClearCookieConsentPage = lazyPage(() => import("./pages/public/policies"), "ClearCookieConsentPage");
const CookiePolicyPage = lazyPage(() => import("./pages/public/policies"), "CookiePolicyPage");
const PrivacyPolicyPage = lazyPage(() => import("./pages/public/policies"), "PrivacyPolicyPage");
const TermsPage = lazyPage(() => import("./pages/public/policies"), "TermsPage");

// Home, profile and system admin
const HomePage = lazyPage(() => import("./pages/home"), "HomePage");
const UserDetail = lazyPage(() => import("./pages/users/detail"), "UserDetail");
const UserList = lazyPage(() => import("./pages/users/list"), "UserList");
const CompanyList = lazyPage(() => import("./pages/companies/list"), "CompanyList");
const SettingsPage = lazyPage(() => import("./pages/settings"), "SettingsPage");
const ValueChainList = lazyPage(() => import("./pages/value-chains"), "ValueChainList");
const ValueChainDetail = lazyPage(() => import("./pages/value-chains"), "ValueChainDetail");
const CurrencyList = lazyPage(() => import("./pages/currencies"), "CurrencyList");

// Company configuration
const CompanyDetail = lazyPage(() => import("./pages/companies/detail"), "CompanyDetail");
const CompanyUsers = lazyPage(() => import("./pages/companies/users"), "CompanyUsers");
const CompanyFacilities = lazyPage(() => import("./pages/companies/facilities"), "CompanyFacilities");
const FacilityForm = lazyPage(() => import("./pages/companies/facilities"), "FacilityForm");
const CompanyProcessingActions = lazyPage(() => import("./pages/companies/processing-actions"), "CompanyProcessingActions");
const ProcessingActionForm = lazyPage(() => import("./pages/companies/processing-actions"), "ProcessingActionForm");

// Stock, orders, farmers, customers, dashboard
const StockLayout = lazyPage(() => import("./pages/stock/layout"), "StockLayout");
const LegacyStockTab = lazyPage(() => import("./pages/stock/layout"), "LegacyStockTab");
const DeliveriesTab = lazyPage(() => import("./pages/stock/deliveries"), "DeliveriesTab");
const DeliveryForm = lazyPage(() => import("./pages/stock/delivery-form"), "DeliveryForm");
const BulkDeliveryForm = lazyPage(() => import("./pages/stock/bulk-delivery-form"), "BulkDeliveryForm");
const ProcessingTab = lazyPage(() => import("./pages/stock/processing-tab"), "ProcessingTab");
const ProcessingOrderForm = lazyPage(() => import("./pages/stock/processing-order"), "ProcessingOrderForm");
const PaymentsTab = lazyPage(() => import("./pages/stock/payments"), "PaymentsTab");
const PaymentFormPage = lazyPage(() => import("./pages/stock/payments"), "PaymentFormPage");
const BulkPaymentPage = lazyPage(() => import("./pages/stock/payments"), "BulkPaymentPage");
const AllStockTab = lazyPage(() => import("./pages/stock/all-stock"), "AllStockTab");
const BatchHistory = lazyPage(() => import("./pages/stock/batch-history"), "BatchHistory");
const BeycoOfferPage = lazyPage(() => import("./pages/stock/beyco"), "BeycoOfferPage");
const OrdersPage = lazyPage(() => import("./pages/orders"), "OrdersPage");
const CustomerOrderForm = lazyPage(() => import("./pages/orders"), "CustomerOrderForm");
const UserCustomerList = lazyPage(() => import("./pages/user-customers/list"), "UserCustomerList");
const UserCustomerForm = lazyPage(() => import("./pages/user-customers/form"), "UserCustomerForm");
const UserCustomerDeliveries = lazyPage(() => import("./pages/user-customers/form"), "UserCustomerDeliveries");
const UserCustomerPayments = lazyPage(() => import("./pages/user-customers/form"), "UserCustomerPayments");
const FarmerImport = lazyPage(() => import("./pages/user-customers/import"), "FarmerImport");
const CustomerList = lazyPage(() => import("./pages/customers"), "CustomerList");
const CustomerForm = lazyPage(() => import("./pages/customers"), "CustomerForm");
const CompanyDashboard = lazyPage(() => import("./pages/dashboard"), "CompanyDashboard");

// Products
const ProductList = lazyPage(() => import("./pages/products/list"), "ProductList");
const ProductPage = lazyPage(() => import("./pages/products/product-page"), "ProductPage");
const LabelRedirect = lazyPage(() => import("./pages/products/product-page"), "LabelRedirect");
const KnowledgeBlogList = lazyPage(() => import("./pages/products/knowledge-blog"), "KnowledgeBlogList");
const KnowledgeBlogForm = lazyPage(() => import("./pages/products/knowledge-blog"), "KnowledgeBlogForm");
const ProductStakeholders = lazyPage(() => import("./pages/products/stakeholders"), "ProductStakeholders");
const FinalProducts = lazyPage(() => import("./pages/products/final-products"), "FinalProducts");
const LabelBatches = lazyPage(() => import("./pages/products/label-pages"), "LabelBatches");
const BatchForm = lazyPage(() => import("./pages/products/label-pages"), "BatchForm");
const LabelFeedback = lazyPage(() => import("./pages/products/label-pages"), "LabelFeedback");
const LabelStatistics = lazyPage(() => import("./pages/products/label-pages"), "LabelStatistics");

import { dataProvider } from "./providers/data";
import { useI18nProvider } from "./providers/i18n";
import { notificationProvider } from "./providers/notification";


function App() {
  // Above <Refine>, so this uses i18next directly (useTranslate needs Refine's context).
  const { t } = useTranslation();
  const i18nProvider = useI18nProvider();
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <Toaster>
            <DevtoolsProvider>
              <Refine
                authProvider={authProvider}
                dataProvider={dataProvider}
                notificationProvider={notificationProvider}
                i18nProvider={i18nProvider}
                routerProvider={routerProvider}
                resources={[
                  { name: "companies", list: "/companies", create: "/companies/new", edit: "/companies/:id" },
                  { name: "users", list: "/users", edit: "/users/:id" },
                  { name: "value-chains", list: "/value-chains", create: "/value-chains/new", edit: "/value-chains/:id" },
                  { name: "currencies", list: "/currencies" },
                  { name: "products", list: "/product-labels" },
                ]}
                options={{
                  title: { text: t("common.descriptions.inaTrace") },
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  disableTelemetry: true,
                  reactQuery: { clientConfig: queryClient },
                }}
              >
                <CookieConsent />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Guest pages */}
                    <Route
                      element={
                        <Authenticated key="guest" fallback={<Outlet />}>
                          <LoggedInRedirect />
                        </Authenticated>
                      }
                    >
                      <Route element={<GuestLayout />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                      </Route>
                    </Route>
                    <Route element={<GuestLayout />}>
                      <Route path="/account-activation" element={<AccountActivationPage />} />
                      <Route path="/confirm-email/:token" element={<ConfirmEmailPage />} />
                      <Route path="/reset-password" element={<ResetPasswordRequestPage />} />
                      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                    </Route>
  
                    {/* Public pages (landing, policies, product label front-end, QR codes) */}
                    <Route element={<PublicLayout />}>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/s/cookies" element={<CookiePolicyPage />} />
                      <Route path="/s/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/s/terms-and-conditions" element={<TermsPage />} />
                      <Route path="/s/clear-cookies/:type/:value" element={<ClearCookieConsentPage />} />
                      <Route path="/blog/:productId/:type/:knowledgeBlogId" element={<PublicBlogPage />} />
                    </Route>
                    <Route path="/app-version" element={<AppVersionPage />} />
                    {LOCALES.map((l) => (
                      <Route key={l} path={`/${l}/*`} element={<LocalePrefixRedirect locale={l} />} />
                    ))}
                    <Route path="/p-cd/:uuid/:qrTag" element={<B2cPage />}>
                      <Route index element={<B2cIntro />} />
                      <Route path="journey" element={<B2cJourney />} />
                      <Route path="fair-prices" element={<B2cFairPrices />} />
                      <Route path="producers" element={<B2cProducers />} />
                      <Route path="quality" element={<B2cQuality />} />
                      <Route path="feedback" element={<B2cFeedback />} />
                      <Route path="terms-of-use" element={<B2cTerms />} />
                      <Route path="privacy-policy" element={<B2cPrivacy />} />
                    </Route>
                    <Route path="/q/:uuid" element={<QrRedirect />} />
                    <Route path="/q-cd/:uuid/:qrTag" element={<QrRedirect />} />
  
                    {/* Authenticated app */}
                    <Route
                      element={
                        <Authenticated key="app" fallback={<CatchAllNavigate to="/login" />}>
                          <AppLayout />
                        </Authenticated>
                      }
                    >
                      <Route path="/home" element={<RequireActive><HomePage /></RequireActive>} />
                      <Route path="/user-profile" element={<RequireActive><UserDetail /></RequireActive>} />
  
                      <Route element={<RequireAdmin />}>
                        <Route path="/companies" element={<CompanyList />} />
                        <Route path="/users" element={<UserList />} />
                        <Route path="/users/:id" element={<UserDetail />} />
                        <Route path="/settings/*" element={<SettingsPage />} />
                        <Route path="/value-chains" element={<ValueChainList />} />
                        <Route path="/value-chains/new" element={<ValueChainDetail />} />
                        <Route path="/value-chains/:id" element={<ValueChainDetail />} />
                        <Route path="/value-chains/:id/value-chain" element={<DropLastSegment />} />
                        <Route path="/currencies" element={<CurrencyList />} />
                      </Route>
  
                      <Route path="/companies/new" element={<CompanyDetail />} />
                      <Route path="/companies/:id" element={<RequireCompanyManager />}>
                        <Route index element={<Navigate to="company" replace />} />
                        <Route path="company" element={<CompanyDetail />} />
                        <Route path="users" element={<CompanyUsers />} />
                      </Route>
                      <Route path="/companies/:id" element={<RequireCompanyAdmin />}>
                        <Route path="facilities" element={<CompanyFacilities />} />
                        <Route path="facilities/add" element={<FacilityForm />} />
                        <Route path="facilities/:facilityId/edit" element={<FacilityForm />} />
                        <Route path="processingActions" element={<CompanyProcessingActions />} />
                        <Route path="processingActions/new" element={<ProcessingActionForm />} />
                        <Route path="processingActions/:paId/edit" element={<ProcessingActionForm />} />
                      </Route>
  
                      <Route element={<RequireActive />}>
                        <Route path="/my-stock" element={<StockLayout />}>
                          <Route index element={<Navigate to="deliveries" replace />} />
                          <Route path="deliveries" element={<DeliveriesTab />} />
                          <Route path="processing" element={<ProcessingTab />} />
                          <Route path="payments" element={<PaymentsTab />} />
                          <Route path="all-stock" element={<AllStockTab />} />
                        </Route>
                        <Route path="/my-stock/:tab/tab" element={<LegacyStockTab />} />
                        <Route path="/my-stock/orders/*" element={<LegacyStockTab />} />
                        <Route path="/my-stock/deliveries/facility/:facilityId/:fromTabType/new" element={<DeliveryForm />} />
                        <Route path="/my-stock/deliveries/facility/:facilityId/:fromTabType/new-bulk" element={<BulkDeliveryForm />} />
                        <Route path="/my-stock/deliveries/update/:purchaseOrderId" element={<DeliveryForm />} />
                        <Route path="/my-stock/processing/:procActionId/facility/:inputFacilityId/new" element={<ProcessingOrderForm />} />
                        <Route path="/my-stock/processing/update/:stockOrderId" element={<ProcessingOrderForm />} />
                        <Route path="/my-stock/payments/delivery/:purchaseOrderId/new" element={<PaymentFormPage />} />
                        <Route path="/my-stock/payments/customer-order/:customerOrderId/new" element={<PaymentFormPage />} />
                        <Route path="/my-stock/payments/:paymentId/update/:type" element={<PaymentFormPage />} />
                        <Route path="/my-stock/payments/deliveries/bulk-payment/update/:bulkPaymentId" element={<BulkPaymentPage />} />
                        <Route path="/my-stock/payments/deliveries/bulk-payment/:purchaseOrderIds/new/:bulkType" element={<BulkPaymentPage />} />
                        <Route path="/my-stock/all-stock/stock-order/:stockOrderId/view" element={<BatchHistory />} />
                        <Route path="/my-stock/beyco/list" element={<BeycoOfferPage />} />
                        <Route path="/my-orders" element={<Navigate to="/my-orders/received-orders" replace />} />
                        <Route path="/my-orders/received-orders" element={<OrdersPage key="received" kind="RECEIVED" />} />
                        <Route path="/my-orders/placed-orders" element={<OrdersPage key="placed" kind="PLACED" />} />
                        <Route path="/my-orders/customer-order/add" element={<CustomerOrderForm />} />
                        <Route path="/my-farmers" element={<UserCustomerList type="FARMER" />} />
                        <Route path="/my-farmers/add" element={<UserCustomerForm key="farmer-new" type="FARMER" />} />
                        <Route path="/my-farmers/edit/:id" element={<UserCustomerForm type="FARMER" />} />
                        <Route path="/my-farmers/edit/:id/deliveries" element={<UserCustomerDeliveries type="FARMER" />} />
                        <Route path="/my-farmers/edit/:id/payments" element={<UserCustomerPayments type="FARMER" />} />
                        <Route path="/my-farmers/import" element={<FarmerImport />} />
                        <Route path="/my-collectors" element={<UserCustomerList type="COLLECTOR" />} />
                        <Route path="/my-collectors/add" element={<UserCustomerForm key="collector-new" type="COLLECTOR" />} />
                        <Route path="/my-collectors/edit/:id" element={<UserCustomerForm type="COLLECTOR" />} />
                        <Route path="/my-collectors/edit/:id/deliveries" element={<UserCustomerDeliveries type="COLLECTOR" />} />
                        <Route path="/my-collectors/edit/:id/payments" element={<UserCustomerPayments type="COLLECTOR" />} />
                        <Route path="/my-customers" element={<CustomerList />} />
                        <Route path="/my-customers/add" element={<CustomerForm key="new" />} />
                        <Route path="/my-customers/edit/:id" element={<CustomerForm />} />
                        <Route path="/company-dashboard" element={<CompanyDashboard />} />
                        <Route path="/product-labels" element={<ProductList />} />
                        <Route path="/product-labels/new/:companyId/:valueChainId" element={<ProductPage mode="create" />} />
                        <Route path="/product-labels/:id" element={<ProductPage mode="labels" />} />
                        <Route path="/product-labels/:id/product" element={<ProductPage mode="product" />} />
                        <Route path="/product-labels/:id/knowledge-blog" element={<KnowledgeBlogList />} />
                        <Route path="/product-labels/:id/knowledge-blog/:type/new" element={<KnowledgeBlogForm key="new" />} />
                        <Route path="/product-labels/:id/knowledge-blog/:type/:knowledgeBlogId" element={<KnowledgeBlogForm />} />
                        <Route path="/product-labels/:id/stakeholders" element={<ProductStakeholders />} />
                        <Route path="/product-labels/:id/stakeholders/value-chain" element={<DropLastSegment />} />
                        <Route path="/product-labels/:id/final-products" element={<FinalProducts />} />
                        <Route path="/product-labels/:id/labels/:labelId" element={<LabelRedirect />} />
                        <Route path="/product-labels/:id/labels/:labelId/batches" element={<LabelBatches />} />
                        <Route path="/product-labels/:id/labels/:labelId/batches/new" element={<BatchForm key="new" />} />
                        <Route path="/product-labels/:id/labels/:labelId/batches/:batchId" element={<BatchForm />} />
                        <Route path="/product-labels/:id/labels/:labelId/feedback" element={<LabelFeedback />} />
                        <Route path="/product-labels/:id/labels/:labelId/statistics" element={<LabelStatistics />} />
                      </Route>
  
                      <Route path="*" element={<ErrorComponent />} />
                    </Route>
                  </Routes>
                </Suspense>

                <RefineKbar />
                <UnsavedChangesNotifier />
                {/* Page titles come from PageHeader (useDocumentTitle); elsewhere the tab shows the app name. */}
                <DocumentTitleHandler handler={documentTitle} />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </Toaster>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
