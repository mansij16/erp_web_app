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
  Divider,
  Alert,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import {
  Receipt as InvoiceIcon,
  CheckCircle as PostIcon,
  Print as PrintIcon,
  Assessment as ProfitIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import salesService from "../../services/salesService";
import inventoryService from "../../services/inventoryService";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../utils/formatters";

const SalesInvoices = () => {
  const { showNotification, setLoading } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [deliveryChallans, setDeliveryChallans] = useState([]);
  const [selectedDC, setSelectedDC] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [confirmPost, setConfirmPost] = useState(false);
  const [showProfitDialog, setShowProfitDialog] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      deliveryChallanId: "",
      siDate: new Date(),
      dueDate: new Date(),
      lines: [],
      notes: "",
    },
  });

  const watchDeliveryChallanId = watch("deliveryChallanId");
  const watchLines = watch("lines");

  useEffect(() => {
    fetchSalesInvoices();
    fetchDeliveryChallans();
  }, []);

  useEffect(() => {
    if (watchDeliveryChallanId) {
      loadDeliveryChallanDetails(watchDeliveryChallanId);
    }
  }, [watchDeliveryChallanId]);

  useEffect(() => {
    calculateTotals();
  }, [watchLines]);

  const fetchSalesInvoices = async () => {
    setLoading(true);
    try {
      const response = await salesService.getSalesInvoices();
      setInvoices(response.data);
    } catch (error) {
      showNotification("Failed to fetch sales invoices", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryChallans = async () => {
    try {
      const response = await salesService.getDeliveryChallans({
        status: "Open",
      });
      setDeliveryChallans(response.data);
    } catch (error) {
      console.error("Failed to fetch delivery challans:", error);
    }
  };

  const loadDeliveryChallanDetails = async (dcId) => {
    try {
      const response = await salesService.getDeliveryChallan(dcId);
      const dc = response.data;
      setSelectedDC(dc);

      // Get SO details for pricing
      const soResponse = await salesService.getSalesOrder(dc.salesOrderId);
      const so = soResponse.data;

      // Initialize invoice lines from DC lines with pricing and COGS
      const invoiceLines = [];
      for (const dcLine of dc.lines) {
        const soLine = so.lines.find((l) => l._id === dcLine.soLineId);
        const roll = await inventoryService.getRoll(dcLine.rollId);

        invoiceLines.push({
          soLineId: dcLine.soLineId,
          rollId: dcLine.rollId,
          rollNumber: dcLine.rollNumber,
          skuId: dcLine.skuId,
          categoryName: dcLine.categoryName,
          gsm: dcLine.gsm,
          qualityName: dcLine.qualityName,
          widthInches: dcLine.widthInches,
          qtyRolls: 1,
          billedLengthMeters: dcLine.shippedLengthMeters,
          ratePerRoll: soLine.finalRatePerRoll,
          discountLine: 0,
          taxRate: soLine.taxRate,
          landedCostPerRoll: roll.data.landedCostPerRoll,
          cogsAmount: roll.data.landedCostPerRoll,
        });
      }

      setValue("lines", invoiceLines);
      setValue("customerId", dc.customerId);
      setValue("customerName", dc.customerName);
      setValue("salesOrderId", dc.salesOrderId);
    } catch (error) {
      showNotification("Failed to load delivery challan details", "error");
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    let totalCOGS = 0;

    watchLines.forEach((line) => {
      const lineSubtotal = line.qtyRolls * line.ratePerRoll;
      const lineDiscount = (lineSubtotal * line.discountLine) / 100;
      const taxableAmount = lineSubtotal - lineDiscount;
      const lineTax = (taxableAmount * line.taxRate) / 100;

      subtotal += lineSubtotal;
      taxAmount += lineTax;
      totalCOGS += line.cogsAmount || 0;
    });

    const total = subtotal + taxAmount;
    const grossMargin = total - totalCOGS;
    const marginPercent = total > 0 ? (grossMargin / total) * 100 : 0;

    return {
      subtotal,
      taxAmount,
      total,
      totalCOGS,
      grossMargin,
      marginPercent,
    };
  };

  const handleAdd = () => {
    setSelectedInvoice(null);
    reset({
      deliveryChallanId: "",
      siDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lines: [],
      notes: "",
    });
    setOpenDialog(true);
  };

  const handleView = (row) => {
    setSelectedInvoice(row);
    reset({
      deliveryChallanId: row.deliveryChallanId,
      siDate: new Date(row.siDate),
      dueDate: new Date(row.dueDate),
      lines: row.lines || [],
      notes: row.notes || "",
    });
    setOpenDialog(true);
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
      await salesService.postSalesInvoice(selectedInvoice._id);

      // Update DC status
      await salesService.closeDeliveryChallan(
        selectedInvoice.deliveryChallanId
      );

      showNotification("Invoice posted successfully", "success");
      fetchSalesInvoices();
    } catch (error) {
      showNotification("Failed to post invoice", "error");
    }
    setConfirmPost(false);
  };

  const handlePrint = async (row) => {
    try {
      const response = await salesService.getSalesInvoicePDF(row._id);
      const blob = new Blob([response], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      showNotification("Failed to generate PDF", "error");
    }
  };

  const handleViewProfit = (row) => {
    setSelectedInvoice(row);
    setShowProfitDialog(true);
  };

  const onSubmit = async (data) => {
    try {
      const totals = calculateTotals();
      const invoiceData = {
        ...data,
        ...totals,
        customerId: selectedDC.customerId,
        customerName: selectedDC.customerName,
        salesOrderId: selectedDC.salesOrderId,
        paymentStatus: "Unpaid",
        paidAmount: 0,
        outstandingAmount: totals.total,
      };

      if (selectedInvoice) {
        showNotification("Cannot edit posted invoices", "warning");
      } else {
        await salesService.createSalesInvoice(invoiceData);

        // Update roll status
        for (const line of data.lines) {
          await inventoryService.updateRoll(line.rollId, {
            billedInSIId: selectedInvoice?._id,
          });
        }

        showNotification("Sales invoice created successfully", "success");
      }
      setOpenDialog(false);
      fetchSalesInvoices();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "siNumber", headerName: "Invoice Number", width: 130 },
    { field: "customerName", headerName: "Customer", flex: 1 },
    {
      field: "siDate",
      headerName: "Date",
      width: 120,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: "total",
      headerName: "Invoice Amount",
      width: 130,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "grossMargin",
      headerName: "Margin",
      width: 120,
      renderCell: (params) => {
        const marginPercent =
          params.row.total > 0 ? (params.value / params.row.total) * 100 : 0;
        return (
          <Typography
            variant="body2"
            color={marginPercent > 20 ? "success.main" : "warning.main"}
          >
            {formatCurrency(params.value)} ({marginPercent.toFixed(1)}%)
          </Typography>
        );
      },
    },
    {
      field: "paymentStatus",
      headerName: "Payment",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "Paid" ? "success" : "warning"}
          size="small"
        />
      ),
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
      icon: <PrintIcon />,
      label: "Print",
      onClick: handlePrint,
    },
    {
      icon: <ProfitIcon />,
      label: "View Profit",
      onClick: handleViewProfit,
    },
  ];

  const totals = calculateTotals();

  return (
    <Box>
      <DataTable
        title="Sales Invoices"
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
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedInvoice
              ? `Invoice: ${selectedInvoice.siNumber}`
              : "Create Sales Invoice"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Controller
                  name="deliveryChallanId"
                  control={control}
                  rules={{ required: "Delivery Challan is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Delivery Challan"
                      error={!!errors.deliveryChallanId}
                      helperText={errors.deliveryChallanId?.message}
                      disabled={!!selectedInvoice}
                    >
                      {deliveryChallans.map((dc) => (
                        <MenuItem key={dc._id} value={dc._id}>
                          {dc.dcNumber} - {dc.customerName}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="siDate"
                  control={control}
                  rules={{ required: "Invoice date is required" }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Invoice Date"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={!!errors.siDate}
                          helperText={errors.siDate?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
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

            {selectedDC && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Customer: {selectedDC.customerName} | DC Date:{" "}
                {formatDate(selectedDC.dcDate)} | Rolls:{" "}
                {selectedDC.lines?.length}
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              Invoice Lines
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Roll#</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>GSM</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Width"</TableCell>
                    <TableCell>Length(m)</TableCell>
                    <TableCell>Rate/Roll</TableCell>
                    <TableCell>Tax%</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>COGS</TableCell>
                    <TableCell>Margin</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {watchLines.map((line, index) => {
                    const lineAmount =
                      line.ratePerRoll * (1 + line.taxRate / 100);
                    const margin = lineAmount - line.cogsAmount;
                    const marginPercent =
                      lineAmount > 0 ? (margin / lineAmount) * 100 : 0;

                    return (
                      <TableRow key={index}>
                        <TableCell>{line.rollNumber}</TableCell>
                        <TableCell>{line.categoryName}</TableCell>
                        <TableCell>{line.gsm}</TableCell>
                        <TableCell>{line.qualityName}</TableCell>
                        <TableCell>{line.widthInches}</TableCell>
                        <TableCell>{line.billedLengthMeters}</TableCell>
                        <TableCell>
                          {formatCurrency(line.ratePerRoll)}
                        </TableCell>
                        <TableCell>{line.taxRate}%</TableCell>
                        <TableCell>{formatCurrency(lineAmount)}</TableCell>
                        <TableCell>{formatCurrency(line.cogsAmount)}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color={
                              marginPercent > 20
                                ? "success.main"
                                : "warning.main"
                            }
                          >
                            {marginPercent.toFixed(1)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />

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
                    Tax: {formatCurrency(totals.taxAmount)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Total: {formatCurrency(totals.total)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    COGS: {formatCurrency(totals.totalCOGS)}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Gross Margin: {formatCurrency(totals.grossMargin)} (
                    {totals.marginPercent.toFixed(1)}%)
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
              {selectedInvoice ? "View Only" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Profit Analysis Dialog */}
      <Dialog
        open={showProfitDialog}
        onClose={() => setShowProfitDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Profitability Analysis</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Invoice: {selectedInvoice.siNumber}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Revenue
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(selectedInvoice.total)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Cost of Goods Sold
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(selectedInvoice.totalCOGS)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Gross Profit
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(selectedInvoice.grossMargin)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Margin %
                  </Typography>
                  <Typography
                    variant="h6"
                    color={
                      (selectedInvoice.grossMargin / selectedInvoice.total) *
                        100 >
                      20
                        ? "success.main"
                        : "warning.main"
                    }
                  >
                    {(
                      (selectedInvoice.grossMargin / selectedInvoice.total) *
                      100
                    ).toFixed(2)}
                    %
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Roll-wise Analysis
              </Typography>
              {selectedInvoice.lines?.map((line, index) => {
                const lineMargin = line.ratePerRoll - line.cogsAmount;
                const marginPercent = (lineMargin / line.ratePerRoll) * 100;

                return (
                  <Box
                    key={index}
                    sx={{ mb: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}
                  >
                    <Typography variant="body2">
                      {line.rollNumber}: {line.categoryName} {line.gsm}GSM{" "}
                      {line.widthInches}"
                    </Typography>
                    <Typography
                      variant="caption"
                      color={
                        marginPercent > 20 ? "success.main" : "warning.main"
                      }
                    >
                      Margin: {formatCurrency(lineMargin)} (
                      {marginPercent.toFixed(1)}%)
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProfitDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmPost}
        onClose={() => setConfirmPost(false)}
        onConfirm={confirmPostInvoice}
        title="Post Invoice"
        message="Are you sure you want to post this invoice? This will update accounting entries and cannot be undone."
        confirmColor="primary"
      />
    </Box>
  );
};

export default SalesInvoices;
