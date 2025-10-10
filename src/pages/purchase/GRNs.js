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
  LocalShipping as GRNIcon,
  CheckCircle as PostIcon,
  Assignment as POIcon,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import purchaseService from "../../services/purchaseService";
import inventoryService from "../../services/inventoryService";
import {
  formatDate,
  formatNumber,
  getStatusColor,
} from "../../utils/formatters";

const GRNs = () => {
  const { showNotification, setLoading } = useApp();
  const [grns, setGRNs] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
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
      date: new Date(),
      lines: [],
      notes: "",
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "lines",
  });

  const watchPurchaseOrderId = watch("purchaseOrderId");

  useEffect(() => {
    fetchGRNs();
    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    if (watchPurchaseOrderId) {
      loadPurchaseOrderDetails(watchPurchaseOrderId);
    }
  }, [watchPurchaseOrderId]);

  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const response = await purchaseService.getGRNs();
      setGRNs(response.data);
    } catch (error) {
      showNotification("Failed to fetch GRNs", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await purchaseService.getPurchaseOrders({
        status: "Approved",
      });
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
    }
  };

  const loadPurchaseOrderDetails = async (poId) => {
    try {
      const response = await purchaseService.getPurchaseOrder(poId);
      const po = response.data;
      setSelectedPO(po);

      // Initialize GRN lines from PO lines
      const grnLines = po.lines.map((line) => ({
        poLineId: line._id,
        skuId: line.skuId,
        categoryName: line.categoryName,
        gsm: line.gsm,
        qualityName: line.qualityName,
        widthInches: line.widthInches,
        qtyOrdered: line.qtyRolls,
        qtyReceived: 0,
        qtyAccepted: 0,
        qtyRejected: 0,
        qtyUnmapped: 0,
      }));

      replace(grnLines);
    } catch (error) {
      showNotification("Failed to load purchase order details", "error");
    }
  };

  const handleAdd = () => {
    setSelectedGRN(null);
    reset({
      purchaseOrderId: "",
      date: new Date(),
      lines: [],
      notes: "",
    });
    setOpenDialog(true);
  };

  const handleView = (row) => {
    // View GRN details
    setSelectedGRN(row);
    reset({
      purchaseOrderId: row.purchaseOrderId,
      date: new Date(row.date),
      lines: row.lines || [],
      notes: row.notes || "",
    });
    setOpenDialog(true);
  };

  const handlePost = (row) => {
    if (row.status !== "Draft") {
      showNotification("GRN is already posted", "warning");
      return;
    }
    setSelectedGRN(row);
    setConfirmPost(true);
  };

  const confirmPostGRN = async () => {
    try {
      await purchaseService.postGRN(selectedGRN._id);

      // Create rolls for accepted quantities
      for (const line of selectedGRN.lines) {
        if (line.qtyAccepted > 0) {
          await inventoryService.createRolls({
            grnId: selectedGRN._id,
            skuId: line.skuId,
            quantity: line.qtyAccepted,
            supplierId: selectedPO.supplierId,
          });
        }
      }

      showNotification("GRN posted successfully and rolls created", "success");
      fetchGRNs();
    } catch (error) {
      showNotification("Failed to post GRN", "error");
    }
    setConfirmPost(false);
  };

  const onSubmit = async (data) => {
    try {
      // Calculate total quantities
      const lines = data.lines.map((line) => ({
        ...line,
        qtyAccepted: line.qtyReceived - line.qtyRejected,
      }));

      const grnData = {
        ...data,
        lines,
        supplierId: selectedPO.supplierId,
        supplierName: selectedPO.supplierName,
        poNumber: selectedPO.poNumber,
      };

      if (selectedGRN) {
        await purchaseService.updateGRN(selectedGRN._id, grnData);
        showNotification("GRN updated successfully", "success");
      } else {
        await purchaseService.createGRN(grnData);
        showNotification("GRN created successfully", "success");
      }
      setOpenDialog(false);
      fetchGRNs();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "grnNumber", headerName: "GRN Number", width: 120 },
    { field: "poNumber", headerName: "PO Number", width: 120 },
    { field: "supplierName", headerName: "Supplier", flex: 1 },
    {
      field: "date",
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
      field: "lines",
      headerName: "Total Received",
      width: 120,
      renderCell: (params) => {
        const total =
          params.value?.reduce((sum, line) => sum + line.qtyReceived, 0) || 0;
        return `${total} rolls`;
      },
    },
  ];

  const customActions = [
    {
      icon: <PostIcon />,
      label: "Post GRN",
      onClick: handlePost,
      show: (row) => row.status === "Draft",
    },
  ];

  return (
    <Box>
      <DataTable
        title="Goods Receipt Notes"
        columns={columns}
        rows={grns}
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
            {selectedGRN
              ? `GRN: ${selectedGRN.grnNumber}`
              : "Create Goods Receipt Note"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
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
                      disabled={!!selectedGRN}
                    >
                      {purchaseOrders.map((po) => (
                        <MenuItem key={po._id} value={po._id}>
                          {po.poNumber} - {po.supplierName}
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
                      label="Receipt Date"
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

            {selectedPO && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Supplier: {selectedPO.supplierName} | PO Date:{" "}
                {formatDate(selectedPO.date)}
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              Receipt Lines
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
                    <TableCell>Ordered</TableCell>
                    <TableCell>Received</TableCell>
                    <TableCell>Rejected</TableCell>
                    <TableCell>Accepted</TableCell>
                    <TableCell>Unmapped</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>{field.skuId}</TableCell>
                      <TableCell>{field.categoryName}</TableCell>
                      <TableCell>{field.gsm}</TableCell>
                      <TableCell>{field.qualityName}</TableCell>
                      <TableCell>{field.widthInches}"</TableCell>
                      <TableCell>{field.qtyOrdered}</TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.qtyReceived`}
                          control={control}
                          rules={{
                            required: "Required",
                            min: 0,
                            max: field.qtyOrdered,
                          }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              size="small"
                              sx={{ width: 80 }}
                              error={!!errors.lines?.[index]?.qtyReceived}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.qtyRejected`}
                          control={control}
                          rules={{ min: 0 }}
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
                        {watch(`lines.${index}.qtyReceived`) -
                          watch(`lines.${index}.qtyRejected`)}
                      </TableCell>
                      <TableCell>
                        <Controller
                          name={`lines.${index}.qtyUnmapped`}
                          control={control}
                          rules={{ min: 0 }}
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
              disabled={!!selectedGRN && selectedGRN.status === "Posted"}
            >
              {selectedGRN ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmPost}
        onClose={() => setConfirmPost(false)}
        onConfirm={confirmPostGRN}
        title="Post GRN"
        message="Are you sure you want to post this GRN? This will create inventory rolls and cannot be undone."
        confirmColor="primary"
      />
    </Box>
  );
};

export default GRNs;
