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
  FormControlLabel,
  Switch,
  Typography,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import masterService from "../../services/masterService";

const SKUs = () => {
  const { showNotification, setLoading } = useApp();
  const [skus, setSKUs] = useState([]);
  const [products, setProducts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      productId: "",
      widthInches: "",
      defaultLengthMeters: "",
      taxRate: 18,
      active: true,
    },
  });

  const selectedProductId = watch("productId");

  useEffect(() => {
    fetchSKUs();
    fetchProducts();
  }, []);

  const fetchSKUs = async () => {
    setLoading(true);
    try {
      const response = await masterService.getSKUs();
      setSKUs(response.data);
    } catch (error) {
      showNotification("Failed to fetch SKUs", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await masterService.getProducts({ active: true });
      setProducts(response.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const handleAdd = () => {
    setSelectedSKU(null);
    reset({
      productId: "",
      widthInches: "",
      defaultLengthMeters: "",
      taxRate: 18,
      active: true,
    });
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedSKU(row);
    reset({
      productId: row.productId._id || row.productId,
      widthInches: row.widthInches,
      defaultLengthMeters: row.defaultLengthMeters,
      taxRate: row.taxRate,
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
      await masterService.deleteSKU(deleteId);
      showNotification("SKU deleted successfully", "success");
      fetchSKUs();
    } catch (error) {
      showNotification("Failed to delete SKU", "error");
    }
    setOpenConfirm(false);
  };

  const onSubmit = async (data) => {
    try {
      if (selectedSKU) {
        await masterService.updateSKU(selectedSKU._id, data);
        showNotification("SKU updated successfully", "success");
      } else {
        await masterService.createSKU(data);
        showNotification("SKU created successfully", "success");
      }
      setOpenDialog(false);
      fetchSKUs();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "skuCode", headerName: "SKU Code", width: 150 },
    { field: "categoryName", headerName: "Category", width: 120 },
    { field: "gsm", headerName: "GSM", width: 80 },
    { field: "qualityName", headerName: "Quality", width: 120 },
    { field: "widthInches", headerName: "Width (inches)", width: 120 },
    { field: "defaultLengthMeters", headerName: "Length (meters)", width: 120 },
    { field: "taxRate", headerName: "Tax %", width: 80 },
    {
      field: "active",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (params.value ? "Active" : "Inactive"),
    },
  ];

  const getSelectedProduct = () => {
    return products.find((p) => p._id === selectedProductId);
  };

  return (
    <Box>
      <DataTable
        title="SKUs"
        columns={columns}
        rows={skus}
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
          <DialogTitle>{selectedSKU ? "Edit SKU" : "Add SKU"}</DialogTitle>
          <DialogContent>
            <Controller
              name="productId"
              control={control}
              rules={{ required: "Product is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Product"
                  margin="normal"
                  error={!!errors.productId}
                  helperText={errors.productId?.message}
                  disabled={!!selectedSKU}
                >
                  {products.map((product) => (
                    <MenuItem key={product._id} value={product._id}>
                      {product.categoryName} - {product.gsm} GSM -
                      {product.qualityName}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {selectedProductId && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Selected: {getSelectedProduct()?.categoryName} -
                {getSelectedProduct()?.gsm} GSM -
                {getSelectedProduct()?.qualityName}
              </Typography>
            )}

            <Controller
              name="widthInches"
              control={control}
              rules={{ required: "Width is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Width (inches)"
                  margin="normal"
                  error={!!errors.widthInches}
                  helperText={errors.widthInches?.message}
                  disabled={!!selectedSKU}
                >
                  {[24, 36, 44, 63].map((width) => (
                    <MenuItem key={width} value={width}>
                      {width}"
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="defaultLengthMeters"
              control={control}
              rules={{ required: "Length is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Default Length (meters)"
                  margin="normal"
                  error={!!errors.defaultLengthMeters}
                  helperText={errors.defaultLengthMeters?.message}
                >
                  {[1000, 1500, 2000].map((length) => (
                    <MenuItem key={length} value={length}>
                      {length} m
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="taxRate"
              control={control}
              rules={{
                required: "Tax rate is required",
                min: { value: 0, message: "Tax rate must be positive" },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Tax Rate (%)"
                  type="number"
                  margin="normal"
                  error={!!errors.taxRate}
                  helperText={errors.taxRate?.message}
                />
              )}
            />

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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedSKU ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete SKU"
        message="Are you sure you want to delete this SKU?"
      />
    </Box>
  );
};

export default SKUs;
