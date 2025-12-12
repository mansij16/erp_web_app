import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  FormHelperText,
  Divider,
  IconButton,
  ListItemText,
  Checkbox,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as PostIcon,
  LocalShipping as LandedCostIcon,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import purchaseService from "../../services/purchaseService";
import inventoryService from "../../services/inventoryService";
import masterService from "../../services/masterService";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../utils/formatters";

const PurchaseInvoices = () => {
  const { showNotification, setLoading } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [skus, setSkus] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [availableLines, setAvailableLines] = useState([]);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [showLandedCostsSection, setShowLandedCostsSection] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openLandedCostDialog, setOpenLandedCostDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [confirmPost, setConfirmPost] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      supplierId: "",
      purchaseOrderId: "",
      purchaseOrderIds: [],
      supplierInvoiceNumber: "",
      supplierChallanNumber: "",
      lrNumber: "",
      lrDate: new Date(),
      caseNumber: "",
      hsnCode: "",
      sgst: 0,
      cgst: 0,
      igst: 0,
      gstMode: "intra",
      date: new Date(),
      lines: [],
      landedCosts: [],
      notes: "",
    },
  });

  const {
    fields: lineFields,
    replace: replaceLines,
    append: appendLine,
  } = useFieldArray({
    control,
    name: "lines",
  });

  const {
    fields: landedCostFields,
    append: appendLandedCost,
    remove: removeLandedCost,
  } = useFieldArray({
    control,
    name: "landedCosts",
  });

  const watchLines = watch("lines");
  const watchLandedCosts = watch("landedCosts");
  const watchSGST = watch("sgst");
  const watchCGST = watch("cgst");
  const watchIGST = watch("igst");
  const watchGstMode = watch("gstMode");

  useEffect(() => {
    fetchPurchaseInvoices();
    fetchSuppliers();
    fetchSKUs();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [
    watchLines,
    watchLandedCosts,
    watchSGST,
    watchCGST,
    watchIGST,
    watchGstMode,
  ]);

  useEffect(() => {
    if ((landedCostFields || []).length === 0) {
      setShowLandedCostsSection(false);
    }
  }, [landedCostFields]);

  useEffect(() => {
    // Auto-compute SGST/CGST at 9% each on subtotal
    const subtotal = (watchLines || []).reduce((sum, line) => {
      const lineTotal =
        Number(line.lineTotal) ||
        (Number(line.qtyRolls) || 0) * (Number(line.ratePerRoll) || 0);
      return sum + (Number(lineTotal) || 0);
    }, 0);

    if (watchGstMode === "inter") {
      setValue("sgst", 0);
      setValue("cgst", 0);
      setValue("igst", subtotal * 0.18);
    } else {
      const sgstAmount = subtotal * 0.09;
      const cgstAmount = subtotal * 0.09;
      setValue("sgst", sgstAmount);
      setValue("cgst", cgstAmount);
      setValue("igst", 0);
    }
  }, [watchLines, watchGstMode, setValue]);

  const fetchPurchaseInvoices = async () => {
    setLoading(true);
    try {
      const response = await purchaseService.getPurchaseInvoices();
      setInvoices(response.data);
    } catch (error) {
      showNotification("Failed to fetch purchase invoices", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await masterService.getSuppliers({ active: true });
      setSuppliers(response?.data || response?.suppliers || []);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      setSuppliers([]);
    }
  };

  const fetchSKUs = async () => {
    try {
      const response = await masterService.getSKUs();
      setSkus(response?.data || response?.skus || response || []);
    } catch (error) {
      console.error("Failed to fetch SKUs:", error);
      showNotification("Failed to fetch SKUs", "error");
      setSkus([]);
    }
  };

  const fetchPurchaseOrders = async (supplierIdParam) => {
    const supplierId = supplierIdParam || getValues("supplierId");

    if (!supplierId) {
      showNotification("Please select a supplier to fetch orders", "warning");
      return;
    }

    setLoading(true);
    try {
      const response = await purchaseService.getPurchaseOrders({
        supplierId,
        status: ["Approved", "PartiallyReceived"],
      });

      const ordersData =
        response?.data ||
        response?.orders ||
        response?.purchaseOrders ||
        response?.rows ||
        response ||
        [];

      const normalizedOrders = Array.isArray(ordersData)
        ? ordersData
        : Array.isArray(ordersData?.data)
        ? ordersData.data
        : [];

      setPurchaseOrders(normalizedOrders);
      setAvailableLines(buildInvoiceLinesFromOrders(normalizedOrders));
      setSelectedLineIds([]);
      replaceLines([]);
      setValue("purchaseOrderIds", []);

      if (!normalizedOrders.length) {
        showNotification("No orders found for the selected supplier", "info");
      }
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
      showNotification("Failed to fetch purchase orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;

    (watchLines || []).forEach((line) => {
      const lineTotal =
        Number(line.lineTotal) ||
        (Number(line.qtyRolls) || 0) * (Number(line.ratePerRoll) || 0);
      subtotal += Number(lineTotal) || 0;
    });

    const isInterState = watchGstMode === "inter";
    const sgstAmount = isInterState ? 0 : subtotal * 0.09;
    const cgstAmount = isInterState ? 0 : subtotal * 0.09;
    const igstAmount = isInterState ? subtotal * 0.18 : 0;
    const taxAmount = sgstAmount + cgstAmount + igstAmount;

    const totalLandedCost = (watchLandedCosts || []).reduce(
      (sum, cost) => sum + (Number(cost.amount) || 0),
      0
    );
    const grandTotal = subtotal + taxAmount + totalLandedCost;

    return {
      subtotal,
      totalLandedCost,
      grandTotal,
      sgst: sgstAmount,
      cgst: cgstAmount,
      igst: igstAmount,
    };
  };

  const buildInvoiceLinesFromOrders = (orders = []) => {
    return orders.flatMap((po) =>
      (po.lines || []).map((line) => {
        const skuInfo = line.skuId;
        const isSkuObject =
          skuInfo && typeof skuInfo === "object" && !Array.isArray(skuInfo);
        const normalizedSkuId = isSkuObject ? skuInfo._id : skuInfo;

        return {
          poId: po._id,
          poNumber: po.poNumber,
          poLineId: line._id,
          skuId: normalizedSkuId || "",
          skuCode: line.skuCode || (isSkuObject ? skuInfo.skuCode : ""),
          categoryName:
            line.categoryName || (isSkuObject ? skuInfo.categoryName : ""),
          gsm: line.gsm || (isSkuObject ? skuInfo.gsm : ""),
          qualityName:
            line.qualityName || (isSkuObject ? skuInfo.qualityName : ""),
          widthInches:
            line.widthInches || (isSkuObject ? skuInfo.widthInches : ""),
          lengthMetersPerRoll:
            line.lengthMetersPerRoll ||
            (isSkuObject ? skuInfo.lengthMetersPerRoll : 0) ||
            0,
          qtyRolls: Math.max(
            (Number(line.qtyRolls) || 0) - (Number(line.invoicedQty) || 0),
            0
          ),
          ratePerRoll: Number(line.ratePerRoll) || 0,
          totalMeters:
            line.totalMeters ??
            (Number(line.lengthMetersPerRoll) || 0) *
              (Math.max(
                (Number(line.qtyRolls) || 0) - (Number(line.invoicedQty) || 0),
                0
              ) || 0),
          lineTotal:
            line.lineTotal ??
            (Math.max(
              (Number(line.qtyRolls) || 0) - (Number(line.invoicedQty) || 0),
              0
            ) || 0) * (Number(line.ratePerRoll) || 0),
          inwardRolls: 0,
          inwardMeters: 0,
          gstMode: "intra",
        };
      })
    );
  };

  const loadSelectedOrders = async (orderIds = []) => {
    if (!orderIds.length) {
      setSelectedOrders([]);
      replaceLines([]);
      setValue("purchaseOrderId", "");
      return;
    }

    setLoading(true);
    try {
      const details = await Promise.all(
        orderIds.map(async (id) => {
          const response = await purchaseService.getPurchaseOrder(id);
          return response?.data || response;
        })
      );

      setSelectedOrders(details);
      setValue("purchaseOrderId", orderIds[0] || "");
      const invoiceLines = buildInvoiceLinesFromOrders(details);
      replaceLines(invoiceLines);
    } catch (error) {
      console.error("Failed to load purchase order details", error);
      showNotification("Failed to load selected orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (supplierId) => {
    setValue("supplierId", supplierId);
    setPurchaseOrders([]);
    setSelectedOrders([]);
    setAvailableLines([]);
    setSelectedLineIds([]);
    setValue("purchaseOrderIds", []);
    setValue("purchaseOrderId", "");
    replaceLines([]);
  };

  const toggleLineSelection = (poLineId) => {
    const current = selectedLineIds || [];
    const exists = current.includes(poLineId);
    const updated = exists
      ? current.filter((id) => id !== poLineId)
      : [...current, poLineId];
    setSelectedLineIds(updated);

    const selectedLines = availableLines.filter((l) =>
      updated.includes(l.poLineId)
    );
    replaceLines(selectedLines);

    const uniquePoIds = Array.from(
      new Set(selectedLines.map((l) => l.poId).filter(Boolean))
    );
    setValue("purchaseOrderIds", uniquePoIds);
    setValue("purchaseOrderId", uniquePoIds[0] || "");
  };

  const handleManualLineSKUChange = (index, skuId) => {
    const sku =
      skus.find((s) => s._id === skuId) ||
      skus.find((s) => s.id === skuId) ||
      {};
    setValue(`lines.${index}.skuId`, skuId);
    setValue(`lines.${index}.skuCode`, sku.skuCode || "");
    setValue(`lines.${index}.categoryName`, sku.categoryName || "");
    setValue(`lines.${index}.gsm`, sku.gsm || "");
    setValue(`lines.${index}.qualityName`, sku.qualityName || "");
    setValue(`lines.${index}.widthInches`, sku.widthInches || "");
    setValue(
      `lines.${index}.lengthMetersPerRoll`,
      sku.lengthMetersPerRoll || 0
    );
  };

  const addManualLine = () => {
    const manualId = `manual-${Date.now()}`;
    appendLine({
      poNumber: "Manual",
      poLineId: manualId,
      poId: null,
      skuId: "",
      skuCode: "",
      categoryName: "",
      gsm: "",
      qualityName: "",
      widthInches: "",
      lengthMetersPerRoll: 0,
      qtyRolls: 0,
      ratePerRoll: 0,
      inwardRolls: 0,
      inwardMeters: 0,
    });
    setSelectedLineIds((prev) => [...(prev || []), manualId]);
  };

  const handleAdd = () => {
    setSelectedInvoice(null);
    reset({
      supplierId: "",
      purchaseOrderId: "",
      purchaseOrderIds: [],
      supplierInvoiceNumber: "",
      supplierChallanNumber: "",
      lrNumber: "",
      lrDate: new Date(),
      caseNumber: "",
      hsnCode: "",
      sgst: 0,
      cgst: 0,
      igst: 0,
      gstMode: "intra",
      date: new Date(),
      lines: [],
      landedCosts: [],
      notes: "",
    });
    setPurchaseOrders([]);
    setSelectedOrders([]);
    setAvailableLines([]);
    setSelectedLineIds([]);
    setShowLandedCostsSection(false);
    setOpenDialog(true);
  };

  const handleView = async (row) => {
    setSelectedInvoice(row);
    const normalizedSupplierId = row.supplierId?._id || row.supplierId || "";
    const normalizedPurchaseOrderId =
      row.purchaseOrderId?._id || row.purchaseOrderId || "";

    reset({
      supplierId: normalizedSupplierId,
      purchaseOrderId: normalizedPurchaseOrderId,
      purchaseOrderIds: normalizedPurchaseOrderId
        ? [normalizedPurchaseOrderId]
        : [],
      supplierInvoiceNumber: row.supplierInvoiceNumber || "",
      supplierChallanNumber: row.supplierChallanNumber || "",
      lrNumber: row.lrNumber || "",
      lrDate: row.lrDate ? new Date(row.lrDate) : new Date(),
      caseNumber: row.caseNumber || "",
      hsnCode: row.hsnCode || "",
      sgst: row.sgst || 0,
      cgst: row.cgst || 0,
      igst: row.igst || row.taxAmount || 0,
      gstMode: row.gstMode || "intra",
      date: row.date ? new Date(row.date) : new Date(),
      lines: row.lines || [],
      landedCosts: row.landedCosts || [],
      notes: row.notes || "",
    });
    setSelectedOrders([]);
    setPurchaseOrders([]);
    setAvailableLines([]);
    setSelectedLineIds(
      (row.lines || []).map((l) => l.poLineId || l._id || l.id).filter(Boolean)
    );
    setShowLandedCostsSection(
      Array.isArray(row.landedCosts) && row.landedCosts.length > 0
    );
    setOpenDialog(true);

    if (normalizedSupplierId) {
      await fetchPurchaseOrders(normalizedSupplierId);
    }
  };

  const handlePost = (row) => {
    if (row.status !== "Draft") {
      showNotification("Invoice is already posted", "warning");
      return;
    }
    setSelectedInvoice(row);
    setConfirmPost(true);
  };

  const confirmPostInvoice = async () => {
    try {
      // Post the invoice
      await purchaseService.postPurchaseInvoice(selectedInvoice._id);

      // Allocate landed costs to rolls
      if (
        selectedInvoice.landedCosts &&
        selectedInvoice.landedCosts.length > 0
      ) {
        for (const landedCost of selectedInvoice.landedCosts) {
          await purchaseService.allocateLandedCost(
            selectedInvoice._id,
            landedCost
          );
        }
      }

      showNotification(
        "Invoice posted and landed costs allocated successfully",
        "success"
      );
      fetchPurchaseInvoices();
    } catch (error) {
      showNotification("Failed to post invoice", "error");
    }
    setConfirmPost(false);
  };

  const handleLandedCost = (row) => {
    setSelectedInvoice(row);
    setOpenLandedCostDialog(true);
  };

  const onSubmit = async (data) => {
    try {
      const totals = calculateTotals();
      const primaryPurchaseOrderId =
        data.purchaseOrderIds?.[0] || data.purchaseOrderId || "";
      const supplierInfo =
        suppliers.find((sup) => sup._id === data.supplierId) || {};
      const subtotal = totals.subtotal || 0;
      const overallTaxRate =
        subtotal > 0 ? (totals.taxAmount / subtotal) * 100 : 0;

      const normalizedLines = (data.lines || []).map((line) => ({
        poLineId: line.poLineId,
        skuId: line.skuId,
        qtyRolls: line.qtyRolls,
        ratePerRoll: line.ratePerRoll,
        taxRate: overallTaxRate,
        inwardRolls: line.inwardRolls,
        inwardMeters: line.inwardMeters,
      }));

      const invoiceData = {
        ...data,
        ...totals,
        purchaseOrderId: primaryPurchaseOrderId,
        supplierName: supplierInfo.name || data.supplierName || "",
        lines: normalizedLines,
      };

      if (selectedInvoice) {
        await purchaseService.updatePurchaseInvoice(
          selectedInvoice._id,
          invoiceData
        );
        showNotification("Invoice updated successfully", "success");
      } else {
        await purchaseService.createPurchaseInvoice(invoiceData);
        showNotification("Invoice created successfully", "success");
      }
      setOpenDialog(false);
      fetchPurchaseInvoices();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "piNumber", headerName: "PI Number" },
    {
      field: "supplierInvoiceNumber",
      headerName: "Supplier Invoice",
    },
    { field: "supplierName", headerName: "Supplier", flex: 1 },
    {
      field: "date",
      headerName: "Date",
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: "status",
      headerName: "Status",
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: "grandTotal",
      headerName: "Total Amount",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "totalLandedCost",
      headerName: "Landed Cost",
      renderCell: (params) => formatCurrency(params.value || 0),
    },
  ];

  const customActions = [
    {
      icon: <PostIcon />,
      label: "Post Invoice",
      onClick: handlePost,
      show: (row) => row.status === "Draft",
    },
    {
      icon: <LandedCostIcon />,
      label: "Landed Cost",
      onClick: handleLandedCost,
    },
  ];

  const totals = calculateTotals();

  return (
    <Box>
      <DataTable
        title="Purchase Invoices"
        columns={columns}
        rows={invoices}
        onAdd={handleAdd}
        onView={handleView}
        customActions={customActions}
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="lg"
        fullWidth
        fullScreen
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedInvoice
              ? `Invoice: ${selectedInvoice.piNumber}`
              : "Add Purchase Invoice"}
          </DialogTitle>
          <DialogContent>
            <Grid
              container
              spacing={2}
              sx={{ mb: 2, mt: 1 }}
              columns={{ xs: 12, md: 12 }}
            >
              <Grid item xs={12} md={3}>
                <Controller
                  name="date"
                  control={control}
                  rules={{ required: "Date is required" }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Invoice Date"
                      sx={{ width: "100%" }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.date,
                          helperText: errors.date?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="supplierInvoiceNumber"
                  control={control}
                  rules={{ required: "Supplier invoice number is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Supplier Invoice Number"
                      error={!!errors.supplierInvoiceNumber}
                      helperText={errors.supplierInvoiceNumber?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="supplierChallanNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Supplier Challan No."
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="supplierId"
                  control={control}
                  rules={{ required: "Supplier is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Supplier"
                      error={!!errors.supplierId}
                      helperText={errors.supplierId?.message}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      disabled={!!selectedInvoice}
                    >
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier._id} value={supplier._id}>
                          {supplier.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>

            <Grid
              container
              spacing={2}
              sx={{ mb: 2 }}
              columns={{ xs: 12, md: 12 }}
            >
              <Grid item xs={12} md={3}>
                <Controller
                  name="lrDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="LR Date"
                      sx={{ width: "100%" }}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="lrNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="LR No." />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="caseNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Case No." />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="hsnCode"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="HSN Code" />
                  )}
                />
              </Grid>

              <Grid
                item
                xs={12}
                md={3}
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => fetchPurchaseOrders()}
                  disabled={!getValues("supplierId")}
                >
                  Fetch Orders
                </Button>
              </Grid>
            </Grid>

            <Grid
              container
              spacing={2}
              sx={{ mb: 2 }}
              columns={{ xs: 12, md: 12 }}
            >
              <Grid item xs={12} md={12}>
                <Controller
                  name="purchaseOrderIds"
                  control={control}
                  render={() => null}
                />

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox"></TableCell>
                        <TableCell>PO Number</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Base Rate</TableCell>
                        <TableCell>Meter/Roll</TableCell>
                        <TableCell>Roll Quantity</TableCell>
                        <TableCell>Total Meters</TableCell>
                        <TableCell>Total Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {availableLines.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            No lines to show. Select a supplier and click "Fetch
                            Orders".
                          </TableCell>
                        </TableRow>
                      )}
                      {availableLines.map((line) => {
                        const totalMeters = line?.totalMeters;
                        const totalAmount = line?.lineTotal;
                        const selected = selectedLineIds.includes(
                          line.poLineId
                        );

                        return (
                          <TableRow key={line.poLineId} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selected}
                                onChange={() =>
                                  toggleLineSelection(line.poLineId)
                                }
                              />
                            </TableCell>
                            <TableCell>{line.poNumber}</TableCell>
                            <TableCell>{line.skuCode || line.skuId}</TableCell>
                            <TableCell>
                              {formatCurrency(line.ratePerRoll)}
                            </TableCell>
                            <TableCell>{line.lengthMetersPerRoll}</TableCell>
                            <TableCell>{line.qtyRolls}</TableCell>
                            <TableCell>{line?.totalMeters}</TableCell>
                            <TableCell>{formatCurrency(totalAmount)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>

            {lineFields.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom>
                  Selected Lines
                </Typography>

                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>PO Number</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Base Rate</TableCell>
                        <TableCell>Meter/Roll</TableCell>
                        <TableCell>Roll Quantity</TableCell>
                        <TableCell>Total Meters</TableCell>
                        <TableCell>Total Amount</TableCell>
                        <TableCell>Inward Rolls</TableCell>
                        <TableCell>Inward Meters</TableCell>
                        <TableCell>Balance Order</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineFields.map((field, index) => {
                        const isManual =
                          (!field.poId && field.poNumber === "Manual") ||
                          field.poLineId?.toString().startsWith("manual-");
                        const watchLine = watchLines[index] || {};
                        const normalizedSkuId =
                          watchLine.skuId?._id ||
                          watchLine.skuId ||
                          field.skuId ||
                          "";
                        const totalMeters =
                          (Number(watchLine.lengthMetersPerRoll) || 0) *
                          (Number(watchLine.qtyRolls) || 0);
                        const totalAmount =
                          watchLine.lineTotal ??
                          field.lineTotal ??
                          (Number(watchLine.qtyRolls) || 0) *
                            (Number(watchLine.ratePerRoll) || 0);
                        const balanceOrder =
                          (Number(watchLine.qtyRolls) || 0) -
                          (Number(watchLine.inwardRolls) || 0);

                        return (
                          <TableRow key={field.id}>
                            <TableCell>{field.poNumber || ""}</TableCell>
                            <TableCell>
                              {isManual ? (
                                <TextField
                                  select
                                  size="small"
                                  fullWidth
                                  value={normalizedSkuId}
                                  onChange={(e) =>
                                    handleManualLineSKUChange(
                                      index,
                                      e.target.value
                                    )
                                  }
                                >
                                  {skus.map((sku) => (
                                    <MenuItem key={sku._id} value={sku._id}>
                                      {sku.skuCode}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              ) : (
                                field.skuCode || field.skuId
                              )}
                            </TableCell>
                            <TableCell>
                              {isManual ? (
                                <NumericFormat
                                  value={watchLine.ratePerRoll}
                                  customInput={TextField}
                                  size="small"
                                  thousandSeparator=","
                                  decimalScale={2}
                                  sx={{ width: 110 }}
                                  onValueChange={(values) =>
                                    setValue(
                                      `lines.${index}.ratePerRoll`,
                                      Number(values.value) || 0
                                    )
                                  }
                                />
                              ) : (
                                formatCurrency(field.ratePerRoll)
                              )}
                            </TableCell>
                            <TableCell>
                              {isManual ? (
                                <Controller
                                  name={`lines.${index}.lengthMetersPerRoll`}
                                  control={control}
                                  render={({ field }) => (
                                    <TextField
                                      {...field}
                                      type="number"
                                      size="small"
                                      sx={{ width: 110 }}
                                    />
                                  )}
                                />
                              ) : (
                                field.lengthMetersPerRoll
                              )}
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.qtyRolls`}
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    type="number"
                                    size="small"
                                    sx={{ width: 90 }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>{totalMeters}</TableCell>
                            <TableCell>{formatCurrency(totalAmount)}</TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.inwardRolls`}
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    type="number"
                                    size="small"
                                    sx={{ width: 90 }}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      field.onChange(val);
                                      const metersPerRoll =
                                        Number(
                                          watchLines[index]?.lengthMetersPerRoll
                                        ) || 0;
                                      setValue(
                                        `lines.${index}.inwardMeters`,
                                        val * metersPerRoll
                                      );
                                    }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`lines.${index}.inwardMeters`}
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    value={
                                      Number(watchLines[index]?.inwardMeters) ||
                                      0
                                    }
                                    size="small"
                                    sx={{ width: 100 }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>{balanceOrder}</TableCell>
                          </TableRow>
                        );
                      })}
                      {lineFields.length > 0 && (
                        <TableRow sx={{ fontWeight: 600, bgcolor: "grey.100" }}>
                          <TableCell colSpan={4}>Totals</TableCell>
                          <TableCell>
                            {lineFields.reduce(
                              (sum, _, idx) =>
                                sum + (Number(watchLines[idx]?.qtyRolls) || 0),
                              0
                            )}
                          </TableCell>
                          <TableCell>
                            {lineFields.reduce(
                              (sum, _, idx) =>
                                sum +
                                (Number(watchLines[idx]?.lengthMetersPerRoll) ||
                                  0) *
                                  (Number(watchLines[idx]?.qtyRolls) || 0),
                              0
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              lineFields.reduce((sum, _, idx) => {
                                const lineTotal =
                                  watchLines[idx]?.lineTotal ??
                                  lineFields[idx]?.lineTotal ??
                                  (Number(watchLines[idx]?.qtyRolls) || 0) *
                                    (Number(watchLines[idx]?.ratePerRoll) || 0);
                                return sum + (Number(lineTotal) || 0);
                              }, 0)
                            )}
                          </TableCell>
                          <TableCell>
                            {lineFields.reduce(
                              (sum, _, idx) =>
                                sum +
                                (Number(watchLines[idx]?.inwardRolls) || 0),
                              0
                            )}
                          </TableCell>
                          <TableCell>
                            {lineFields.reduce(
                              (sum, _, idx) =>
                                sum +
                                (Number(watchLines[idx]?.inwardMeters) || 0),
                              0
                            )}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={addManualLine}
                  >
                    Add Line
                  </Button>
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="h6">Landed Costs</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() =>
                  appendLandedCost({
                    type: "Freight",
                    amount: 0,
                    allocationBasis: "ROLL",
                    description: "",
                  })
                }
                size="small"
              >
                Add Landed Cost
              </Button>
            </Box>

            {landedCostFields.length > 0 && (
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Allocation Basis</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {landedCostFields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            name={`landedCosts.${index}.type`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                select
                                size="small"
                                fullWidth
                              >
                                <MenuItem value="Freight">Freight</MenuItem>
                                <MenuItem value="Duty">Duty</MenuItem>
                                <MenuItem value="Clearing">Clearing</MenuItem>
                                <MenuItem value="Misc">Misc</MenuItem>
                              </TextField>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`landedCosts.${index}.amount`}
                            control={control}
                            render={({ field }) => (
                              <NumericFormat
                                {...field}
                                customInput={TextField}
                                size="small"
                                thousandSeparator=","
                              decimalScale={2}
                              valueIsNumericString
                              onValueChange={(values) =>
                                field.onChange(values.value)
                              }
                                sx={{ width: 120 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`landedCosts.${index}.allocationBasis`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                select
                                size="small"
                                fullWidth
                              >
                                <MenuItem value="ROLL">Per Roll</MenuItem>
                                <MenuItem value="METER">Per Meter</MenuItem>
                                <MenuItem value="VALUE">By Value</MenuItem>
                              </TextField>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`landedCosts.${index}.description`}
                            control={control}
                            render={({ field }) => (
                              <TextField {...field} size="small" fullWidth />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => removeLandedCost(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Controller
                  name="gstMode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="GST Mode"
                      helperText="Choose intra (CGST+SGST 9% each) or inter (IGST 18%)"
                    >
                      <MenuItem value="intra">Intra-State (CGST+SGST)</MenuItem>
                      <MenuItem value="inter">Inter-State (IGST)</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              {watchGstMode === "inter" ? (
                <Grid item xs={12} md={8}>
                  <TextField fullWidth label="IGST" value="18%" disabled />
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="SGST" value="9%" disabled />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="CGST" value="9%" disabled />
                  </Grid>
                </>
              )}
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Notes"
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Subtotal: {formatCurrency(totals.subtotal)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {watchGstMode === "inter"
                      ? `IGST (18%): ${formatCurrency(totals.igst)}`
                      : `SGST (9%): ${formatCurrency(totals.sgst)}`}
                  </Typography>
                  {watchGstMode !== "inter" && (
                    <Typography variant="body2" gutterBottom>
                      CGST (9%): {formatCurrency(totals.cgst)}
                    </Typography>
                  )}
                  <Typography variant="body2" gutterBottom>
                    Landed Cost: {formatCurrency(totals.totalLandedCost)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6">
                    Grand Total: {formatCurrency(totals.grandTotal)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                !!selectedInvoice && selectedInvoice.status === "Posted"
              }
            >
              {selectedInvoice ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmPost}
        onClose={() => setConfirmPost(false)}
        onConfirm={confirmPostInvoice}
        title="Post Invoice"
        message="Are you sure you want to post this invoice? This will update inventory costs and create accounting entries."
        confirmColor="primary"
      />
    </Box>
  );
};

export default PurchaseInvoices;
