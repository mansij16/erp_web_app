import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  IconButton,
  Typography,
  Chip,
  Divider,
  Alert,
  Tooltip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as ConfirmIcon,
  Cancel as CancelIcon,
  CreditCard as CreditCheckIcon,
  Calculate as CalculateIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import salesService from "../../services/salesService";
import masterService from "../../services/masterService";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../utils/formatters";

const SalesOrders = () => {
  const { showNotification, setLoading } = useApp();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [skus, setSKUs] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [creditCheckResult, setCreditCheckResult] = useState(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      customerId: "",
      date: new Date(),
      lines: [
        {
          skuId: "",
          categoryName: "",
          gsm: "",
          qualityName: "",
          widthInches: "",
          lengthMetersPerRoll: 0,
          qtyRolls: 0,
          derivedRatePerRoll: 0,
          overrideRatePerRoll: null,
          finalRatePerRoll: 0,
          taxRate: 18,
          lineTotal: 0,
        },
      ],
      discountPercent: 0,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const formatDisplayValue = useCallback((val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string" || typeof val === "number") return val;
    if (typeof val === "object") {
      return (
        val.companyName ||
        val.name ||
        val.value ||
        val.label ||
        val.title ||
        val.customerCode ||
        val.code ||
        val._id ||
        ""
      );
    }
    return "";
  }, []);

  const normalizeTaxRate = useCallback((tax) => {
    const raw =
      (tax && typeof tax === "object" && (tax.value ?? tax.rate)) ?? tax ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }, []);

  const normalizeId = useCallback((val) => {
    if (val && typeof val === "object") {
      return val._id || val.id || val.value || "";
    }
    return val || "";
  }, []);

  const normalizeLine = useCallback(
    (line = {}) => ({
      ...line,
      taxRate: normalizeTaxRate(line.taxRate),
      skuId: normalizeId(line.skuId),
    }),
    [normalizeId, normalizeTaxRate]
  );

  const toNumber = useCallback((val) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  }, []);

  const watchCustomerId = watch("customerId");
  const watchLines = watch("lines");
  const watchDiscountPercent = watch("discountPercent");

  const pendingLimit = useMemo(() => {
    const limit =
      creditCheckResult?.creditLimit ??
      selectedCustomer?.creditPolicy?.creditLimit ??
      0;
    const exposure = creditCheckResult?.exposure ?? 0;
    return limit - exposure;
  }, [creditCheckResult, selectedCustomer]);

  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
    fetchSKUs();
  }, []);

  useEffect(() => {
    if (watchCustomerId) {
      const customer = customers.find((c) => c._id === watchCustomerId);
      setSelectedCustomer(customer);
      checkCustomerCredit(watchCustomerId);
    }
  }, [watchCustomerId, customers]);

  const fetchSalesOrders = async () => {
    setLoading(true);
    try {
      const response = await salesService.getSalesOrders();
      setOrders(response.data);
    } catch (error) {
      showNotification("Failed to fetch sales orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await masterService.getCustomers({ active: true });
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchSKUs = async () => {
    try {
      const response = await masterService.getSKUs({ active: true });
      setSKUs(response.skus || []);
    } catch (error) {
      console.error("Failed to fetch SKUs:", error);
    }
  };

  const checkCustomerCredit = async (customerId) => {
    try {
      const response = await masterService.checkCredit(customerId);
      setCreditCheckResult(response.data);
      if (response.data.blocked) {
        showNotification("Warning: Customer credit blocked!", "warning");
      }
    } catch (error) {
      console.error("Credit check failed:", error);
    }
  };

  // 44" Pricing Algorithm
  const calculateDerivedRate = useCallback(
    (baseRate44, targetWidth) => {
      const base = toNumber(baseRate44);
      const width = toNumber(targetWidth);
      if (!base || !width) return 0;
      const ratio = width / 44;
      const derivedRate = base * ratio;
      return Math.round(derivedRate);
    },
    [toNumber]
  );

  // Calculate pricing for a single line
  const calculateLinePrice = useCallback(
    (line, baseRate44, discountPercent) => {
      const derivedRate = calculateDerivedRate(baseRate44, line?.widthInches);
      const hasOverride =
        line?.overrideRatePerRoll !== null &&
        line?.overrideRatePerRoll !== undefined &&
        line?.overrideRatePerRoll !== "";
      const finalRate = hasOverride
        ? toNumber(line?.overrideRatePerRoll)
        : derivedRate;

      const lineSubtotal = toNumber(line?.qtyRolls) * finalRate;
      const lineDiscount = (lineSubtotal * toNumber(discountPercent)) / 100;
      const taxableAmount = lineSubtotal - lineDiscount;
      const taxRate = normalizeTaxRate(line?.taxRate);
      const lineTax = (taxableAmount * taxRate) / 100;
      const lineTotal = taxableAmount + lineTax;

      return {
        derivedRate,
        finalRate,
        lineTotal,
      };
    },
    [calculateDerivedRate, normalizeTaxRate, toNumber]
  );

  const computeTotals = useCallback(
    (lines = [], discountPercent = 0, baseRate44 = 0) => {
      let subtotal = 0;
      let discountAmount = 0;
      let taxAmount = 0;

      lines.forEach((line) => {
        if (line?.widthInches && line?.qtyRolls) {
          const pricing = calculateLinePrice(line, baseRate44, discountPercent);
          const lineSubtotal = toNumber(line?.qtyRolls) * pricing.finalRate;
          const lineDiscount =
            (lineSubtotal * toNumber(discountPercent)) / 100;
          const taxableAmount = lineSubtotal - lineDiscount;
          const lineTax =
            (taxableAmount * normalizeTaxRate(line?.taxRate)) / 100;

          subtotal += lineSubtotal;
          discountAmount += lineDiscount;
          taxAmount += lineTax;
        }
      });

      return {
        subtotal,
        discountAmount,
        taxAmount,
        total: subtotal - discountAmount + taxAmount,
      };
    },
    [calculateLinePrice, normalizeTaxRate, toNumber]
  );

  const [totals, setTotals] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 0,
  });

  useEffect(() => {
    const subscription = watch((value) => {
      const baseRate = selectedCustomer?.baseRate44 || 0;
      setTotals(
        computeTotals(value?.lines || [], value?.discountPercent, baseRate)
      );
    });

    return () => subscription.unsubscribe();
  }, [watch, selectedCustomer, computeTotals]);

  useEffect(() => {
    const baseRate = selectedCustomer?.baseRate44 || 0;
    setTotals(computeTotals(watchLines, watchDiscountPercent, baseRate));
  }, [selectedCustomer, watchLines, watchDiscountPercent, computeTotals]);

  const handleAdd = () => {
    setSelectedOrder(null);
    setSelectedCustomer(null);
    setCreditCheckResult(null);
    reset({
      customerId: "",
      date: new Date(),
      lines: [
        normalizeLine({
          skuId: "",
          categoryName: "",
          gsm: "",
          qualityName: "",
          widthInches: "",
          lengthMetersPerRoll: 0,
          qtyRolls: 0,
          derivedRatePerRoll: 0,
          overrideRatePerRoll: null,
          finalRatePerRoll: 0,
          taxRate: 18,
          lineTotal: 0,
        }),
      ],
      discountPercent: 0,
      notes: "",
    });
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    if (row.status !== "Draft") {
      showNotification("Can only edit draft orders", "warning");
      return;
    }
    setSelectedOrder(row);
    reset({
      customerId: normalizeId(row.customerId),
      date: new Date(row.date),
      lines: (row.lines || []).map((line) =>
        normalizeLine({
          ...line,
          skuId: normalizeId(line.skuId),
        })
      ),
      discountPercent: row.discountPercent || 0,
      notes: row.notes || "",
    });
    setOpenDialog(true);
  };

  const handleSKUChange = (index, skuId) => {
    const sku = skus.find((s) => s._id === skuId);
    if (sku) {
      const currentLine = watchLines[index] || {};
      const product = sku.productId || sku.product; // Handle both populated and direct reference
      const defaultLength =
        product?.defaultLengthMeters ?? sku.lengthMetersPerRoll ?? "";

      const categoryName =
        product?.categoryId?.name ||
        product?.category?.name ||
        sku.categoryName ||
        "";
      const gsm =
        product?.gsmId?.name ||
        product?.gsm?.name ||
        sku.gsm ||
        "";
      const qualityName =
        product?.qualityId?.name ||
        product?.quality?.name ||
        sku.qualityName ||
        "";

      const updatedLine = normalizeLine({
        ...currentLine,
        skuId: skuId,
        categoryName,
        gsm,
        qualityName,
        widthInches: sku.widthInches,
        lengthMetersPerRoll: defaultLength,
        taxRate: normalizeTaxRate(sku.taxRate),
      });

      // Calculate pricing (derived/final/lineTotal)
      const pricing = calculateLinePrice(
        updatedLine,
        selectedCustomer?.baseRate44,
        watchDiscountPercent
      );

      setValue(`lines.${index}`, {
        ...updatedLine,
        derivedRatePerRoll: pricing.derivedRate,
        finalRatePerRoll: pricing.finalRate,
        lineTotal: pricing.lineTotal,
      });
    }
  };

  const handleQtyChange = (index, qty) => {
    const updatedLine = { ...watchLines[index], qtyRolls: qty };
    setValue(`lines.${index}.qtyRolls`, qty);

    const pricing = calculateLinePrice(
      updatedLine,
      selectedCustomer?.baseRate44,
      watchDiscountPercent
    );
    setValue(`lines.${index}.derivedRatePerRoll`, pricing.derivedRate);
    setValue(`lines.${index}.finalRatePerRoll`, pricing.finalRate);
    setValue(`lines.${index}.lineTotal`, pricing.lineTotal);
  };

  const handleOverrideRateChange = (index, overrideRate) => {
    setValue(`lines.${index}.overrideRatePerRoll`, overrideRate);

    const line = { ...watchLines[index], overrideRatePerRoll: overrideRate };
    const pricing = calculateLinePrice(
      line,
      selectedCustomer?.baseRate44,
      watchDiscountPercent
    );
    setValue(`lines.${index}.finalRatePerRoll`, pricing.finalRate);
    setValue(`lines.${index}.lineTotal`, pricing.lineTotal);
  };

  const handleConfirm = (row) => {
    setSelectedOrder(row);
    setConfirmAction({
      type: "confirm",
      message: "Are you sure you want to confirm this order?",
    });
  };

  const handleCancel = (row) => {
    setSelectedOrder(row);
    setConfirmAction({
      type: "cancel",
      message: "Are you sure you want to cancel this order?",
    });
  };

  const confirmActionHandler = async () => {
    try {
      switch (confirmAction.type) {
        case "confirm":
          await salesService.confirmSalesOrder(selectedOrder._id);
          showNotification("Sales order confirmed successfully", "success");
          break;
        case "cancel":
          await salesService.cancelSalesOrder(selectedOrder._id);
          showNotification("Sales order cancelled successfully", "success");
          break;
      }
      fetchSalesOrders();
    } catch (error) {
      showNotification(`Failed to ${confirmAction.type} order`, "error");
    }
    setConfirmAction(null);
  };

  const onSubmit = async (data) => {
    try {
      if (creditCheckResult?.blocked) {
        showNotification(
          "Cannot create order - Customer credit blocked",
          "error"
        );
        return;
      }

      // Calculate final values for each line
      const processedLines = data.lines.map((line) => {
        if (selectedCustomer && line.widthInches) {
          const pricing = calculateLinePrice(
            { ...line, taxRate: normalizeTaxRate(line.taxRate) },
            selectedCustomer.baseRate44,
            data.discountPercent
          );
          return {
            ...normalizeLine(line),
            derivedRatePerRoll: pricing.derivedRate,
            finalRatePerRoll: pricing.finalRate,
            lineTotal: pricing.lineTotal,
            totalMeters: line.lengthMetersPerRoll * line.qtyRolls,
          };
        }
        return normalizeLine(line);
      });

      const finalTotals = computeTotals(
        processedLines,
        data.discountPercent,
        selectedCustomer?.baseRate44 || 0
      );

      const orderData = {
        ...data,
        lines: processedLines,
        ...finalTotals,
        creditCheckPassed: !creditCheckResult?.blocked,
        creditCheckNotes: creditCheckResult?.reasons?.join("; "),
      };

      if (selectedOrder) {
        await salesService.updateSalesOrder(selectedOrder._id, orderData);
        showNotification("Sales order updated successfully", "success");
      } else {
        await salesService.createSalesOrder(orderData);
        showNotification("Sales order created successfully", "success");
      }
      setOpenDialog(false);
      fetchSalesOrders();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "soNumber", headerName: "SO Number" },
    {
      field: "customerName",
      headerName: "Customer",
      flex: 1,
      renderCell: (params) => {
        return formatDisplayValue(params.value);
      },
    },
    {
      field: "date",
      headerName: "Date",
      renderCell: (params) => {
        const val = formatDisplayValue(params.value);
        return formatDate(val);
      },
    },
    {
      field: "status",
      headerName: "Status",
      renderCell: (params) => {
        const statusLabel = formatDisplayValue(params.value);
        return (
          <Chip
            label={statusLabel}
            color={getStatusColor(statusLabel)}
            size="small"
          />
        );
      },
    },
    {
      field: "creditCheckPassed",
      headerName: "Credit",
      renderCell: (params) => {
        const passed = Boolean(params.value);
        const label = passed ? "Credit check passed" : "Credit check blocked";
        return (
          <Tooltip title={label} arrow>
            {passed ? (
              <ConfirmIcon color="success" />
            ) : (
              <WarningIcon color="error" />
            )}
          </Tooltip>
        );
      },
    },
    {
      field: "total",
      headerName: "Total Amount",
      renderCell: (params) => {
        const val = formatDisplayValue(params.value);
        const num = Number(val) || 0;
        return formatCurrency(num);
      },
    },
  ];

  const customActions = [
    {
      icon: <ConfirmIcon />,
      label: "Confirm",
      onClick: handleConfirm,
      show: (row) => row.status === "Draft",
    },
    {
      icon: <CancelIcon />,
      label: "Cancel",
      onClick: handleCancel,
      show: (row) => ["Draft", "Confirmed"].includes(row.status),
    },
  ];

  return (
    <Box>
      <DataTable
        title="Sales Orders"
        columns={columns}
        rows={orders}
        onAdd={handleAdd}
        onEdit={handleEdit}
        customActions={customActions.filter(
          (action) => !action.show || action.show
        )}
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedOrder
              ? `Edit Sales Order: ${selectedOrder.soNumber}`
              : "Add Sales Order"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="customerId"
                  control={control}
                  rules={{ required: "Customer is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Customer"
                      error={!!errors.customerId}
                      helperText={errors.customerId?.message}
                    >
                      {customers.map((customer) => (
                        <MenuItem key={customer._id} value={customer._id}>
                          {customer.companyName ||
                            customer.customerCode ||
                            "Customer"}{" "}
                          ({customer.customerCode || "N/A"})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="date"
                  control={control}
                  rules={{ required: "Date is required" }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Order Date"
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
            </Grid>

            {creditCheckResult && (
              <Alert
                severity={creditCheckResult.blocked ? "error" : "success"}
                sx={{ mb: 2 }}
                action={
                  <Button
                    size="small"
                    onClick={() => setShowCreditDialog(true)}
                  >
                    Details
                  </Button>
                }
              >
                {creditCheckResult.blocked
                  ? "Customer credit blocked!"
                  : "Credit check passed"}
              </Alert>
            )}

            {selectedCustomer && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12} md={2.4}>
                    <Typography variant="caption" color="text.secondary">
                      Base Rate (44")
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(selectedCustomer.baseRate44)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <Typography variant="caption" color="text.secondary">
                      Credit Limit
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(
                        selectedCustomer.creditPolicy?.creditLimit || 0
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <Typography variant="caption" color="text.secondary">
                      Pending Limit
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(pendingLimit)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <Typography variant="caption" color="text.secondary">
                      Credit Days
                    </Typography>
                    <Typography variant="body1">
                      {selectedCustomer.creditPolicy?.creditDays || 0} days
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={2.4}>
                    <Typography variant="caption" color="text.secondary">
                      Customer Group
                    </Typography>
                    <Typography variant="body1">
                      {selectedCustomer.customerGroupId?.name ||
                        selectedCustomer.customerGroup?.name ||
                        "-"}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <Typography variant="h6" gutterBottom>
              Order Lines
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>GSM</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Width"</TableCell>
                    <TableCell>Length/Roll</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Derived Rate</TableCell>
                    <TableCell>Override Rate</TableCell>
                    <TableCell>Final Rate</TableCell>
                    <TableCell>Tax%</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, index) => {
                    const line = watchLines[index] || {};
                    const pricing = calculateLinePrice(
                      line,
                      selectedCustomer?.baseRate44,
                      watchDiscountPercent
                    );

                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            name={`lines.${index}.skuId`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                select
                                size="small"
                                fullWidth
                                onChange={(e) =>
                                  handleSKUChange(index, e.target.value)
                                }
                              >
                                <MenuItem value="">Select</MenuItem>
                                {skus.map((sku) => (
                                  <MenuItem key={sku._id} value={sku._id}>
                                    {sku.skuCode}
                                  </MenuItem>
                                ))}
                              </TextField>
                            )}
                          />
                        </TableCell>
                        <TableCell>{formatDisplayValue(line?.categoryName)}</TableCell>
                        <TableCell>{formatDisplayValue(line?.gsm)}</TableCell>
                        <TableCell>{formatDisplayValue(line?.qualityName)}</TableCell>
                        <TableCell>{formatDisplayValue(line?.widthInches)}</TableCell>
                        <TableCell>
                          <Controller
                            name={`lines.${index}.lengthMetersPerRoll`}
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
                            name={`lines.${index}.qtyRolls`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                size="small"
                                sx={{ width: 60 }}
                                onChange={(e) =>
                                  handleQtyChange(index, e.target.value)
                                }
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Calculated from 44 inch base rate">
                            <Typography variant="body2">
                      {formatCurrency(formatDisplayValue(pricing.derivedRate))}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`lines.${index}.overrideRatePerRoll`}
                            control={control}
                            render={({ field }) => (
                              <NumericFormat
                                {...field}
                                customInput={TextField}
                                size="small"
                                thousandSeparator=","
                                decimalScale={2}
                                sx={{ width: 100 }}
                                placeholder="Optional"
                                onValueChange={(values) =>
                                  handleOverrideRateChange(
                                    index,
                                    values.floatValue
                                  )
                                }
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(formatDisplayValue(pricing.finalRate))}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`lines.${index}.taxRate`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                size="small"
                                sx={{ width: 60 }}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const updatedLine = {
                                    ...watchLines[index],
                                    taxRate: e.target.value,
                                  };
                                  const updatedPricing = calculateLinePrice(
                                    updatedLine,
                                    selectedCustomer?.baseRate44,
                                    watchDiscountPercent
                                  );
                                  setValue(
                                    `lines.${index}.lineTotal`,
                                    updatedPricing.lineTotal
                                  );
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(formatDisplayValue(pricing.lineTotal))}
                        </TableCell>
                        <TableCell>
                          {fields.length > 1 && (
                            <IconButton
                              size="small"
                              onClick={() => remove(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                append({
                  skuId: "",
                  categoryName: "",
                  gsm: "",
                  qualityName: "",
                  widthInches: "",
                  lengthMetersPerRoll: 0,
                  qtyRolls: 0,
                  derivedRatePerRoll: 0,
                  overrideRatePerRoll: null,
                  finalRatePerRoll: 0,
                  taxRate: 18,
                  lineTotal: 0,
                })
              }
              sx={{ mt: 1 }}
            >
              Add Line
            </Button>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Controller
                  name="discountPercent"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Discount %"
                      type="number"
                      InputProps={{ inputProps: { min: 0, max: 100 } }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Notes"
                      multiline
                      rows={2}
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
                    Discount: {formatCurrency(totals.discountAmount)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Tax: {formatCurrency(totals.taxAmount)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6">
                    Total: {formatCurrency(totals.total)}
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
              disabled={creditCheckResult?.blocked}
            >
              {selectedOrder ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Credit Check Details Dialog */}
      <Dialog
        open={showCreditDialog}
        onClose={() => setShowCreditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Credit Check Details</DialogTitle>
        <DialogContent>
          {creditCheckResult && (
            <Box>
              <Typography
                variant="h6"
                color={creditCheckResult.blocked ? "error" : "success"}
                gutterBottom
              >
                Status: {creditCheckResult.blocked ? "BLOCKED" : "APPROVED"}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Total Exposure:</strong>
                  {formatCurrency(creditCheckResult.exposure)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Credit Limit:</strong>
                  {formatCurrency(creditCheckResult.creditLimit)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Pending Limit:</strong>
                  {formatCurrency(pendingLimit)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Outstanding AR:</strong>
                  {formatCurrency(creditCheckResult.outstandingAR)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Pending Orders:</strong>
                  {formatCurrency(creditCheckResult.pendingSOValue)}
                </Typography>
              </Box>

                {creditCheckResult.reasons &&
                  creditCheckResult.reasons.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Reasons:
                      </Typography>
                      {creditCheckResult.reasons.map((reason, index) => {
                        const reasonText =
                          typeof reason === "string"
                            ? reason
                            : reason?.name ||
                              reason?.value ||
                              reason?.description ||
                              reason?._id ||
                              JSON.stringify(reason);
                        return (
                          <Typography key={index} variant="body2" color="error">
                            • {reasonText}
                          </Typography>
                        );
                      })}
                    </Box>
                  )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreditDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmActionHandler}
        title="Confirm Action"
        message={confirmAction?.message}
      />
    </Box>
  );
};

export default SalesOrders;
