import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import masterService from "../../services/masterService";

const Suppliers = () => {
  const { showNotification, setLoading } = useApp();
  const [suppliers, setSuppliers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      supplierCode: "",
      name: "",
      gstin: "",
      addressline1: "",
      addressline2: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
      active: true,
    },
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await masterService.getSuppliers();
      const list = response.suppliers || [];
      setSuppliers(list);
    } catch (error) {
      showNotification("Failed to fetch suppliers", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    setSelectedSupplier(null);

    // Fetch next supplier code
    let nextCode = "";
    try {
      nextCode = await masterService.getNextSupplierCode();
    } catch (error) {
      console.error("Failed to fetch next supplier code:", error);
    }

    reset({
      supplierCode: nextCode,
      name: "",
      gstin: "",
      addressline1: "",
      addressline2: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
      active: true,
    });
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedSupplier(row);
    reset({
      supplierCode: row.supplierCode || "",
      name: row.name || "",
      gstin: row.gstin || "",
      addressline1: row.addressline1 || "",
      addressline2: row.addressline2 || "",
      city: row.city || "",
      state: row.state || "",
      country: row.country || "India",
      pincode: row.pincode || "",
      active: row.active !== undefined ? row.active : true,
    });
    setOpenDialog(true);
  };

  const handleDelete = (row) => {
    setDeleteId(row._id);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await masterService.deleteSupplier(deleteId);
      showNotification("Supplier deleted successfully", "success");
      fetchSuppliers();
    } catch (error) {
      showNotification("Failed to delete supplier", "error");
    }
    setOpenConfirm(false);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        supplierCode: data.supplierCode,
        name: data.name,
        gstin: data.gstin,
        addressline1: data.addressline1,
        addressline2: data.addressline2,
        city: data.city,
        state: data.state,
        country: data.country,
        pincode: data.pincode,
        active: data.active,
      };

      if (selectedSupplier) {
        await masterService.updateSupplier(selectedSupplier._id, payload);
        showNotification("Supplier updated successfully", "success");
      } else {
        await masterService.createSupplier(payload);
        showNotification("Supplier created successfully", "success");
      }
      setOpenDialog(false);
      fetchSuppliers();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "supplierCode", headerName: "Supplier Code" },
    { field: "name", headerName: "Supplier Name" },
    { field: "gstin", headerName: "GSTIN" },
    {
      field: "city",
      headerName: "Location",
      renderCell: (params) => {
        const row = params.row;
        const parts = [];
        if (row.city) parts.push(row.city);
        if (row.state) parts.push(row.state);
        return parts.length > 0 ? parts.join(", ") : "-";
      },
    },
    {
      field: "active",
      headerName: "Status",
      renderCell: (params) => (params.value ? "Active" : "Inactive"),
    },
  ];

  return (
    <Box>
      <DataTable
        title="Suppliers"
        columns={columns}
        rows={suppliers}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedSupplier ? "Edit Supplier" : "Add New Supplier"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: "Supplier name is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Supplier Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="supplierCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Supplier Code"
                      inputProps={{ style: { textTransform: "uppercase" } }}
                      onChange={(event) =>
                        field.onChange(event.target.value.toUpperCase())
                      }
                      disabled={!!selectedSupplier}
                      error={!!errors.supplierCode}
                      helperText={errors.supplierCode?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="gstin"
                  control={control}
                  rules={{
                    required: "GSTIN is required",
                    pattern: {
                      value:
                        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                      message:
                        "Invalid GSTIN format (e.g., 27ABCDE1234F1Z5)",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="GSTIN"
                      error={!!errors.gstin}
                      helperText={errors.gstin?.message}
                      inputProps={{ style: { textTransform: "uppercase" } }}
                      onChange={(event) =>
                        field.onChange(event.target.value.toUpperCase())
                      }
                      disabled={!!selectedSupplier}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="addressline1"
                  control={control}
                  rules={{ required: "Address line 1 is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Address Line 1"
                      error={!!errors.addressline1}
                      helperText={errors.addressline1?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="addressline2"
                  control={control}
                  rules={{ required: "Address line 2 is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Address Line 2"
                      error={!!errors.addressline2}
                      helperText={errors.addressline2?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="city"
                  control={control}
                  rules={{ required: "City is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="City"
                      error={!!errors.city}
                      helperText={errors.city?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="state"
                  control={control}
                  rules={{ required: "State is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="State"
                      error={!!errors.state}
                      helperText={errors.state?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="country"
                  control={control}
                  rules={{ required: "Country is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Country"
                      error={!!errors.country}
                      helperText={errors.country?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="pincode"
                  control={control}
                  rules={{
                    required: "Pincode is required",
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: "Pincode must be 6 digits",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Pincode"
                      error={!!errors.pincode}
                      helperText={errors.pincode?.message}
                      inputProps={{ maxLength: 6 }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    mt: 1,
                  }}
                >
                  <Controller
                    name="active"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch {...field} checked={field.value} />
                        }
                        label="Active"
                      />
                    )}
                  />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedSupplier ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier?"
      />
    </Box>
  );
};

export default Suppliers;
