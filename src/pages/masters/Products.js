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
  Chip,
  Stack,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import masterService from "../../services/masterService";

const Products = () => {
  const { showNotification, setLoading } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      categoryId: "",
      gsm: "",
      qualityName: "",
      productCode: "",
      hsnCode: "",
      taxRate: 18,
      defaultLengthMeters: 1000,
      active: true,
    },
  });

  // Auto-generate productCode from category code + gsm + quality
  const watchCategoryId = watch("categoryId");
  const watchGsm = watch("gsm");
  const watchQuality = watch("qualityName");

  useEffect(() => {
    const category = categories.find((c) => c._id === watchCategoryId);
    const catCode = category?.code || "";
    const qualityAbbr = (watchQuality || "").substring(0, 4).toUpperCase();
    const code = [catCode, watchGsm, qualityAbbr].filter(Boolean).join("-");
    setValue("productCode", code);
  }, [watchCategoryId, watchGsm, watchQuality, categories, setValue]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await masterService.getProducts();
      const list = response.products || [];
      const mapped = list.map((p) => ({
        ...p,
        categoryName: p.category?.name || "",
        // normalize categoryId for form usage
        categoryId: p.categoryId?._id || p.categoryId,
      }));
      setProducts(mapped);
    } catch (error) {
      showNotification("Failed to fetch products", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await masterService.getCategories({ active: true });
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    reset({
      categoryId: "",
      gsm: "",
      qualityName: "",
      productCode: "",
      hsnCode: "",
      taxRate: 18,
      defaultLengthMeters: 1000,
      active: true,
    });
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedProduct(row);
    reset({
      categoryId: row.categoryId?._id || row.categoryId,
      gsm: row.gsm,
      qualityName: row.qualityName,
      productCode: row.productCode || "",
      hsnCode: row.hsnCode,
      taxRate: row.taxRate ?? 18,
      defaultLengthMeters: row.defaultLengthMeters ?? 1000,
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
      await masterService.deleteProduct(deleteId);
      showNotification("Product deleted successfully", "success");
      fetchProducts();
    } catch (error) {
      showNotification("Failed to delete product", "error");
    }
    setOpenConfirm(false);
  };

  const onSubmit = async (data) => {
    try {
      if (selectedProduct) {
        await masterService.updateProduct(selectedProduct._id, data);
        showNotification("Product updated successfully", "success");
      } else {
        await masterService.createProduct(data);
        showNotification("Product created successfully", "success");
      }
      setOpenDialog(false);
      fetchProducts();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "categoryName", headerName: "Category", flex: 1 },
    { field: "gsm", headerName: "GSM", flex: 1 },
    { field: "qualityName", headerName: "Quality", flex: 1 },
    { field: "productCode", headerName: "Product Code", flex: 1 },
    { field: "hsnCode", headerName: "HSN Code", flex: 1 },
    { field: "defaultLengthMeters", headerName: "Length (meters)", flex: 1 },
    { field: "taxRate", headerName: "Tax %", flex: 1 },
    {
      field: "active",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (params.value ? "Active" : "Inactive"),
    },
  ];

  return (
    <Box>
      <DataTable
        title="Products"
        columns={columns}
        rows={products}
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
            {selectedProduct ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: "Category is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Category"
                  margin="normal"
                  error={!!errors.categoryId}
                  helperText={errors.categoryId?.message}
                  disabled={!!selectedProduct}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="gsm"
              control={control}
              rules={{ required: "GSM is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="GSM"
                  margin="normal"
                  error={!!errors.gsm}
                  helperText={errors.gsm?.message}
                  disabled={!!selectedProduct}
                >
                  {[30, 35, 45, 55, 65, 80].map((gsm) => (
                    <MenuItem key={gsm} value={gsm}>
                      {gsm}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="qualityName"
              control={control}
              rules={{ required: "Quality name is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Quality"
                  margin="normal"
                  error={!!errors.qualityName}
                  helperText={errors.qualityName?.message}
                  disabled={!!selectedProduct}
                ></TextField>
              )}
            />
            <Controller
              name="productCode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Product Code"
                  margin="normal"
                  disabled
                />
              )}
            />
            <Controller
              name="hsnCode"
              control={control}
              rules={{ required: "HSN code is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="HSN Code"
                  margin="normal"
                  error={!!errors.hsnCode}
                  helperText={errors.hsnCode?.message}
                />
              )}
            />
            <Controller
              name="defaultLengthMeters"
              control={control}
              rules={{ required: "Default length is required" }}
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
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label="Tax Rate (%)"
                  margin="normal"
                  inputProps={{ min: 0, max: 100, step: 1 }}
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
              {selectedProduct ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product?"
      />
    </Box>
  );
};

export default Products;
