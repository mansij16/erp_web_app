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
  Paper,
  Chip,
  MenuItem,
  Tabs,
  Tab,
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
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

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
      supplierCode: "",
      name: "",
      gstin: "",
      state: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        pincode: "",
      },
      contactPersons: [{ name: "", phone: "", isPrimary: true }],
      categoryRates: [],
      active: true,
    },
  });

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({
    control,
    name: "contactPersons",
  });

  const {
    fields: categoryRateFields,
    append: appendCategoryRate,
    remove: removeCategoryRate,
  } = useFieldArray({
    control,
    name: "categoryRates",
  });

  const watchedContactPersons = watch("contactPersons");

  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const response = await masterService.getCategories({ active: true });
      setCategories(response.data || response.categories || []);
    } catch (error) {
      showNotification("Failed to fetch categories", "error");
    }
  };

  const normalizeCategoryRates = (rates = [], fallbackCategories = []) => {
    if (rates && rates.length > 0) {
      return rates.map((rate = {}) => ({
        categoryId:
          rate.categoryId?._id ||
          rate.category?._id ||
          rate.categoryId ||
          rate.category ||
          "",
        baseRate:
          rate.baseRate !== undefined && rate.baseRate !== null
            ? rate.baseRate
            : "",
      }));
    }

    if (fallbackCategories && fallbackCategories.length > 0) {
      return fallbackCategories.map((category = {}) => ({
        categoryId: category._id || category.id || category,
        baseRate: "",
      }));
    }

    return [];
  };

  const sanitizeRateValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const cleaned = value.replace(/[^\d.-]/g, "");
      const parsed = parseFloat(cleaned);
      return Number.isNaN(parsed) ? "" : parsed;
    }

    if (typeof value === "object" && value !== null) {
      if (typeof value.value === "number") {
        return value.value;
      }
      if (typeof value.value === "string") {
        return sanitizeRateValue(value.value);
      }
    }

    const numeric = Number(value);
    return Number.isNaN(numeric) ? "" : numeric;
  };

  const handleAdd = async () => {
    setSelectedSupplier(null);
    setActiveTab(0);

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
      state: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        pincode: "",
      },
      contactPersons: [{ name: "", phone: "", isPrimary: true }],
      categoryRates: [],
      active: true,
    });
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedSupplier(row);
    setActiveTab(0);
    reset({
      supplierCode: row.supplierCode || "",
      name: row.name || "",
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
      categoryRates: normalizeCategoryRates(
        row.categoryRates,
        row.categories || []
      ),
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
      const sanitizedCategoryRates = (data.categoryRates || [])
        .map((rate = {}) => {
          const cleanedRate = sanitizeRateValue(rate.baseRate);
          return {
            categoryId: rate.categoryId || "",
            baseRate: cleanedRate,
          };
        })
        .filter((rate) => rate.categoryId && rate.baseRate !== "");

      const payload = {
        ...data,
        categoryRates: sanitizedCategoryRates,
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

  const setPrimary = (index) => {
    const contactPersons = getValues("contactPersons") || [];
    contactPersons.forEach((_, i) => {
      setValue(`contactPersons.${i}.isPrimary`, i === index);
    });
  };

  const columns = [
    { field: "supplierCode", headerName: "Supplier Code" },
    { field: "name", headerName: "Supplier Name" },
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
        PaperProps={{
          sx: {
            height: "74vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <DialogTitle>
            {selectedSupplier ? "Edit Supplier" : "Add New Supplier"}
          </DialogTitle>
          <DialogContent sx={{ p: 0, overflowY: "auto", flex: 1 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="fullWidth"
              >
                <Tab label="Supplier Details" />
                <Tab label="Base Rates" />
                <Tab label="Contact Persons" />
              </Tabs>
            </Box>

            {/* Tab 0: Supplier Details */}
            <Box role="tabpanel" hidden={activeTab !== 0} sx={{ p: 3 }}>
              {activeTab === 0 && (
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
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
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
                  </Grid>
                  <Grid item xs={12}>
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
                  </Grid>
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
              )}
            </Box>

            {/* Tab 1: Base Rates */}
            <Box role="tabpanel" hidden={activeTab !== 1} sx={{ p: 3 }}>
              {activeTab === 1 && (
                <>
                  <Grid
                    container
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ mb: 2 }}
                  >
                    <Grid item>
                      <Typography variant="h6">Base Rates</Typography>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() =>
                          appendCategoryRate({ categoryId: "", baseRate: "" })
                        }
                        disabled={!categories?.length}
                      >
                        Add Rate
                      </Button>
                    </Grid>
                  </Grid>

                  {categoryRateFields.length === 0 ? (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        textAlign: "center",
                        color: "text.secondary",
                        borderStyle: "dashed",
                      }}
                    >
                      {categories?.length
                        ? "No base rates added yet"
                        : "No categories available. Create categories first."}
                    </Paper>
                  ) : (
                    <Grid container spacing={1.5}>
                      {categoryRateFields.map((fieldItem, index) => (
                        <Grid item xs={12} key={fieldItem.id}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 1.5,
                              alignItems: "center",
                            }}
                          >
                            <Box sx={{ flex: "1 1 220px" }}>
                              <Controller
                                name={`categoryRates.${index}.categoryId`}
                                control={control}
                                rules={{ required: "Category is required" }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    select
                                    fullWidth
                                    label="Category"
                                    error={
                                      !!errors.categoryRates?.[index]
                                        ?.categoryId
                                    }
                                    helperText={
                                      errors.categoryRates?.[index]?.categoryId
                                        ?.message
                                    }
                                  >
                                    {categories?.length ? (
                                      categories.map((category) => {
                                        const categoryId =
                                          category._id ||
                                          category.id ||
                                          category.value;
                                        return (
                                          <MenuItem
                                            key={categoryId}
                                            value={categoryId}
                                          >
                                            {category.name ||
                                              category.code ||
                                              "Unnamed"}
                                          </MenuItem>
                                        );
                                      })
                                    ) : (
                                      <MenuItem value="" disabled>
                                        No categories found
                                      </MenuItem>
                                    )}
                                  </TextField>
                                )}
                              />
                            </Box>

                            <Box sx={{ flex: "1 1 160px", minWidth: 140 }}>
                              <Controller
                                name={`categoryRates.${index}.baseRate`}
                                control={control}
                                rules={{
                                  required: "Base rate is required",
                                  validate: (value) => {
                                    if (value === "" || value === null) {
                                      return "Base rate is required";
                                    }
                                    const numeric = Number(
                                      String(value).replace(/[₹,\s]/g, "")
                                    );
                                    return Number.isNaN(numeric)
                                      ? "Enter a valid amount"
                                      : true;
                                  },
                                }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    type="number"
                                    fullWidth
                                    label="Base Rate"
                                    inputProps={{ min: 0, step: "0.01" }}
                                    error={
                                      !!errors.categoryRates?.[index]?.baseRate
                                    }
                                    helperText={
                                      errors.categoryRates?.[index]?.baseRate
                                        ?.message
                                    }
                                  />
                                )}
                              />
                            </Box>

                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeCategoryRate(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </>
              )}
            </Box>

            {/* Tab 2: Contact Persons */}
            <Box role="tabpanel" hidden={activeTab !== 2} sx={{ p: 3 }}>
              {activeTab === 2 && (
                <>
                  <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Grid item>
                      <Typography variant="h6">
                        Contact Persons
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() =>
                          appendContact({
                            name: "",
                            phone: "",
                            isPrimary: false,
                          })
                        }
                      >
                        Add Contact
                      </Button>
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    {contactFields.map((fieldItem, index) => {
                      const isPrimary =
                        watchedContactPersons?.[index]?.isPrimary || false;
                      return (
                        <Grid item xs={12} key={fieldItem.id}>
                          <Box
                            sx={{
                              p: 2,
                              border: 1,
                              borderColor: isPrimary
                                ? "primary.main"
                                : "divider",
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
                                  <Box sx={{ display: "flex", gap: 0.5 }}>
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
                                    {contactFields.length > 1 && (
                                      <IconButton
                                        size="small"
                                        onClick={() => removeContact(index)}
                                        color="error"
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Box>
                                </Box>
                              </Grid>
                              <Grid item xs={12} sm={6}>
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
                                      error={
                                        !!errors.contactPersons?.[index]?.name
                                      }
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
                            </Grid>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ flexShrink: 0 }}>
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
