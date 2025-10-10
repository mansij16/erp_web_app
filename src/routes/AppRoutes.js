import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "../components/common/Layout";
import LoadingSpinner from "../components/common/LoadingSpinner";

// Lazy load components
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Categories = lazy(() => import("../pages/masters/Categories"));
const Products = lazy(() => import("../pages/masters/Products"));
const SKUs = lazy(() => import("../pages/masters/SKUs"));
const Suppliers = lazy(() => import("../pages/masters/Suppliers"));
const Customers = lazy(() => import("../pages/masters/Customers"));
const PurchaseOrders = lazy(() => import("../pages/purchase/PurchaseOrders"));
const GRNs = lazy(() => import("../pages/purchase/GRNs"));
const PurchaseInvoices = lazy(() =>
  import("../pages/purchase/PurchaseInvoices")
);
const Rolls = lazy(() => import("../pages/inventory/Rolls"));
const UnmappedRolls = lazy(() => import("../pages/inventory/UnmappedRolls"));
// const StockSummary = lazy(() => import("../pages/inventory/StockSummary"));
// const SalesOrders = lazy(() => import("../pages/sales/SalesOrders"));
// const DeliveryChallans = lazy(() => import("../pages/sales/DeliveryChallans"));
// const SalesInvoices = lazy(() => import("../pages/sales/SalesInvoices"));
// const Payments = lazy(() => import("../pages/accounting/Payments"));
// const Vouchers = lazy(() => import("../pages/accounting/Vouchers"));
// const Ledgers = lazy(() => import("../pages/accounting/Ledgers"));
// const TrialBalance = lazy(() => import("../pages/reports/TrialBalance"));
// const ProfitLoss = lazy(() => import("../pages/reports/ProfitLoss"));
// const BalanceSheet = lazy(() => import("../pages/reports/BalanceSheet"));
// const ARAgingReport = lazy(() => import("../pages/reports/ARAgingReport"));
// const StockReport = lazy(() => import("../pages/reports/StockReport"));

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />

          <Route path="categories" element={<Categories />} />
          <Route path="products" element={<Products />} />
          <Route path="skus" element={<SKUs />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="customers" element={<Customers />} />

          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="grns" element={<GRNs />} />
          <Route path="purchase-invoices" element={<PurchaseInvoices />} />

          <Route path="rolls" element={<Rolls />} />
          <Route path="unmapped-rolls" element={<UnmappedRolls />} />
          {/* <Route path="stock-summary" element={<StockSummary />} />

          <Route path="sales-orders" element={<SalesOrders />} />
          <Route path="delivery-challans" element={<DeliveryChallans />} />
          <Route path="sales-invoices" element={<SalesInvoices />} />

          <Route path="payments" element={<Payments />} />
          <Route path="vouchers" element={<Vouchers />} />
          <Route path="ledgers" element={<Ledgers />} />

          <Route path="reports">
            <Route path="trial-balance" element={<TrialBalance />} />
            <Route path="profit-loss" element={<ProfitLoss />} />
            <Route path="balance-sheet" element={<BalanceSheet />} />
            <Route path="ar-aging" element={<ARAgingReport />} />
            <Route path="stock" element={<StockReport />} />
          </Route>  */}
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
