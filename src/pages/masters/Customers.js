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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as UnblockIcon,
  CreditCard as CreditIcon,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import masterService from "../../services/masterService";
import { formatCurrency } from "../../utils/formatters";

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const Customers = () => {
  const { showNotification, setLoading } = useApp();
  const [customers, setCustomers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [creditCheckDialog, setCreditCheckDialog] = useState(false);
  const [creditCheckResult, setCreditCheckResult] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      state: "",
      address: "",
      groups: [],
      contactPersons: [{ name: "", phones: [""], email: "", isPrimary: true }],
      referralSource: {
        referralName: "",
        contactNumber: "",
        companyName: "",
        remark: "",
      },
      monthlyCapacity: {
        targetSalesMeters: 0,
      },
      creditPolicy: {
        creditLimit: 0,
        creditDays: 0,
        graceDays: 0,
        autoBlock: false,
        blockRule: "BOTH",
      },
      baseRate44: 0,
      active: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contactPersons",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await masterService.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      showNotification("Failed to fetch customers", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    reset({
      name: "",
      state: "",
      address: "",
      groups: [],
      contactPersons: [{ name: "", phones: [""], email: "", isPrimary: true }],
      referralSource: {
        referralName: "",
        contactNumber: "",
        companyName: "",
        remark: "",
      },
      monthlyCapacity: {
        targetSalesMeters: 0,
      },
      creditPolicy: {
        creditLimit: 0,
        creditDays: 0,
        graceDays: 0,
        autoBlock: false,
        blockRule: "BOTH",
      },
      baseRate44: 0,
      active: true,
    });
    setTabValue(0);
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedCustomer(row);
    reset({
      name: row.name,
      state: row.state,
      address: row.address,
      groups: row.groups || [],
      contactPersons: row.contactPersons || [
        { name: "", phones: [""], email: "", isPrimary: true },
      ],
      referralSource: row.referralSource || {},
      monthlyCapacity: row.monthlyCapacity || { targetSalesMeters: 0 },
      creditPolicy: row.creditPolicy || {
        creditLimit: 0,
        creditDays: 0,
        graceDays: 0,
        autoBlock: false,
        blockRule: "BOTH",
      },
      baseRate44: row.baseRate44 || 0,
      active: row.active,
    });
    setTabValue(0);
    setOpenDialog(true);
  };

  const handleDelete = (row) => {
    setDeleteId(row._id);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await masterService.deleteCustomer(deleteId);
      showNotification("Customer deleted successfully", "success");
      fetchCustomers();
    } catch (error) {
      showNotification("Failed to delete customer", "error");
    }
    setOpenConfirm(false);
  };

  const handleCreditCheck = async (row) => {
    setLoading(true);
    try {
      const response = await masterService.checkCredit(row._id);
      setCreditCheckResult(response.data);
      setCreditCheckDialog(true);
    } catch (error) {
      showNotification("Failed to check credit", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (row) => {
    const reason = prompt("Enter reason for blocking:");
    if (reason) {
      try {
        await masterService.blockCustomer(row._id, reason);
        showNotification("Customer blocked successfully", "success");
        fetchCustomers();
      } catch (error) {
        showNotification("Failed to block customer", "error");
      }
    }
  };

  const handleUnblock = async (row) => {
    try {
      await masterService.unblockCustomer(row._id);
      showNotification("Customer unblocked successfully", "success");
      fetchCustomers();
    } catch (error) {
      showNotification("Failed to unblock customer", "error");
    }
  };

  const onSubmit = async (data) => {
    try {
      if (selectedCustomer) {
        await masterService.updateCustomer(selectedCustomer._id, data);
        showNotification("Customer updated successfully", "success");
      } else {
        await masterService.createCustomer(data);
        showNotification("Customer created successfully", "success");
      }
      setOpenDialog(false);
      fetchCustomers();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "customerCode", headerName: "Code", width: 100 },
    { field: "name", headerName: "Customer Name", flex: 1 },
    { field: "state", headerName: "State", width: 120 },
    {
      field: "groups",
      headerName: "Groups",
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {params.value?.map((group) => (
            <Chip key={group} label={group} size="small" />
          ))}
        </Box>
      ),
    },
    {
      field: "baseRate44",
      headerName: '44" Rate',
      width: 100,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "creditPolicy",
      headerName: "Credit Limit",
      width: 120,
      renderCell: (params) => formatCurrency(params.value?.creditLimit || 0),
    },
    {
      field: "isBlocked",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Blocked" : "Active"}
          color={params.value ? "error" : "success"}
          size="small"
        />
      ),
    },
  ];

  const customActions = [
    {
      icon: <CreditIcon />,
      label: "Check Credit",
      onClick: handleCreditCheck,
    },
    {
      icon: <BlockIcon />,
      label: "Block",
      onClick: handleBlock,
      show: (row) => !row.isBlocked,
    },
    {
      icon: <UnblockIcon />,
      label: "Unblock",
      onClick: handleUnblock,
      show: (row) => row.isBlocked,
    },
  ];

  return (
    <Box>
      <DataTable
        title="Customers"
        columns={columns}
        rows={customers}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        customActions={customActions.filter(
          (action) => !action.show || action.show
        )}
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedCustomer ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
          <DialogContent>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Basic Info" />
              <Tab label="Contact Details" />
              <Tab label="Credit Policy" />
              <Tab label="Pricing" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: "Customer name is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Customer Name"
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
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
                        multiline
                        rows={2}
                        error={!!errors.address}
                        helperText={errors.address?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="groups"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Customer Groups</InputLabel>
                        <Select
                          {...field}
                          multiple
                          input={<OutlinedInput label="Customer Groups" />}
                          renderValue={(selected) => (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {selected.map((value) => (
                                <Chip key={value} label={value} size="small" />
                              ))}
                            </Box>
                          )}
                        >
                          {["Cash", "Wholesale", "Big"].map((group) => (
                            <MenuItem key={group} value={group}>
                              {group}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="monthlyCapacity.targetSalesMeters"
                    control={control}
                    render={({ field }) => (
                      <NumericFormat
                        {...field}
                        customInput={TextField}
                        fullWidth
                        label="Monthly Target (meters)"
                        thousandSeparator=","
                        decimalScale={0}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Contact Persons
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() =>
                    append({
                      name: "",
                      phones: [""],
                      email: "",
                      isPrimary: false,
                    })
                  }
                  size="small"
                >
                  Add Contact
                </Button>
              </Box>

              {fields.map((field, index) => (
                <Paper key={field.id} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
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
                    <Grid item xs={12} md={4}>
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
                    <Grid item xs={12} md={3}>
                      <Controller
                        name={`contactPersons.${index}.isPrimary`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch {...field} checked={field.value} />
                            }
                            label="Primary"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      {fields.length > 1 && (
                        <IconButton onClick={() => remove(index)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" gutterBottom>
                Referral Source
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="referralSource.referralName"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Referral Name" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="referralSource.contactNumber"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Contact Number" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="referralSource.companyName"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Company Name" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="referralSource.remark"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Remarks" />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="creditPolicy.creditLimit"
                    control={control}
                    render={({ field }) => (
                      <NumericFormat
                        {...field}
                        customInput={TextField}
                        fullWidth
                        label="Credit Limit (₹)"
                        thousandSeparator=","
                        decimalScale={2}
                        prefix="₹"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Controller
                    name="creditPolicy.creditDays"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Credit Days"
                        type="number"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Controller
                    name="creditPolicy.graceDays"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Grace Days"
                        type="number"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="creditPolicy.blockRule"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select fullWidth label="Block Rule">
                        <MenuItem value="OVER_LIMIT">Over Limit</MenuItem>
                        <MenuItem value="OVER_DUE">Over Due</MenuItem>
                        <MenuItem value="BOTH">Both</MenuItem>
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="creditPolicy.autoBlock"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Auto Block on Credit Breach"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="baseRate44"
                    control={control}
                    rules={{
                      required: 'Base rate for 44" is required',
                      min: { value: 0, message: "Rate must be positive" },
                    }}
                    render={({ field }) => (
                      <NumericFormat
                        {...field}
                        customInput={TextField}
                        fullWidth
                        label='Base Rate for 44"'
                        thousandSeparator=","
                        decimalScale={2}
                        prefix="₹"
                        error={!!errors.baseRate44}
                        helperText={errors.baseRate44?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Note: Rates for other widths will be automatically
                    calculated based on 44" rate
                  </Typography>
                </Grid>
              </Grid>
            </TabPanel>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedCustomer ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={creditCheckDialog}
        onClose={() => setCreditCheckDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Credit Check Result</DialogTitle>
        <DialogContent>
          {creditCheckResult && (
            <Box>
              <Typography
                variant="h6"
                color={creditCheckResult.blocked ? "error" : "success"}
                gutterBottom
              >
                Status: {creditCheckResult.blocked ? "BLOCKED" : "APPROVED"}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Total Exposure:</strong>{" "}
                  {formatCurrency(creditCheckResult.exposure)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Credit Limit:</strong>{" "}
                  {formatCurrency(creditCheckResult.creditLimit)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Outstanding AR:</strong>{" "}
                  {formatCurrency(creditCheckResult.outstandingAR)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Pending Orders:</strong>{" "}
                  {formatCurrency(creditCheckResult.pendingSOValue)}
                </Typography>
              </Box>

              {creditCheckResult.reasons &&
                creditCheckResult.reasons.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Reasons:
                    </Typography>
                    {creditCheckResult.reasons.map((reason, index) => (
                      <Typography key={index} variant="body2" color="error">
                        • {reason}
                      </Typography>
                    ))}
                  </Box>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreditCheckDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer?"
      />
    </Box>
  );
};

export default Customers;
