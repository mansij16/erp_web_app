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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as UnblockIcon,
  CreditCard as CreditIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import masterService from "../../services/masterService";
import { formatCurrency, formatDate } from "../../utils/formatters";

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
  const [customerGroups, setCustomerGroups] = useState([]);
  const [agents, setAgents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [creditCheckDialog, setCreditCheckDialog] = useState(false);
  const [creditCheckResult, setCreditCheckResult] = useState(null);
  const [rateHistoryDialog, setRateHistoryDialog] = useState(false);
  const [rateHistory, setRateHistory] = useState([]);
  const [loadingRateHistory, setLoadingRateHistory] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [creatingGroup, setCreatingGroup] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      companyName: "",
      gstin: "",
      agentId: "",
      state: "",
      address: {
        billing: {
          line1: "",
          line2: "",
          city: "",
          pincode: "",
        },
      },
      customerGroupIds: [],
      contactPersons: [{ name: "", phone: "", email: "", isPrimary: true }],
      referralSource: {
        source: "",
        name: "",
        contact: "",
        company: "",
        remarks: "",
      },
      businessInfo: {
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
    fetchCustomerGroups();
    fetchAgents();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await masterService.getCustomers();
      setCustomers(response.data || response.customers || []);
    } catch (error) {
      showNotification("Failed to fetch customers", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerGroups = async () => {
    try {
      const response = await masterService.getCustomerGroups({ active: true });
      setCustomerGroups(response.data || response.customerGroups || []);
    } catch (error) {
      console.error("Failed to fetch customer groups:", error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await masterService.getAgents({
        active: true,
        limit: 500,
      });
      setAgents(response.agents || response.data || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    }
  };

  const resetGroupForm = () =>
    setNewGroupForm({ name: "", code: "", description: "" });

  const handleOpenGroupDialog = () => {
    setGroupDialogOpen(true);
  };

  const handleCloseGroupDialog = () => {
    if (creatingGroup) return;
    setGroupDialogOpen(false);
    resetGroupForm();
  };

  const handleCreateCustomerGroup = async () => {
    if (!newGroupForm.name.trim() || !newGroupForm.code.trim()) {
      showNotification("Name and code are required", "warning");
      return;
    }

    try {
      setCreatingGroup(true);
      const response = await masterService.createCustomerGroup({
        name: newGroupForm.name.trim(),
        code: newGroupForm.code.trim(),
        description: newGroupForm.description?.trim(),
        active: true,
      });
      const createdGroup = response.data || response;
      setCustomerGroups((prev) =>
        [...prev, createdGroup].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        )
      );
      const createdId = createdGroup._id || createdGroup.id;
      const currentSelection = watch("customerGroupIds") || [];
      setValue(
        "customerGroupIds",
        [...new Set([...currentSelection, createdId])],
        { shouldValidate: true }
      );
      showNotification("Customer group added", "success");
      setGroupDialogOpen(false);
      resetGroupForm();
    } catch (error) {
      showNotification(
        error.message || "Failed to create customer group",
        "error"
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    reset({
      companyName: "",
      gstin: "",
      agentId: "",
      state: "",
      address: {
        billing: {
          line1: "",
          line2: "",
          city: "",
          pincode: "",
        },
      },
      customerGroupIds: [],
      contactPersons: [{ name: "", phone: "", email: "", isPrimary: true }],
      referralSource: {
        source: "",
        name: "",
        contact: "",
        company: "",
        remarks: "",
      },
      businessInfo: {
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
    const normalizedGroupIds = row.customerGroupIds?.length
      ? row.customerGroupIds.map((group) => group?._id || group)
      : row.customerGroupId
      ? [row.customerGroupId._id || row.customerGroupId]
      : [];

    reset({
      companyName: row.companyName || "",
      gstin: row.gstin || "",
      agentId: row.agentId?._id || row.agentId || "",
      state: row.state || "",
      address: row.address || {
        billing: {
          line1: "",
          line2: "",
          city: "",
          pincode: "",
        },
      },
      customerGroupIds: normalizedGroupIds,
      contactPersons: row.contactPersons || [
        { name: "", phone: "", email: "", isPrimary: true },
      ],
      referralSource: row.referral || {
        source: "",
        name: "",
        contact: "",
        company: "",
        remarks: "",
      },
      businessInfo: row.businessInfo || { targetSalesMeters: 0 },
      creditPolicy: row.creditPolicy || {
        creditLimit: 0,
        creditDays: 0,
        graceDays: 0,
        autoBlock: false,
        blockRule: "BOTH",
      },
      baseRate44: row.baseRate44 || 0,
      active: row.active !== undefined ? row.active : true,
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

  const handleViewRateHistory = async () => {
    if (!selectedCustomer?._id) {
      showNotification("Please select a customer first", "warning");
      return;
    }

    setLoadingRateHistory(true);
    setRateHistoryDialog(true);
    try {
      const history = await masterService.getCustomerRateHistory(
        selectedCustomer._id
      );
      setRateHistory(history);
    } catch (error) {
      showNotification("Failed to fetch rate history", "error");
      setRateHistory([]);
    } finally {
      setLoadingRateHistory(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      // Sanitize numeric fields - convert formatted strings to numbers
      const sanitizedData = { ...data };

      // Convert creditPolicy numeric fields
      if (sanitizedData.creditPolicy) {
        if (typeof sanitizedData.creditPolicy.creditLimit === "string") {
          sanitizedData.creditPolicy.creditLimit =
            parseFloat(
              sanitizedData.creditPolicy.creditLimit.replace(/[₹,\s]/g, "")
            ) || 0;
        }
        if (typeof sanitizedData.creditPolicy.creditDays === "string") {
          sanitizedData.creditPolicy.creditDays =
            parseInt(
              sanitizedData.creditPolicy.creditDays.replace(/[,\s]/g, "")
            ) || 0;
        }
        if (typeof sanitizedData.creditPolicy.graceDays === "string") {
          sanitizedData.creditPolicy.graceDays =
            parseInt(
              sanitizedData.creditPolicy.graceDays.replace(/[,\s]/g, "")
            ) || 0;
        }
      }

      // Convert businessInfo numeric fields
      if (sanitizedData.businessInfo?.targetSalesMeters) {
        if (typeof sanitizedData.businessInfo.targetSalesMeters === "string") {
          sanitizedData.businessInfo.targetSalesMeters =
            parseFloat(
              sanitizedData.businessInfo.targetSalesMeters.replace(
                /[₹,\s]/g,
                ""
              )
            ) || 0;
        }
      }

      // Convert baseRate44 if it exists
      if (
        sanitizedData.baseRate44 &&
        typeof sanitizedData.baseRate44 === "string"
      ) {
        sanitizedData.baseRate44 =
          parseFloat(sanitizedData.baseRate44.replace(/[₹,\s]/g, "")) || 0;
      }

      const normalizedGroups = Array.isArray(sanitizedData.customerGroupIds)
        ? sanitizedData.customerGroupIds.filter(Boolean)
        : [];

      if (!normalizedGroups.length) {
        showNotification("Select at least one customer group", "error");
        return;
      }

      sanitizedData.customerGroupIds = normalizedGroups;
      sanitizedData.customerGroupId = normalizedGroups[0];

      if (selectedCustomer) {
        await masterService.updateCustomer(selectedCustomer._id, sanitizedData);
        showNotification("Customer updated successfully", "success");
      } else {
        await masterService.createCustomer(sanitizedData);
        showNotification("Customer created successfully", "success");
      }
      setOpenDialog(false);
      fetchCustomers();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    }
  };

  const columns = [
    { field: "customerCode", headerName: "Code" },
    { field: "companyName", headerName: "Customer Name" },
    { field: "state", headerName: "State" },
    {
      field: "customerGroups",
      headerName: "Customer Groups",
      renderCell: (params) => {
        const groupsSource =
          (params.row.customerGroupIds && params.row.customerGroupIds.length
            ? params.row.customerGroupIds
            : params.row.customerGroupId
            ? [params.row.customerGroupId]
            : []) || [];

        const groups = groupsSource.filter(Boolean);
        if (!groups.length) return "-";

        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {groups.map((group) => {
              const id = group._id || group.id || group;
              const label =
                group.name && group.code
                  ? `${group.name} (${group.code})`
                  : group.name || group.code || group;
              return (
                <Chip
                  key={id}
                  label={label}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            })}
          </Box>
        );
      },
    },
    {
      field: "agent",
      headerName: "Agent",
      renderCell: (params) => {
        const agent = params.row.agentId;
        if (!agent) return "-";

        if (typeof agent === "string") {
          return agent;
        }

        const name = agent.name || agent.agentCode || agent._id || "-";
        const code = agent.agentCode ? ` (${agent.agentCode})` : "";
        return `${name}${code}`;
      },
    },
    {
      field: "baseRate44",
      headerName: '44" Rate',
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "creditPolicy",
      headerName: "Credit Limit",
      renderCell: (params) => formatCurrency(params.value?.creditLimit || 0),
    },
    {
      field: "isBlocked",
      headerName: "Status",
      renderCell: (params) => {
        const isBlocked = params.row.creditPolicy?.isBlocked || false;
        return (
          <Chip
            label={isBlocked ? "Blocked" : "Active"}
            color={isBlocked ? "error" : "success"}
            size="small"
          />
        );
      },
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
      show: (row) => !row.creditPolicy?.isBlocked,
    },
    {
      icon: <UnblockIcon />,
      label: "Unblock",
      onClick: handleUnblock,
      show: (row) => row.creditPolicy?.isBlocked,
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
                    name="companyName"
                    control={control}
                    rules={{ required: "Customer name is required" }}
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
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="gstin"
                    control={control}
                    rules={{ required: "GSTIN is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="GSTIN"
                        error={!!errors.gstin}
                        helperText={errors.gstin?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="address.billing.line1"
                    control={control}
                    rules={{ required: "Address line 1 is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Address Line 1"
                        error={!!errors.address?.billing?.line1}
                        helperText={errors.address?.billing?.line1?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="address.billing.line2"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Address Line 2" />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
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

                <Grid item xs={12} md={4}>
                  <Controller
                    name="address.billing.city"
                    control={control}
                    rules={{ required: "City is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="City"
                        error={!!errors.address?.billing?.city}
                        helperText={errors.address?.billing?.city?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="address.billing.pincode"
                    control={control}
                    rules={{ required: "Pincode is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Pincode"
                        error={!!errors.address?.billing?.pincode}
                        helperText={errors.address?.billing?.pincode?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="agentId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        label="Agent"
                        value={field.value || ""}
                        error={!!errors.agentId}
                        helperText={errors.agentId?.message}
                      >
                        <MenuItem value="">Unassigned</MenuItem>
                        {agents.map((agent) => (
                          <MenuItem key={agent._id} value={agent._id}>
                            {agent.name}
                            {agent.agentCode ? ` (${agent.agentCode})` : ""}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="customerGroupIds"
                    control={control}
                    rules={{
                      validate: (value) =>
                        value && value.length
                          ? true
                          : "Select at least one customer group",
                    }}
                    render={({ field }) => {
                      const selectedValues = field.value || [];
                      const toggleGroup = (groupId) => {
                        if (selectedValues.includes(groupId)) {
                          field.onChange(
                            selectedValues.filter((id) => id !== groupId)
                          );
                        } else {
                          field.onChange([...selectedValues, groupId]);
                        }
                      };

                      return (
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Customer Groups
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 1,
                            }}
                          >
                            {customerGroups.map((group) => {
                              const id = group._id || group.id;
                              const isSelected = selectedValues.includes(id);
                              return (
                                <Chip
                                  key={id}
                                  label={`${group.name} (${group.code})`}
                                  onClick={() => toggleGroup(id)}
                                  color={isSelected ? "primary" : "default"}
                                  variant={isSelected ? "filled" : "outlined"}
                                  clickable
                                  sx={{
                                    borderRadius: 1,
                                    px: 1.5,
                                    borderWidth: 1,
                                    borderStyle: "solid",
                                    borderColor: isSelected
                                      ? "primary.main"
                                      : "grey.400",
                                    bgcolor: isSelected
                                      ? "primary.light"
                                      : "transparent",
                                  }}
                                />
                              );
                            })}
                          </Box>
                          {(!customerGroups || customerGroups.length === 0) && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1 }}
                            >
                              No customer groups available. Add one below.
                            </Typography>
                          )}
                          {errors.customerGroupIds && (
                            <Typography
                              color="error"
                              variant="caption"
                              sx={{ display: "block", mt: 1 }}
                            >
                              {errors.customerGroupIds.message}
                            </Typography>
                          )}
                          <Button
                            variant="text"
                            size="small"
                            startIcon={<AddIcon fontSize="small" />}
                            sx={{ mt: 1 }}
                            onClick={handleOpenGroupDialog}
                          >
                            Add Customer Group
                          </Button>
                        </Box>
                      );
                    }}
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
                      phone: "",
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
                    <Grid item xs={12} md={3}>
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
                              errors.contactPersons?.[index]?.name?.message
                            }
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
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
                            error={!!errors.contactPersons?.[index]?.phone}
                            helperText={
                              errors.contactPersons?.[index]?.phone?.message
                            }
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
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
                    <Grid item xs={12} md={2}>
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
                <Grid item xs={12} md={3}>
                  <Controller
                    name="referralSource.source"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Referral Source" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="referralSource.name"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Referral Name" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="referralSource.contact"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Contact Number" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="referralSource.company"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Company Name" />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="referralSource.remarks"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Remarks"
                        multiline
                        rows={5}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="businessInfo.targetSalesMeters"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <NumericFormat
                        {...field}
                        value={value || 0}
                        onValueChange={(values) => {
                          // Store the numeric value, not the formatted string
                          onChange(values.floatValue || 0);
                        }}
                        customInput={TextField}
                        fullWidth
                        label="Monthly Target (meters)"
                        thousandSeparator=","
                        decimalScale={0}
                        allowNegative={false}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="creditPolicy.creditLimit"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <NumericFormat
                        {...field}
                        value={value || 0}
                        onValueChange={(values) => {
                          // Store the numeric value, not the formatted string
                          onChange(values.floatValue || 0);
                        }}
                        customInput={TextField}
                        fullWidth
                        label="Credit Limit (₹)"
                        thousandSeparator=","
                        decimalScale={2}
                        prefix="₹"
                        allowNegative={false}
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
                        <MenuItem value="OVER_LIMIT">Credit Over Limit</MenuItem>
                        <MenuItem value="OVER_DUE">Days Over Due</MenuItem>
                        <MenuItem value="BOTH">Any Breach (Limit or Days)</MenuItem>
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
                    render={({ field: { onChange, value, ...field } }) => (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1,
                        }}
                      >
                        <NumericFormat
                          {...field}
                          value={value || 0}
                          onValueChange={(values) => {
                            // Store the numeric value, not the formatted string
                            onChange(values.floatValue || 0);
                          }}
                          customInput={TextField}
                          fullWidth
                          label='Base Rate for 44"'
                          thousandSeparator=","
                          decimalScale={2}
                          prefix="₹"
                          allowNegative={false}
                          error={!!errors.baseRate44}
                          helperText={errors.baseRate44?.message}
                        />
                        {selectedCustomer && (
                          <Tooltip title="View Rate History">
                            <IconButton
                              onClick={handleViewRateHistory}
                              color="primary"
                              sx={{ mt: 1 }}
                            >
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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
                  <strong>Total Exposure:</strong>
                  {formatCurrency(creditCheckResult.exposure)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Credit Limit:</strong>
                  {formatCurrency(creditCheckResult.creditLimit)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Outstanding AR:</strong>
                  {formatCurrency(creditCheckResult.outstandingAR)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Pending Orders:</strong>
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

      {/* Rate History Dialog */}
      <Dialog
        open={rateHistoryDialog}
        onClose={() => setRateHistoryDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Rate History - {selectedCustomer?.name || "Customer"}
        </DialogTitle>
        <DialogContent>
          {loadingRateHistory ? (
            <Typography>Loading rate history...</Typography>
          ) : rateHistory.length === 0 ? (
            <Typography color="text.secondary">
              No rate history found for this customer.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>44" Rate</TableCell>
                    <TableCell>Applied Width</TableCell>
                    <TableCell>Applied Rate</TableCell>
                    <TableCell>SO Number</TableCell>
                    <TableCell>SI Number</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rateHistory.map((history, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {formatDate(history.createdAt || history.date)}
                      </TableCell>
                      <TableCell>
                        {history.productId?.name ||
                          history.productId?.productCode ||
                          "-"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(history.effectiveRate44)}
                      </TableCell>
                      <TableCell>
                        {history.appliedWidth
                          ? `${history.appliedWidth}"`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {history.appliedRate
                          ? formatCurrency(history.appliedRate)
                          : "-"}
                      </TableCell>
                      <TableCell>{history.soId?.soNumber || "-"}</TableCell>
                      <TableCell>{history.siId?.siNumber || "-"}</TableCell>
                      <TableCell>
                        {history.isOverride && (
                          <Chip
                            label="Override"
                            color="warning"
                            size="small"
                            sx={{ mr: 0.5 }}
                          />
                        )}
                        {history.isSpecialDeal && (
                          <Chip
                            label="Special Deal"
                            color="info"
                            size="small"
                          />
                        )}
                        {!history.isOverride && !history.isSpecialDeal && "-"}
                      </TableCell>
                      <TableCell>
                        {history.overrideReason || history.dealNotes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={groupDialogOpen} onClose={handleCloseGroupDialog}>
        <DialogTitle>Add Customer Group</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Group Name"
              value={newGroupForm.name}
              onChange={(event) =>
                setNewGroupForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              required
              fullWidth
            />
            <TextField
              label="Group Code"
              value={newGroupForm.code}
              onChange={(event) =>
                setNewGroupForm((prev) => ({
                  ...prev,
                  code: event.target.value,
                }))
              }
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={newGroupForm.description}
              onChange={(event) =>
                setNewGroupForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              fullWidth
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDialog} disabled={creatingGroup}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateCustomerGroup}
            disabled={creatingGroup}
            variant="contained"
          >
            {creatingGroup ? "Adding..." : "Add Group"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers;
