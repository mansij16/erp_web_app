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
  IconButton,
  Typography,
  Chip,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import purchaseService from "../../services/purchaseService";
import masterService from "../../services/masterService";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../utils/formatters";

const PurchaseOrders = () => {
  const { showNotification, setLoading } = useApp();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [skus, setSKUs] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    // defaultValues: {
    //   supplierId: "",
    //   date: new Date(),
    //   lines: [
    //     {
    //       skuId: "",
    //       categoryName: "",
    //       gsm: "",
    //       qualityName: "",
    //       widthInches: "",
    //       qtyRolls: 0,
    //       ratePerRoll: 0,
    //       taxRate: 18,
    //       lineTotal: 0,
    //     },
    //   ],
    //   notes: "",
    // },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchLines = watch("lines");

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchSKUs();
  }, []);

//   useEffect(() => {
//     calculateTotals();
//   }, [watchLines]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const response = await purchaseService.getPurchaseOrders();
      setOrders(response.data);
    } catch (error) {
      showNotification("Failed to fetch purchase orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await masterService.getSuppliers({ active: true });
      setSuppliers(response.data);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
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

//   const calculateTotals = () => {
//     let subtotal = 0;
//     let taxAmount = 0;

//     watchLines.forEach((line, index) => {
//       const lineTotal = line.qtyRolls * line.ratePerRoll;
//       const lineTax = (lineTotal * line.taxRate) / 100;
//       setValue(`lines.${index}.lineTotal`, lineTotal + lineTax);
//       subtotal += lineTotal;
//       taxAmount += lineTax;
//     });

//     return { subtotal, taxAmount, total: subtotal + taxAmount };
//   };

  const handleAdd = () => {
    setSelectedOrder(null);
    reset({
      supplierId: "",
      date: new Date(),
      lines: [
        {
          skuId: "",
          categoryName: "",
          gsm: "",
          qualityName: "",
          widthInches: "",
          qtyRolls: 0,
          ratePerRoll: 0,
          taxRate: 18,
          lineTotal: 0,
        },
      ],
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
      supplierId: row.supplierId,
      date: new Date(row.date),
      lines: row.lines || [],
      notes: row.notes || "",
    });
    setOpenDialog(true);
  };

  const handleSKUChange = (index, skuId) => {
    const sku = skus.find((s) => s._id === skuId);
    if (sku) {
      setValue(`lines.${index}.skuId`, skuId);
      setValue(`lines.${index}.categoryName`, sku.categoryName);
      setValue(`lines.${index}.gsm`, sku.gsm);
      setValue(`lines.${index}.qualityName`, sku.qualityName);
      setValue(`lines.${index}.widthInches`, sku.widthInches);
      setValue(`lines.${index}.taxRate`, sku.taxRate);
    }
  };

  const handleApprove = (row) => {
    setSelectedOrder(row);
    setConfirmAction({
      type: "approve",
      message: "Are you sure you want to approve this order?",
    });
  };

  const handleCancel = (row) => {
    setSelectedOrder(row);
    setConfirmAction({
      type: "cancel",
      message: "Are you sure you want to cancel this order?",
    });
  };

  const handleClose = (row) => {
    setSelectedOrder(row);
    setConfirmAction({
      type: "close",
      message: "Are you sure you want to close this order?",
    });
  };

  const confirmActionHandler = async () => {
    try {
      switch (confirmAction.type) {
        case "approve":
          await purchaseService.approvePurchaseOrder(selectedOrder._id);
          showNotification("Purchase order approved successfully", "success");
          break;
        case "cancel":
          await purchaseService.cancelPurchaseOrder(selectedOrder._id);
          showNotification("Purchase order cancelled successfully", "success");
          break;
        case "close":
          await purchaseService.closePurchaseOrder(selectedOrder._id);
          showNotification("Purchase order closed successfully", "success");
          break;
      }
      fetchPurchaseOrders();
    } catch (error) {
      showNotification(`Failed to ${confirmAction.type} order`, "error");
    }
    setConfirmAction(null);
  };

  const onSubmit = async (data) => {
    try {
 //      const totals = calculateTotals();
      const orderData = {
        ...data,
        // ...totals,
      };

      if (selectedOrder) {
        await purchaseService.updatePurchaseOrder(selectedOrder._id, orderData);
        showNotification("Purchase order updated successfully", "success");
      } else {
        await purchaseService.createPurchaseOrder(orderData);
        showNotification("Purchase order created successfully", "success");
      }
      setOpenDialog(false);
      fetchPurchaseOrders();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "poNumber", headerName: "PO Number" },
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
      field: "total",
      headerName: "Total Amount",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "lines",
      headerName: "Items",
      renderCell: (params) => params.value?.length || 0,
    },
  ];

  const customActions = [
    {
      icon: <ApproveIcon />,
      label: "Approve",
      onClick: handleApprove,
      show: (row) => row.status === "Draft",
    },
    {
      icon: <CancelIcon />,
      label: "Cancel",
      onClick: handleCancel,
      show: (row) => ["Draft", "Approved"].includes(row.status),
    },
    {
      icon: <PrintIcon />,
      label: "Print",
      onClick: (row) => console.log("Print PO", row),
    },
  ];

  // const totals = calculateTotals();

  return (
    <Box>
      <DataTable
        title="Purchase Orders"
        columns={columns}
        rows={orders}
        onAdd={handleAdd}
        onEdit={handleEdit}
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
            {selectedOrder
              ? `Edit Purchase Order: ${selectedOrder.poNumber}`
              : "Create Purchase Order"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
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
                    <TableCell>Width</TableCell>
                    <TableCell>Qty (Rolls)</TableCell>
                    <TableCell>Rate/Roll</TableCell>
                    <TableCell>Tax %</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, index) => (
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
                              <MenuItem value="">Select SKU</MenuItem>
                              {skus.map((sku) => (
                                <MenuItem key={sku._id} value={sku._id}>
                                  {sku.skuCode}
                                </MenuItem>
                              ))}
                            </TextField>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.categoryName`}
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} size="small" disabled />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.gsm`}
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} size="small" disabled />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.qualityName`}
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} size="small" disabled />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.widthInches`}
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} size="small" disabled />
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
                        <Controller
                          name={`lines.${index}.lineTotal`}
                          control={control}
                          render={({ field }) => (
                            <Typography variant="body2">
                              {formatCurrency(field.value)}
                            </Typography>
                          )}
                        />
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
                  ))}
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
                  qtyRolls: 0,
                  ratePerRoll: 0,
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
                {/* <Paper sx={{ p: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Subtotal: {formatCurrency(totals.subtotal)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Tax: {formatCurrency(totals.taxAmount)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6">
                    Total: {formatCurrency(totals.total)}
                  </Typography>
                </Paper> */}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedOrder ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
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

export default PurchaseOrders;
