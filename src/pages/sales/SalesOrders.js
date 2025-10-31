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

  const watchCustomerId = watch("customerId");
  const watchLines = watch("lines");
  const watchDiscountPercent = watch("discountPercent");

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
      setSKUs(response.data);
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
  const calculateDerivedRate = useCallback((baseRate44, targetWidth) => {
    if (!baseRate44 || !targetWidth) return 0;
    const ratio = targetWidth / 44;
    const derivedRate = baseRate44 * ratio;
    return Math.round(derivedRate);
  }, []);

  // Calculate pricing for a single line
  const calculateLinePrice = useCallback(
    (line, baseRate44, discountPercent) => {
      if (!line.widthInches || !baseRate44) {
        return {
          derivedRate: 0,
          finalRate: 0,
          lineTotal: 0,
        };
      }

      const derivedRate = calculateDerivedRate(baseRate44, line.widthInches);
      const finalRate = line.overrideRatePerRoll || derivedRate;
      const lineSubtotal = (line.qtyRolls || 0) * finalRate;
      const lineDiscount = (lineSubtotal * (discountPercent || 0)) / 100;
      const taxableAmount = lineSubtotal - lineDiscount;
      const lineTax = (taxableAmount * (line.taxRate || 18)) / 100;
      const lineTotal = taxableAmount + lineTax;

      return {
        derivedRate,
        finalRate,
        lineTotal,
      };
    },
    [calculateDerivedRate]
  );

  // Calculate totals without setting values (to avoid re-render loop)
  const calculateTotals = useMemo(() => {
    if (!selectedCustomer) {
      return { subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0 };
    }

    let subtotal = 0;
    let taxAmount = 0;

    watchLines.forEach((line) => {
      if (line.widthInches && line.qtyRolls) {
        const pricing = calculateLinePrice(
          line,
          selectedCustomer.baseRate44,
          watchDiscountPercent
        );
        const lineSubtotal = (line.qtyRolls || 0) * pricing.finalRate;
        const lineDiscount = (lineSubtotal * (watchDiscountPercent || 0)) / 100;
        const taxableAmount = lineSubtotal - lineDiscount;
        const lineTax = (taxableAmount * (line.taxRate || 18)) / 100;

        subtotal += lineSubtotal;
        taxAmount += lineTax;
      }
    });

    const discountAmount = (subtotal * (watchDiscountPercent || 0)) / 100;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total: subtotal - discountAmount + taxAmount,
    };
  }, [watchLines, selectedCustomer, watchDiscountPercent, calculateLinePrice]);

  const handleAdd = () => {
    setSelectedOrder(null);
    setSelectedCustomer(null);
    setCreditCheckResult(null);
    reset({
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
      customerId: row.customerId,
      date: new Date(row.date),
      lines: row.lines || [],
      discountPercent: row.discountPercent || 0,
      notes: row.notes || "",
    });
    setOpenDialog(true);
  };

  const handleSKUChange = (index, skuId) => {
    const sku = skus.find((s) => s._id === skuId);
    if (sku) {
      const currentLine = watchLines[index];
      const updatedLine = {
        ...currentLine,
        skuId: skuId,
        categoryName: sku.categoryName,
        gsm: sku.gsm,
        qualityName: sku.qualityName,
        widthInches: sku.widthInches,
        lengthMetersPerRoll: sku.defaultLengthMeters,
        taxRate: sku.taxRate,
      };

      // Update the line with SKU details
      setValue(`lines.${index}`, updatedLine);

      // Calculate pricing if customer is selected
      if (selectedCustomer) {
        const pricing = calculateLinePrice(
          updatedLine,
          selectedCustomer.baseRate44,
          watchDiscountPercent
        );
        setValue(`lines.${index}.derivedRatePerRoll`, pricing.derivedRate);
        setValue(`lines.${index}.finalRatePerRoll`, pricing.finalRate);
        setValue(`lines.${index}.lineTotal`, pricing.lineTotal);
      }
    }
  };

  const handleQtyChange = (index, qty) => {
    setValue(`lines.${index}.qtyRolls`, qty);

    // Recalculate pricing for this line
    if (selectedCustomer && watchLines[index].widthInches) {
      const line = { ...watchLines[index], qtyRolls: qty };
      const pricing = calculateLinePrice(
        line,
        selectedCustomer.baseRate44,
        watchDiscountPercent
      );
      setValue(`lines.${index}.lineTotal`, pricing.lineTotal);
    }
  };

  const handleOverrideRateChange = (index, overrideRate) => {
    setValue(`lines.${index}.overrideRatePerRoll`, overrideRate);

    if (selectedCustomer && watchLines[index].widthInches) {
      const line = { ...watchLines[index], overrideRatePerRoll: overrideRate };
      const pricing = calculateLinePrice(
        line,
        selectedCustomer.baseRate44,
        watchDiscountPercent
      );
      setValue(`lines.${index}.finalRatePerRoll`, pricing.finalRate);
      setValue(`lines.${index}.lineTotal`, pricing.lineTotal);
    }
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
            line,
            selectedCustomer.baseRate44,
            data.discountPercent
          );
          return {
            ...line,
            derivedRatePerRoll: pricing.derivedRate,
            finalRatePerRoll: pricing.finalRate,
            lineTotal: pricing.lineTotal,
            totalMeters: line.lengthMetersPerRoll * line.qtyRolls,
          };
        }
        return line;
      });

      const orderData = {
        ...data,
        lines: processedLines,
        ...calculateTotals,
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
    { field: "soNumber", headerName: "SO Number", width: 120 },
    { field: "customerName", headerName: "Customer", flex: 1 },
    {
      field: "date",
      headerName: "Date",
      width: 120,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: "creditCheckPassed",
      headerName: "Credit",
      width: 80,
      renderCell: (params) =>
        params.value ? (
          <ConfirmIcon color="success" />
        ) : (
          <WarningIcon color="error" />
        ),
    },
    {
      field: "total",
      headerName: "Total Amount",
      width: 130,
      renderCell: (params) => formatCurrency(params.value),
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
        maxWidth="lg"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedOrder
              ? `Edit Sales Order: ${selectedOrder.soNumber}`
              : "Create Sales Order"}
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
                          {customer.name} ({customer.customerCode})
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
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Base Rate (44")
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(selectedCustomer.baseRate44)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Credit Limit
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(
                        selectedCustomer.creditPolicy?.creditLimit || 0
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Credit Days
                    </Typography>
                    <Typography variant="body1">
                      {selectedCustomer.creditPolicy?.creditDays || 0} days
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Groups
                    </Typography>
                    <Typography variant="body1">
                      {selectedCustomer.groups?.join(", ") || "-"}
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
                    const line = watchLines[index];
                    const pricing =
                      selectedCustomer && line?.widthInches
                        ? calculateLinePrice(
                            line,
                            selectedCustomer.baseRate44,
                            watchDiscountPercent
                          )
                        : { derivedRate: 0, finalRate: 0, lineTotal: 0 };

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
                        <TableCell>{line?.categoryName}</TableCell>
                        <TableCell>{line?.gsm}</TableCell>
                        <TableCell>{line?.qualityName}</TableCell>
                        <TableCell>{line?.widthInches}</TableCell>
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
                              {formatCurrency(pricing.derivedRate)}
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
                            {formatCurrency(pricing.finalRate)}
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
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(pricing.lineTotal)}
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
                    Subtotal: {formatCurrency(calculateTotals.subtotal)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Discount: {formatCurrency(calculateTotals.discountAmount)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Tax: {formatCurrency(calculateTotals.taxAmount)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6">
                    Total: {formatCurrency(calculateTotals.total)}
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
                  <strong>Total Exposure:</strong>{" "}
                  {formatCurrency(creditCheckResult.exposure)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Credit Limit:</strong>{" "}
                  {formatCurrency(creditCheckResult.creditLimit)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Outstanding AR:</strong>{" "}
                  {formatCurrency(creditCheckResult.outstandingAR)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Pending Orders:</strong>{" "}
                  {formatCurrency(creditCheckResult.pendingSOValue)}
                </Typography>
              </Box>

              {creditCheckResult.reasons &&
                creditCheckResult.reasons.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Reasons:
                    </Typography>
                    {creditCheckResult.reasons.map((reason, index) => (
                      <Typography key={index} variant="body2" color="error">
                        • {reason}
                      </Typography>
                    ))}
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
