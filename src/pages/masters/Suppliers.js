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
  Typography,
  IconButton,
  Grid,
  Divider,
  Paper,
  Stack,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      companyName: "",
      gstin: "",
      state: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        pincode: "",
      },
      contactPersons: [{ name: "", phone: "", email: "", isPrimary: true }],
      active: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contactPersons",
  });

  const watchedContactPersons = watch("contactPersons");

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

  const handleAdd = () => {
    setSelectedSupplier(null);
    reset({
      name: "",
      companyName: "",
      gstin: "",
      state: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        pincode: "",
      },
      contactPersons: [{ name: "", phone: "", email: "", isPrimary: true }],
      active: true,
    });
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedSupplier(row);
    reset({
      name: row.name || "",
      companyName: row.companyName || "",
      gstin: row.gstin || "",
      state: row.state || "",
      address: {
        line1: row.address?.line1 || "",
        line2: row.address?.line2 || "",
        city: row.address?.city || "",
        pincode: row.address?.pincode || "",
      },
      contactPersons: row.contactPersons || [
        { name: "", phone: "", email: "", isPrimary: true },
      ],
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
      if (selectedSupplier) {
        await masterService.updateSupplier(selectedSupplier._id, data);
        showNotification("Supplier updated successfully", "success");
      } else {
        await masterService.createSupplier(data);
        showNotification("Supplier created successfully", "success");
      }
      setOpenDialog(false);
      fetchSuppliers();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const setPrimary = (index) => {
    const contactPersons = getValues("contactPersons") || [];
    contactPersons.forEach((_, i) => {
      setValue(`contactPersons.${i}.isPrimary`, i === index);
    });
  };

  const columns = [
    { field: "supplierCode", headerName: "Supplier Code" },
    { field: "name", headerName: "Supplier Name" },
    { field: "companyName", headerName: "Company Name" },
    { field: "state", headerName: "State" },
    {
      field: "address",
      headerName: "Address",
      renderCell: (params) => {
        const addr = params.value;
        if (!addr) return "-";
        const parts = [];
        if (addr.line1) parts.push(addr.line1);
        if (addr.city) parts.push(addr.city);
        if (addr.pincode) parts.push(addr.pincode);
        return parts.length > 0 ? parts.join(", ") : "-";
      },
    },
    {
      field: "contactPersons",
      headerName: "Primary Contact",
      renderCell: (params) => {
        const primary = params.value?.find((c) => c.isPrimary);
        return primary ? `${primary.name} (${primary.phone})` : "-";
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
            <Stack spacing={3} sx={{ mt: 1 }}>
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

              <Controller
                name="companyName"
                control={control}
                rules={{ required: "Company name is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Company Name"
                    error={!!errors.companyName}
                    helperText={errors.companyName?.message}
                  />
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="gstin"
                    control={control}
                    rules={{
                      required: "GSTIN is required",
                      pattern: {
                        value:
                          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                        message: "Invalid GSTIN format (e.g., 27ABCDE1234F1Z5)",
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
              </Grid>

              <Controller
                name="address.line1"
                control={control}
                rules={{ required: "Address line 1 is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Address Line 1"
                    error={!!errors.address?.line1}
                    helperText={errors.address?.line1?.message}
                  />
                )}
              />

              <Controller
                name="address.line2"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Address Line 2 (Optional)"
                    error={!!errors.address?.line2}
                    helperText={errors.address?.line2?.message}
                  />
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="address.city"
                    control={control}
                    rules={{ required: "City is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="City"
                        error={!!errors.address?.city}
                        helperText={errors.address?.city?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="address.pincode"
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
                        error={!!errors.address?.pincode}
                        helperText={errors.address?.pincode?.message}
                        inputProps={{ maxLength: 6 }}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Divider />

              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2">Contact Persons</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      append({
                        name: "",
                        phone: "",
                        email: "",
                        isPrimary: false,
                      })
                    }
                  >
                    Add Contact
                  </Button>
                </Box>

                <Stack spacing={2}>
                  {fields.map((fieldItem, index) => {
                    const isPrimary =
                      watchedContactPersons?.[index]?.isPrimary || false;
                    return (
                      <Box
                        key={fieldItem.id}
                        sx={{
                          p: 2,
                          border: 1,
                          borderColor: isPrimary ? "primary.main" : "divider",
                          borderRadius: 1,
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              {isPrimary && (
                                <Chip
                                  label="Primary"
                                  size="small"
                                  color="primary"
                                />
                              )}
                              <Box sx={{ flex: 1 }} />
                              <Stack direction="row" spacing={0.5}>
                                <IconButton
                                  size="small"
                                  onClick={() => setPrimary(index)}
                                  color={isPrimary ? "primary" : "default"}
                                >
                                  {isPrimary ? (
                                    <StarIcon fontSize="small" />
                                  ) : (
                                    <StarBorderIcon fontSize="small" />
                                  )}
                                </IconButton>
                                {fields.length > 1 && (
                                  <IconButton
                                    size="small"
                                    onClick={() => remove(index)}
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Stack>
                            </Box>
                          </Grid>
                          <Grid item xs={12}>
                            <Controller
                              name={`contactPersons.${index}.name`}
                              control={control}
                              rules={{ required: "Name is required" }}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  label="Name"
                                  size="small"
                                  error={!!errors.contactPersons?.[index]?.name}
                                  helperText={
                                    errors.contactPersons?.[index]?.name
                                      ?.message
                                  }
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name={`contactPersons.${index}.phone`}
                              control={control}
                              rules={{ required: "Phone is required" }}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  label="Phone"
                                  size="small"
                                  error={
                                    !!errors.contactPersons?.[index]?.phone
                                  }
                                  helperText={
                                    errors.contactPersons?.[index]?.phone
                                      ?.message
                                  }
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name={`contactPersons.${index}.email`}
                              control={control}
                              rules={{
                                required: "Email is required",
                                pattern: {
                                  value:
                                    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                  message: "Invalid email address",
                                },
                              }}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  label="Email"
                                  size="small"
                                  type="email"
                                  error={
                                    !!errors.contactPersons?.[index]?.email
                                  }
                                  helperText={
                                    errors.contactPersons?.[index]?.email
                                      ?.message
                                  }
                                />
                              )}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              <Divider />

              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="Active"
                  />
                )}
              />
            </Stack>
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
