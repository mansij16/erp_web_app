import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
  Alert,
  Autocomplete,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import {
  LocalShipping as ShippingIcon,
  Assignment as InvoiceIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import DataTable from "../../components/common/DataTable";
import { useApp } from "../../contexts/AppContext";
import salesService from "../../services/salesService";
import inventoryService from "../../services/inventoryService";
import {
  formatDate,
  formatNumber,
  getStatusColor,
} from "../../utils/formatters";

const DeliveryChallans = () => {
  const { showNotification, setLoading } = useApp();
  const [challans, setChallans] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [availableRolls, setAvailableRolls] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [selectedSO, setSelectedSO] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      salesOrderId: "",
      dcDate: new Date(),
      vehicleNumber: "",
      driverName: "",
      driverPhone: "",
      lines: [],
      notes: "",
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "lines",
  });

  const watchSalesOrderId = watch("salesOrderId");

  useEffect(() => {
    fetchDeliveryChallans();
    fetchSalesOrders();
  }, []);

  useEffect(() => {
    if (watchSalesOrderId) {
      loadSalesOrderDetails(watchSalesOrderId);
    }
  }, [watchSalesOrderId]);

  const fetchDeliveryChallans = async () => {
    setLoading(true);
    try {
      const response = await salesService.getDeliveryChallans();
      setChallans(response.data);
    } catch (error) {
      showNotification("Failed to fetch delivery challans", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const response = await salesService.getSalesOrders({
        status: ["Confirmed", "PartiallyFulfilled"],
      });
      setSalesOrders(response.data);
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
    }
  };

  const loadSalesOrderDetails = async (soId) => {
    try {
      const soResponse = await salesService.getSalesOrder(soId);
      const so = soResponse.data;
      setSelectedSO(so);

      // Fetch available rolls for each SO line
      const dcLines = [];
      for (const line of so.lines) {
        const rollsResponse = await inventoryService.getRolls({
          skuId: line.skuId,
          status: "Mapped",
        });

        const availableRolls = rollsResponse.data.slice(
          0,
          line.qtyRolls - line.dispatchedQty
        );

        availableRolls.forEach((roll) => {
          dcLines.push({
            soLineId: line._id,
            rollId: roll._id,
            rollNumber: roll.rollNumber,
            skuId: line.skuId,
            categoryName: line.categoryName,
            gsm: line.gsm,
            qualityName: line.qualityName,
            widthInches: line.widthInches,
            shippedLengthMeters: roll.lengthMeters,
            shippedStatus: "Packed",
          });
        });
      }

      replace(dcLines);
      setAvailableRolls(dcLines);
    } catch (error) {
      showNotification("Failed to load sales order details", "error");
    }
  };

  const handleAdd = () => {
    setSelectedChallan(null);
    reset({
      salesOrderId: "",
      dcDate: new Date(),
      vehicleNumber: "",
      driverName: "",
      driverPhone: "",
      lines: [],
      notes: "",
    });
    setOpenDialog(true);
  };

  const handleView = (row) => {
    setSelectedChallan(row);
    reset({
      salesOrderId: row.salesOrderId,
      dcDate: new Date(row.dcDate),
      vehicleNumber: row.vehicleNumber,
      driverName: row.driverName,
      driverPhone: row.driverPhone,
      lines: row.lines || [],
      notes: row.notes || "",
    });
    setOpenDialog(true);
  };

  const handleGenerateInvoice = async (row) => {
    try {
      // Create sales invoice from delivery challan
      const invoiceData = {
        salesOrderId: row.salesOrderId,
        deliveryChallanId: row._id,
        customerId: row.customerId,
        customerName: row.customerName,
        siDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        lines: row.lines.map((line) => ({
          ...line,
          qtyRolls: 1,
          billedLengthMeters: line.shippedLengthMeters,
        })),
      };

      await salesService.createSalesInvoice(invoiceData);
      showNotification("Sales invoice generated successfully", "success");
    } catch (error) {
      showNotification("Failed to generate invoice", "error");
    }
  };

  const onSubmit = async (data) => {
    try {
      const dcData = {
        ...data,
        customerId: selectedSO.customerId,
        customerName: selectedSO.customerName,
        soNumber: selectedSO.soNumber,
      };

      if (selectedChallan) {
        await salesService.updateDeliveryChallan(selectedChallan._id, dcData);
        showNotification("Delivery challan updated successfully", "success");
      } else {
        await salesService.createDeliveryChallan(dcData);

        // Update roll status to Dispatched
        for (const line of data.lines) {
          await inventoryService.updateRoll(line.rollId, {
            status: "Dispatched",
            dispatchedInDCId: selectedChallan?._id,
            dispatchedAt: new Date(),
          });
        }

        showNotification("Delivery challan created successfully", "success");
      }
      setOpenDialog(false);
      fetchDeliveryChallans();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "dcNumber", headerName: "DC Number" },
    { field: "soNumber", headerName: "SO Number" },
    { field: "customerName", headerName: "Customer", flex: 1 },
    {
      field: "dcDate",
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
      field: "lines",
      headerName: "Rolls",
      renderCell: (params) => params.value?.length || 0,
    },
    { field: "vehicleNumber", headerName: "Vehicle" },
  ];

  const customActions = [
    {
      icon: <InvoiceIcon />,
      label: "Generate Invoice",
      onClick: handleGenerateInvoice,
      show: (row) => row.status === "Open" && !row.invoicedInSIId,
    },
    {
      icon: <PrintIcon />,
      label: "Print",
      onClick: (row) => console.log("Print DC", row),
    },
  ];

  return (
    <Box>
      <DataTable
        title="Delivery Challans"
        columns={columns}
        rows={challans}
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
            {selectedChallan
              ? `Delivery Challan: ${selectedChallan.dcNumber}`
              : "Create Delivery Challan"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Controller
                  name="salesOrderId"
                  control={control}
                  rules={{ required: "Sales Order is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Sales Order"
                      error={!!errors.salesOrderId}
                      helperText={errors.salesOrderId?.message}
                      disabled={!!selectedChallan}
                    >
                      {salesOrders.map((so) => (
                        <MenuItem key={so._id} value={so._id}>
                          {so.soNumber} - {so.customerName}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="dcDate"
                  control={control}
                  rules={{ required: "Date is required" }}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="DC Date"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={!!errors.dcDate}
                          helperText={errors.dcDate?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="vehicleNumber"
                  control={control}
                  rules={{ required: "Vehicle number is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Vehicle Number"
                      error={!!errors.vehicleNumber}
                      helperText={errors.vehicleNumber?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="driverName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Driver Name" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="driverPhone"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Driver Phone" />
                  )}
                />
              </Grid>
            </Grid>

            {selectedSO && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Customer: {selectedSO.customerName} | Order Date:
                {formatDate(selectedSO.date)} | Total Items:
                {selectedSO.lines?.length}
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              Rolls to Dispatch
            </Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Roll Number</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>GSM</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Width"</TableCell>
                    <TableCell>Length (m)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>{field.rollNumber}</TableCell>
                      <TableCell>{field.categoryName}</TableCell>
                      <TableCell>{field.gsm}</TableCell>
                      <TableCell>{field.qualityName}</TableCell>
                      <TableCell>{field.widthInches}</TableCell>
                      <TableCell>{field.shippedLengthMeters}</TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.shippedStatus`}
                          control={control}
                          render={({ field }) => (
                            <Chip
                              label={field.value}
                              color={
                                field.value === "Dispatched"
                                  ? "success"
                                  : "warning"
                              }
                              size="small"
                            />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12}>
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                !!selectedChallan && selectedChallan.status === "Closed"
              }
            >
              {selectedChallan ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DeliveryChallans;
