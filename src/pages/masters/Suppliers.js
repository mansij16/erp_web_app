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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
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
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      state: "",
      address: "",
      contactPersons: [{ name: "", phone: "", email: "", isPrimary: true }],
      active: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contactPersons",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await masterService.getSuppliers();
      setSuppliers(response.data);
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
      state: "",
      address: "",
      contactPersons: [{ name: "", phone: "", email: "", isPrimary: true }],
      active: true,
    });
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedSupplier(row);
    reset({
      name: row.name,
      state: row.state,
      address: row.address,
      contactPersons: row.contactPersons || [
        { name: "", phone: "", email: "", isPrimary: true },
      ],
      active: row.active,
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
    fields.forEach((field, i) => {
      field.isPrimary = i === index;
    });
  };

  const columns = [
    { field: "supplierCode", headerName: "Supplier Code", width: 120 },
    { field: "name", headerName: "Supplier Name", flex: 1 },
    { field: "state", headerName: "State", width: 150 },
    { field: "address", headerName: "Address", flex: 1 },
    {
      field: "contactPersons",
      headerName: "Primary Contact",
      width: 200,
      renderCell: (params) => {
        const primary = params.value?.find((c) => c.isPrimary);
        return primary ? `${primary.name} (${primary.phone})` : "-";
      },
    },
    {
      field: "active",
      headerName: "Status",
      width: 100,
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
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedSupplier ? "Edit Supplier" : "Add Supplier"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
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
                      margin="normal"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="state"
                  control={control}
                  rules={{ required: "State is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="State"
                      margin="normal"
                      error={!!errors.state}
                      helperText={errors.state?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  rules={{ required: "Address is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Address"
                      margin="normal"
                      multiline
                      rows={2}
                      error={!!errors.address}
                      helperText={errors.address?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Contact Persons</Typography>
                  <Button
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

                <List>
                  {fields.map((field, index) => (
                    <ListItem key={field.id} divider>
                      <Grid container spacing={2} sx={{ width: "100%" }}>
                        <Grid item xs={3}>
                          <Controller
                            name={`contactPersons.${index}.name`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Name"
                                size="small"
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <Controller
                            name={`contactPersons.${index}.phone`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Phone"
                                size="small"
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <Controller
                            name={`contactPersons.${index}.email`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Email"
                                size="small"
                                type="email"
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={2}>
                          <IconButton
                            onClick={() => setPrimary(index)}
                            color={field.isPrimary ? "primary" : "default"}
                          >
                            {field.isPrimary ? (
                              <StarIcon />
                            ) : (
                              <StarBorderIcon />
                            )}
                          </IconButton>
                          {fields.length > 1 && (
                            <IconButton
                              onClick={() => remove(index)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Grid>
                      </Grid>
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                      sx={{ mt: 2 }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedSupplier ? "Update" : "Add"}
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
