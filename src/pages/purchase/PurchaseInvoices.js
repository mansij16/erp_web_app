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
  const [selectedOrders, setSelectedOrders] = useState([]);
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
      date: new Date(),
      dueDate: new Date(),
      lines: [],
      landedCosts: [],
      notes: "",
    },
  });

  const { fields: lineFields, replace: replaceLines } = useFieldArray({
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

  useEffect(() => {
    fetchPurchaseInvoices();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [watchLines, watchLandedCosts, watchSGST, watchCGST, watchIGST]);

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
      const qty = Number(line.qtyRolls) || 0;
      const rate = Number(line.ratePerRoll) || 0;
      subtotal += qty * rate;
    });

    const sgstAmount = Number(watchSGST) || 0;
    const cgstAmount = Number(watchCGST) || 0;
    const igstAmount = Number(watchIGST) || 0;
    const taxAmount = sgstAmount + cgstAmount + igstAmount;

    const totalLandedCost = (watchLandedCosts || []).reduce(
      (sum, cost) => sum + (Number(cost.amount) || 0),
      0
    );
    const grandTotal = subtotal + taxAmount + totalLandedCost;

    return {
      subtotal,
      taxAmount,
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
          categoryName:
            line.categoryName || (isSkuObject ? skuInfo.categoryName : ""),
          gsm: line.gsm || (isSkuObject ? skuInfo.gsm : ""),
          qualityName:
            line.qualityName || (isSkuObject ? skuInfo.qualityName : ""),
          widthInches:
            line.widthInches || (isSkuObject ? skuInfo.widthInches : ""),
          qtyRolls: Math.max(
            (Number(line.qtyRolls) || 0) - (Number(line.invoicedQty) || 0),
            0
          ),
          ratePerRoll: Number(line.ratePerRoll) || 0,
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
    setValue("purchaseOrderIds", []);
    setValue("purchaseOrderId", "");
    replaceLines([]);
  };

  const handleOrderSelectionChange = (orderIds) => {
    setValue("purchaseOrderIds", orderIds);
    loadSelectedOrders(orderIds);
  };

  const togglePurchaseOrderSelection = (poId) => {
    const current = getValues("purchaseOrderIds") || [];
    const exists = current.includes(poId);
    const updated = exists
      ? current.filter((id) => id !== poId)
      : [...current, poId];
    handleOrderSelectionChange(updated);
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
      date: new Date(),
      dueDate: new Date(),
      lines: [],
      landedCosts: [],
      notes: "",
    });
    setPurchaseOrders([]);
    setSelectedOrders([]);
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
      date: row.date ? new Date(row.date) : new Date(),
      dueDate: row.dueDate ? new Date(row.dueDate) : new Date(),
      lines: row.lines || [],
      landedCosts: row.landedCosts || [],
      notes: row.notes || "",
    });
    setSelectedOrders([]);
    setPurchaseOrders([]);
    setOpenDialog(true);

    if (normalizedSupplierId) {
      await fetchPurchaseOrders(normalizedSupplierId);
    }
    if (normalizedPurchaseOrderId) {
      await loadSelectedOrders([normalizedPurchaseOrderId]);
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
              : "Create Purchase Invoice"}
          </DialogTitle>
          <DialogContent>
            <Grid
              container
              spacing={2}
              sx={{ mb: 2, mt: 1 }}
              columns={{ xs: 12, md: 15 }}
            >
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
                  name="date"
                  control={control}
                  rules={{ required: "Date is required" }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Invoice Date"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={!!errors.date}
                          helperText={errors.date?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="dueDate"
                  control={control}
                  rules={{ required: "Due date is required" }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Due Date"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={!!errors.dueDate}
                          helperText={errors.dueDate?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Grid
              container
              spacing={2}
              sx={{ mb: 2 }}
              columns={{ xs: 12, md: 15 }}
            >
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
                  name="lrDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="LR Date"
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
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
              columns={{ xs: 12, md: 15 }}
            >
              <Grid item xs={12} md={12}>
                <Controller
                  name="purchaseOrderIds"
                  control={control}
                  rules={{ required: "Select at least one purchase order" }}
                  render={() => null}
                />

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox"></TableCell>
                        <TableCell>PO Number</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Lines</TableCell>
                        <TableCell>Rolls</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchaseOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            No orders fetched. Select a supplier and click
                            "Fetch Orders".
                          </TableCell>
                        </TableRow>
                      )}
                      {purchaseOrders.map((po) => {
                        const totalRolls =
                          po.lines?.reduce(
                            (sum, line) => sum + (line.qtyRolls || 0),
                            0
                          ) || 0;
                        const selected = (
                          getValues("purchaseOrderIds") || []
                        ).includes(po._id);

                        return (
                          <TableRow key={po._id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selected}
                                onChange={() =>
                                  togglePurchaseOrderSelection(po._id)
                                }
                              />
                            </TableCell>
                            <TableCell>{po.poNumber}</TableCell>
                            <TableCell>
                              {po.date ? formatDate(po.date) : "-"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={po.status}
                                color={getStatusColor(po.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{po.lines?.length || 0}</TableCell>
                            <TableCell>{totalRolls}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {errors.purchaseOrderIds?.message && (
                  <FormHelperText error sx={{ mt: 1 }}>
                    {errors.purchaseOrderIds.message}
                  </FormHelperText>
                )}
              </Grid>
            </Grid>

            {selectedOrders.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Selected Orders
                </Typography>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>PO Number</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Lines</TableCell>
                        <TableCell>Rolls</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrders.map((po) => {
                        const totalRolls =
                          po.lines?.reduce(
                            (sum, line) => sum + (line.qtyRolls || 0),
                            0
                          ) || 0;

                        return (
                          <TableRow key={po._id}>
                            <TableCell>{po.poNumber}</TableCell>
                            <TableCell>
                              {po.date ? formatDate(po.date) : "-"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={po.status}
                                color={getStatusColor(po.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{po.lines?.length || 0}</TableCell>
                            <TableCell>{totalRolls}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            <Typography variant="h6" gutterBottom>
              Invoice Lines
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PO #</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>GSM</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Width</TableCell>
                    <TableCell>Qty (Rolls)</TableCell>
                    <TableCell>Rate/Roll</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineFields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>{field.poNumber || ""}</TableCell>
                      <TableCell>{field.categoryName}</TableCell>
                      <TableCell>{field.gsm}</TableCell>
                      <TableCell>{field.qualityName}</TableCell>
                      <TableCell>{field.widthInches}"</TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.qtyRolls`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              size="small"
                              sx={{ width: 80 }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.ratePerRoll`}
                          control={control}
                          render={({ field }) => (
                            <NumericFormat
                              {...field}
                              customInput={TextField}
                              size="small"
                              thousandSeparator=","
                              decimalScale={2}
                              sx={{ width: 100 }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          (Number(watchLines[index]?.qtyRolls) || 0) *
                            (Number(watchLines[index]?.ratePerRoll) || 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

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

            <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Controller
                  name="sgst"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      {...field}
                      customInput={TextField}
                      fullWidth
                      label="SGST Amount"
                      thousandSeparator=","
                      decimalScale={2}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="cgst"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      {...field}
                      customInput={TextField}
                      fullWidth
                      label="CGST Amount"
                      thousandSeparator=","
                      decimalScale={2}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="igst"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      {...field}
                      customInput={TextField}
                      fullWidth
                      label="IGST Amount"
                      thousandSeparator=","
                      decimalScale={2}
                    />
                  )}
                />
              </Grid>
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
                    SGST: {formatCurrency(totals.sgst)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    CGST: {formatCurrency(totals.cgst)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    IGST: {formatCurrency(totals.igst)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Tax Total: {formatCurrency(totals.taxAmount)}
                  </Typography>
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
