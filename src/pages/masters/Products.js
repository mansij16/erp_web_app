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
  const [gsmList, setGsmList] = useState([]);
  const [qualityList, setQualityList] = useState([]);
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
      gsmId: "",
      qualityId: "",
      productCode: "",
      hsnCode: "",
      taxRate: 18,
      defaultLengthMeters: 1000,
      active: true,
    },
  });

  // Auto-generate productCode from category code + gsm + quality
  const watchCategoryId = watch("categoryId");
  const watchGsmId = watch("gsmId");
  const watchQualityId = watch("qualityId");

  useEffect(() => {
    // Only auto-generate product code when all three fields are selected
    if (!watchCategoryId || !watchGsmId || !watchQualityId) {
      setValue("productCode", "");
      return;
    }
    
    const category = categories.find((c) => String(c._id) === String(watchCategoryId));
    const gsm = gsmList.find((g) => String(g._id) === String(watchGsmId));
    const quality = qualityList.find((q) => String(q._id) === String(watchQualityId));
    
    if (!category || !gsm || !quality) {
      // Wait for all data to be loaded
      return;
    }
    
    const gsmName = gsm.name || "";
    const qualityName = quality.name || "";
    const categoryName = category.name || "";
    
    // Product code format: gsmName + qualityName + categoryName (from model)
    // Example: "30 GSMPremiumSublimation"
    const code = gsmName && qualityName && categoryName
      ? `${gsmName}${qualityName}${categoryName}`
      : "";
    
    if (code) {
      setValue("productCode", code, { shouldValidate: false });
    }
    
    // Auto-set HSN code from category if available and not editing
    if (category.hsnCode && !selectedProduct) {
      const currentHsnCode = watch("hsnCode");
      if (!currentHsnCode) {
        setValue("hsnCode", category.hsnCode, { shouldValidate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchCategoryId, watchGsmId, watchQualityId, categories, gsmList, qualityList, selectedProduct]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchCategories();
      await fetchProducts();
    };
    initializeData();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await masterService.getProducts();
      const list = response.products || [];
      
      // Extract GSM and Quality lists from products first (before mapping)
      extractGSMAndQualityFromProducts(list);
      
      // Map products for display in table
      // API now populates gsmId, qualityId, and categoryId directly (not as virtuals)
      const mapped = list.map((p) => {
        // Handle category - API populates categoryId as an object with name, code, etc.
        const category = p.categoryId;
        const categoryName = (category && typeof category === 'object' && category.name) 
          ? category.name 
          : "";
        const categoryId = (category && typeof category === 'object' && category._id) 
          ? category._id 
          : (p.categoryId || "");
        
        // Handle GSM - API populates gsmId as an object with name, value, etc.
        const gsm = p.gsmId;
        const gsmName = (gsm && typeof gsm === 'object' && gsm.name) 
          ? gsm.name 
          : "";
        const gsmId = (gsm && typeof gsm === 'object' && gsm._id) 
          ? gsm._id 
          : (p.gsmId || "");
        
        // Handle Quality - API populates qualityId as an object with name, etc.
        const quality = p.qualityId;
        const qualityName = (quality && typeof quality === 'object' && quality.name) 
          ? quality.name 
          : "";
        const qualityId = (quality && typeof quality === 'object' && quality._id) 
          ? quality._id 
          : (p.qualityId || "");
        
        return {
          ...p,
          categoryName,
          gsmName,
          qualityName,
          // Store original populated objects for extraction
          _category: category,
          _gsm: gsm,
          _quality: quality,
          // Normalize IDs for form usage (ensure they're strings for comparison)
          categoryId: categoryId ? String(categoryId) : "",
          gsmId: gsmId ? String(gsmId) : "",
          qualityId: qualityId ? String(qualityId) : "",
        };
      });
      
      setProducts(mapped);
    } catch (error) {
      showNotification("Failed to fetch products", "error");
    } finally {
      setLoading(false);
    }
  };

  const extractGSMAndQualityFromProducts = (products) => {
    const gsmMap = new Map();
    const qualityMap = new Map();
    
    products.forEach((product) => {
      // Extract GSM - API populates gsmId directly
      if (product.gsmId && typeof product.gsmId === 'object' && product.gsmId.name) {
        const gsmId = product.gsmId._id || product.gsmId;
        const gsmName = product.gsmId.name;
        
        if (gsmId && gsmName && !gsmMap.has(String(gsmId))) {
          gsmMap.set(String(gsmId), {
            _id: String(gsmId),
            name: gsmName,
          });
        }
      }
      
      // Extract Quality - API populates qualityId directly
      if (product.qualityId && typeof product.qualityId === 'object' && product.qualityId.name) {
        const qualityId = product.qualityId._id || product.qualityId;
        const qualityName = product.qualityId.name;
        
        if (qualityId && qualityName && !qualityMap.has(String(qualityId))) {
          qualityMap.set(String(qualityId), {
            _id: String(qualityId),
            name: qualityName,
          });
        }
      }
    });
    
    // Update lists if we found any entries
    if (gsmMap.size > 0) {
      setGsmList(Array.from(gsmMap.values()));
    }
    
    if (qualityMap.size > 0) {
      setQualityList(Array.from(qualityMap.values()));
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await masterService.getCategories({ active: true });
      setCategories(response.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };


  const handleAdd = () => {
    setSelectedProduct(null);
    reset({
      categoryId: "",
      gsmId: "",
      qualityId: "",
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
      categoryId: row.categoryId || "",
      gsmId: row.gsmId || "",
      qualityId: row.qualityId || "",
      productCode: row.productCode || "",
      hsnCode: row.hsnCode || "",
      taxRate: row.taxRate ?? 18,
      defaultLengthMeters: row.defaultLengthMeters ?? 1000,
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
      // Ensure we're sending the correct format to the API
      const productData = {
        categoryId: data.categoryId,
        gsmId: data.gsmId,
        qualityId: data.qualityId,
        hsnCode: data.hsnCode,
        taxRate: data.taxRate,
        defaultLengthMeters: data.defaultLengthMeters,
        active: data.active,
        // productCode is auto-generated on the backend, but we can include it if needed
        productCode: data.productCode || undefined,
      };

      if (selectedProduct) {
        await masterService.updateProduct(selectedProduct._id, productData);
        showNotification("Product updated successfully", "success");
      } else {
        await masterService.createProduct(productData);
        showNotification("Product created successfully", "success");
      }
      setOpenDialog(false);
      fetchProducts();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "categoryName", headerName: "Category" },
    { field: "gsmName", headerName: "GSM" },
    { field: "qualityName", headerName: "Quality" },
    { field: "productCode", headerName: "Product Code" },
    { field: "productAlias", headerName: "Product Alias" },
    { field: "hsnCode", headerName: "HSN Code" },
    { field: "defaultLengthMeters", headerName: "Length (meters)" },
    { field: "taxRate", headerName: "Tax %" },
    {
      field: "active",
      headerName: "Status",
      renderCell: (params) => (
        <Chip
          label={params.value ? "Active" : "Inactive"}
          color={params.value ? "success" : "default"}
          size="small"
        />
      ),
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
              name="gsmId"
              control={control}
              rules={{ required: "GSM is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="GSM"
                  margin="normal"
                  error={!!errors.gsmId}
                  helperText={errors.gsmId?.message}
                  disabled={!!selectedProduct}
                >
                  {gsmList.map((gsm) => (
                    <MenuItem key={gsm._id} value={gsm._id}>
                      {gsm.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="qualityId"
              control={control}
              rules={{ required: "Quality is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Quality"
                  margin="normal"
                  error={!!errors.qualityId}
                  helperText={errors.qualityId?.message}
                  disabled={!!selectedProduct}
                >
                  {qualityList.map((quality) => (
                    <MenuItem key={quality._id} value={quality._id}>
                      {quality.name}
                    </MenuItem>
                  ))}
                </TextField>
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
