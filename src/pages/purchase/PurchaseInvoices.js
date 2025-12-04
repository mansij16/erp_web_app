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
  IconButton,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
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
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../utils/formatters";

const PurchaseInvoices = () => {
  const { showNotification, setLoading } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
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
    formState: { errors },
  } = useForm({
    defaultValues: {
      purchaseOrderId: "",
      supplierInvoiceNumber: "",
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

  useEffect(() => {
    fetchPurchaseInvoices();
    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [watchLines, watchLandedCosts]);

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

  const fetchPurchaseOrders = async () => {
    try {
      const response = await purchaseService.getPurchaseOrders({
        status: ["Approved", "PartiallyReceived"],
      });
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    watchLines.forEach((line) => {
      const lineSubtotal = line.qtyRolls * line.ratePerRoll;
      const lineTax = (lineSubtotal * line.taxRate) / 100;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
    });

    const totalLandedCost = watchLandedCosts.reduce(
      (sum, cost) => sum + (cost.amount || 0),
      0
    );
    const grandTotal = subtotal + taxAmount + totalLandedCost;

    return { subtotal, taxAmount, totalLandedCost, grandTotal };
  };

  const handleAdd = () => {
    setSelectedInvoice(null);
    reset({
      purchaseOrderId: "",
      supplierInvoiceNumber: "",
      date: new Date(),
      dueDate: new Date(),
      lines: [],
      landedCosts: [],
      notes: "",
    });
    setOpenDialog(true);
  };

  const handleView = (row) => {
    setSelectedInvoice(row);
    reset({
      purchaseOrderId: row.purchaseOrderId,
      supplierInvoiceNumber: row.supplierInvoiceNumber,
      date: new Date(row.date),
      dueDate: new Date(row.dueDate),
      lines: row.lines || [],
      landedCosts: row.landedCosts || [],
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

  const handlePOChange = async (poId) => {
    try {
      const response = await purchaseService.getPurchaseOrder(poId);
      const po = response.data;

      // Initialize invoice lines from PO lines
      const invoiceLines = po.lines.map((line) => ({
        poLineId: line._id,
        skuId: line.skuId,
        categoryName: line.categoryName,
        gsm: line.gsm,
        qualityName: line.qualityName,
        widthInches: line.widthInches,
        qtyRolls: line.qtyRolls - (line.invoicedQty || 0),
        ratePerRoll: line.ratePerRoll,
        taxRate: line.taxRate,
      }));

      replaceLines(invoiceLines);
    } catch (error) {
      showNotification("Failed to load purchase order details", "error");
    }
  };

  const onSubmit = async (data) => {
    try {
      const totals = calculateTotals();
      const invoiceData = {
        ...data,
        ...totals,
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
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedInvoice
              ? `Invoice: ${selectedInvoice.piNumber}`
              : "Create Purchase Invoice"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Controller
                  name="purchaseOrderId"
                  control={control}
                  rules={{ required: "Purchase Order is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Purchase Order"
                      error={!!errors.purchaseOrderId}
                      helperText={errors.purchaseOrderId?.message}
                      onChange={(e) => {
                        field.onChange(e);
                        handlePOChange(e.target.value);
                      }}
                      disabled={!!selectedInvoice}
                    >
                      {purchaseOrders.map((po) => (
                        <MenuItem key={po._id} value={po._id}>
                          {po.poNumber}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
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

              <Grid item xs={12} md={2}>
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

              <Grid item xs={12} md={2}>
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

            <Typography variant="h6" gutterBottom>
              Invoice Lines
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>GSM</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Width</TableCell>
                    <TableCell>Qty (Rolls)</TableCell>
                    <TableCell>Rate/Roll</TableCell>
                    <TableCell>Tax %</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineFields.map((field, index) => (
                    <TableRow key={field.id}>
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
                        {formatCurrency(
                          watchLines[index]?.qtyRolls *
                            watchLines[index]?.ratePerRoll *
                            (1 + watchLines[index]?.taxRate / 100)
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
