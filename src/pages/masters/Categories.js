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
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import masterService from "../../services/masterService";

const Categories = () => {
  const { showNotification, setLoading } = useApp();
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      hsnCode: "",
      active: true,
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await masterService.getCategories();
      setCategories(response.data);
    } catch (error) {
      showNotification("Failed to fetch categories", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedCategory(null);
    reset({
      name: "",
      hsnCode: "",
      active: true,
    });
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedCategory(row);
    reset({
      name: row.name,
      hsnCode: row.hsnCode,
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
      await masterService.deleteCategory(deleteId);
      showNotification("Category deleted successfully", "success");
      fetchCategories();
    } catch (error) {
      showNotification("Failed to delete category", "error");
    }
    setOpenConfirm(false);
  };

  const onSubmit = async (data) => {
    try {
      if (selectedCategory) {
        await masterService.updateCategory(selectedCategory._id, data);
        showNotification("Category updated successfully", "success");
      } else {
        await masterService.createCategory(data);
        showNotification("Category created successfully", "success");
      }
      setOpenDialog(false);
      fetchCategories();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "name", headerName: "Category Name", flex: 1 },
    { field: "hsnCode", headerName: "HSN Code", width: 150 },
    {
      field: "active",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (params.value ? "Active" : "Inactive"),
    },
  ];

  return (
    <Box>
      <DataTable
        title="Categories"
        columns={columns}
        rows={categories}
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
            {selectedCategory ? "Edit Category" : "Add Category"}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Category name is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Category Name"
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                >
                  <MenuItem value="Sublimation">Sublimation</MenuItem>
                  <MenuItem value="Butter">Butter</MenuItem>
                </TextField>
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
              {selectedCategory ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category?"
      />
    </Box>
  );
};

export default Categories;
