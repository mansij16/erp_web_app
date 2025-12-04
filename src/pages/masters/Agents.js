import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Tabs,
  Tab,
  Typography,
  FormControlLabel,
  Switch,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  UploadFile as UploadFileIcon,
  AttachMoney as AttachMoneyIcon,
  Paid as PaidIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import masterService from "../../services/masterService";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "../../utils/formatters";

const COMMISSION_METHOD_OPTIONS = [
  { value: "per_meter", label: "Amount per meter" },
  { value: "percentage", label: "Percentage of sales" },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "passport", label: "Passport" },
  { value: "license", label: "Driving License" },
  { value: "pan", label: "PAN" },
  { value: "other", label: "Other" },
];

const PAYOUT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "on_hold", label: "On Hold" },
];

const defaultFormValues = {
  name: "",
  state: "",
  phone: "",
  whatsapp: "",
  contactPersonName: "",
  contactPersonPhone: "",
  contactPersonEmail: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    pincode: "",
  },
  targetSalesMeters: 0,
  defaultRate: 0,
  defaultCreditLimit: 0,
  defaultCreditDays: 0,
  blockNewSalesForAllParties: false,
  blockNewDeliveriesForAllParties: false,
  blockedSalesCustomers: [],
  blockedDeliveryCustomers: [],
  customers: [],
  notes: "",
  active: true,
};

const getDateInputValue = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const TabPanel = ({ children, value, index }) => {
  if (value !== index) return null;
  return <Box sx={{ py: 2 }}>{children}</Box>;
};

const generateLocalId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const Agents = () => {
  const { showNotification, setLoading } = useApp();
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [confirmConfig, setConfirmConfig] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [commissionForm, setCommissionForm] = useState({
    customerId: "",
    commissionType: "per_meter",
    amountPerMeter: "",
    percentage: "",
    applyByDefault: true,
    effectiveFrom: getDateInputValue(new Date()),
    notes: "",
  });
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    customerId: "",
    reference: "",
    periodStart: "",
    periodEnd: "",
    amount: "",
    payoutStatus: "pending",
    paidOn: "",
    paymentReference: "",
    notes: "",
  });
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [kycForm, setKycForm] = useState({
    documentType: "other",
    fileName: "",
    fileUrl: "",
    notes: "",
  });
  const [localPartyCommissions, setLocalPartyCommissions] = useState([]);
  const [localCommissionPayouts, setLocalCommissionPayouts] = useState([]);
  const [localKycDocuments, setLocalKycDocuments] = useState([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: defaultFormValues,
  });

  const watchCommissionType = commissionForm.commissionType;

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([fetchAgents(), fetchCustomers()]);
  };

  const fetchAgents = async (params = {}) => {
    setLoading(true);
    try {
      const res = await masterService.getAgents(params);
      setAgents(res.agents || []);
    } catch (error) {
      showNotification("Failed to fetch agents", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await masterService.getCustomers({ limit: 500 });
      const list = res.data || res.customers || [];
      setCustomers(list);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    }
  };

  const partyCommissions =
    selectedAgent?.partyCommissions ?? localPartyCommissions;
  const commissionPayouts =
    selectedAgent?.commissionPayouts ?? localCommissionPayouts;
  const kycDocuments = selectedAgent?.kycDocuments ?? localKycDocuments;

  const customerLookup = useMemo(() => {
    const map = new Map();

    const addToMap = (entry) => {
      if (!entry) return;
      if (typeof entry === "string") {
        return;
      }
      const id = (
        entry._id ||
        entry.id ||
        entry.customerId ||
        entry.value ||
        ""
      ).toString();
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, entry);
      }
    };

    customers.forEach(addToMap);
    selectedAgent?.customers?.forEach(addToMap);
    selectedAgent?.customerList?.forEach(addToMap);
    partyCommissions.forEach((commission) => {
      addToMap(commission?.customer);
    });

    return map;
  }, [customers, selectedAgent, partyCommissions]);

  const resolveCustomerName = useCallback(
    (customerRef) => {
      if (!customerRef) return "-";

      if (typeof customerRef === "string") {
        const match = customerLookup.get(customerRef.toString());
        if (match) {
          return (
            match.name || match.companyName || match.customerCode || customerRef
          );
        }
        return customerRef;
      }

      const id =
        customerRef._id || customerRef.id || customerRef.customerId || "";
      if (id) {
        const match = customerLookup.get(id.toString());
        if (match) {
          return (
            match.name ||
            match.companyName ||
            match.customerCode ||
            id.toString()
          );
        }
      }

      return (
        customerRef.name ||
        customerRef.companyName ||
        customerRef.customerCode ||
        id?.toString() ||
        "-"
      );
    },
    [customerLookup]
  );

  const openConfirmDialog = (config) => {
    setConfirmConfig({
      open: true,
      ...config,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmConfig((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const handleAdd = () => {
    setSelectedAgent(null);
    reset(defaultFormValues);
    setLocalPartyCommissions([]);
    setLocalCommissionPayouts([]);
    setLocalKycDocuments([]);
    setTabIndex(0);
    setDialogOpen(true);
  };

  const mapAgentToForm = (agent) => ({
    name: agent.name || "",
    state: agent.state || "",
    phone: agent.phone || "",
    whatsapp: agent.whatsapp || "",
    contactPersonName: agent.contactPersonName || "",
    contactPersonPhone: agent.contactPersonPhone || "",
    contactPersonEmail: agent.contactPersonEmail || "",
    address: {
      line1: agent.address?.line1 || "",
      line2: agent.address?.line2 || "",
      city: agent.address?.city || "",
      pincode: agent.address?.pincode || "",
    },
    targetSalesMeters: agent.targetSalesMeters || 0,
    defaultRate: agent.defaultRate || 0,
    defaultCreditLimit: agent.defaultCreditLimit || 0,
    defaultCreditDays: agent.defaultCreditDays || 0,
    blockNewSalesForAllParties: agent.blockNewSalesForAllParties || false,
    blockNewDeliveriesForAllParties:
      agent.blockNewDeliveriesForAllParties || false,
    blockedSalesCustomers: (agent.blockedSalesCustomers || []).map((customer) =>
      typeof customer === "string" ? customer : customer?._id || ""
    ),
    blockedDeliveryCustomers: (agent.blockedDeliveryCustomers || []).map(
      (customer) =>
        typeof customer === "string" ? customer : customer?._id || ""
    ),
    customers: (agent.customers || []).map((customer) =>
      typeof customer === "string" ? customer : customer?._id || ""
    ),
    notes: agent.notes || "",
    active: agent.active !== undefined ? agent.active : true,
  });

  const updateAgentList = (agent) => {
    if (!agent) return;
    setAgents((prev) => {
      const existingIndex = prev.findIndex((item) => item._id === agent._id);
      if (existingIndex === -1) {
        return [agent, ...prev];
      }
      const updated = [...prev];
      updated[existingIndex] = agent;
      return updated;
    });
    setSelectedAgent(agent);
  };

  const handleEdit = async (agentRow) => {
    setLoading(true);
    try {
      const agent = await masterService.getAgent(agentRow._id);
      setSelectedAgent(agent);
      setLocalPartyCommissions([]);
      setLocalCommissionPayouts([]);
      setLocalKycDocuments([]);
      reset(mapAgentToForm(agent));
      setTabIndex(0);
      setDialogOpen(true);
    } catch (error) {
      showNotification("Failed to load agent details", "error");
    } finally {
      setLoading(false);
    }
  };

  const sanitizeNumber = (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const onSubmit = async (formData) => {
    const payload = {
      ...formData,
      targetSalesMeters: sanitizeNumber(formData.targetSalesMeters) || 0,
      defaultRate: sanitizeNumber(formData.defaultRate) || 0,
      defaultCreditLimit: sanitizeNumber(formData.defaultCreditLimit) || 0,
      defaultCreditDays: sanitizeNumber(formData.defaultCreditDays) || 0,
      customers: (formData.customers || []).filter(Boolean),
      blockedSalesCustomers: (formData.blockedSalesCustomers || []).filter(
        Boolean
      ),
      blockedDeliveryCustomers: (
        formData.blockedDeliveryCustomers || []
      ).filter(Boolean),
    };

    setLoading(true);
    try {
      if (selectedAgent) {
        const response = await masterService.updateAgent(
          selectedAgent._id,
          payload
        );
        const agent = response?.data || response;
        updateAgentList(agent);
        showNotification("Agent updated successfully", "success");
      } else {
        const response = await masterService.createAgent(payload);
        const agent = response?.data || response;
        updateAgentList(agent);
        showNotification("Agent created successfully", "success");
      }
      setDialogOpen(false);
      fetchAgents();
    } catch (error) {
      showNotification(error.message || "Operation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (agentRow) => {
    openConfirmDialog({
      title: `${agentRow.active ? "Deactivate" : "Activate"} Agent`,
      message: `Are you sure you want to ${
        agentRow.active ? "deactivate" : "activate"
      } ${agentRow.name}?`,
      onConfirm: async () => {
        closeConfirmDialog();
        setLoading(true);
        try {
          const response = await masterService.toggleAgentStatus(agentRow._id);
          const agent = response?.data || response;
          updateAgentList(agent);
          showNotification("Agent status updated", "success");
        } catch (error) {
          showNotification(error.message || "Failed to update status", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleAddCommission = () => {
    setCommissionForm({
      customerId: "",
      commissionType: "per_meter",
      amountPerMeter: "",
      percentage: "",
      applyByDefault: true,
      effectiveFrom: getDateInputValue(new Date()),
      notes: "",
    });
    setCommissionDialogOpen(true);
  };

  const submitCommission = async () => {
    if (!commissionForm.customerId) {
      showNotification(
        "Please select a customer for the commission",
        "warning"
      );
      return;
    }
    const payload = {
      customer: commissionForm.customerId,
      commissionType: commissionForm.commissionType,
      amountPerMeter:
        commissionForm.commissionType === "per_meter"
          ? sanitizeNumber(commissionForm.amountPerMeter)
          : undefined,
      percentage:
        commissionForm.commissionType === "percentage"
          ? sanitizeNumber(commissionForm.percentage)
          : undefined,
      applyByDefault: commissionForm.applyByDefault,
      effectiveFrom: commissionForm.effectiveFrom || undefined,
      notes: commissionForm.notes || undefined,
    };

    if (!selectedAgent) {
      setLocalPartyCommissions((prev) => {
        const existingIndex = prev.findIndex(
          (entry) => entry.customer === payload.customer
        );
        const entry = {
          ...payload,
          entryId: payload.customer,
          history: [],
        };
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = entry;
          return updated;
        }
        return [entry, ...prev];
      });
      showNotification(
        "Party commission added. It will be saved when you create the agent.",
        "info"
      );
      setCommissionDialogOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await masterService.upsertAgentPartyCommission(
        selectedAgent._id,
        payload
      );
      const agent = response?.data || response;
      updateAgentList(agent);
      showNotification("Party commission saved", "success");
      setCommissionDialogOpen(false);
    } catch (error) {
      showNotification(error.message || "Failed to save commission", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCommission = (commission) => {
    if (!selectedAgent) {
      setLocalPartyCommissions((prev) =>
        prev.filter(
          (entry) =>
            entry.customer !==
            (commission.customer?._id || commission.customer)
        )
      );
      showNotification(
        "Commission removed locally. It will be saved when you create the agent.",
        "info"
      );
      return;
    }
    openConfirmDialog({
      title: "Remove Party Commission",
      message: `Remove commission mapping for ${resolveCustomerName(
        commission.customer
      )}?`,
      onConfirm: async () => {
        closeConfirmDialog();
        setLoading(true);
        try {
          const response = await masterService.removeAgentPartyCommission(
            selectedAgent._id,
            commission.customer?._id || commission.customer
          );
          const agent = response?.data || response;
          updateAgentList(agent);
          showNotification("Party commission removed", "success");
        } catch (error) {
          showNotification(
            error.message || "Failed to remove commission",
            "error"
          );
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleAddPayout = () => {
    setPayoutForm({
      customerId: "",
      reference: "",
      periodStart: "",
      periodEnd: "",
      amount: "",
      payoutStatus: "pending",
      paidOn: "",
      paymentReference: "",
      notes: "",
    });
    setPayoutDialogOpen(true);
  };

  const submitPayout = async () => {
    if (!payoutForm.amount) {
      showNotification("Please enter payout amount", "warning");
      return;
    }

    const payload = {
      customer: payoutForm.customerId || undefined,
      reference: payoutForm.reference || undefined,
      periodStart: payoutForm.periodStart || undefined,
      periodEnd: payoutForm.periodEnd || undefined,
      amount: sanitizeNumber(payoutForm.amount) || 0,
      payoutStatus: payoutForm.payoutStatus,
      paidOn: payoutForm.paidOn || undefined,
      paymentReference: payoutForm.paymentReference || undefined,
      notes: payoutForm.notes || undefined,
    };

    if (!selectedAgent) {
      setLocalCommissionPayouts((prev) => [
        {
          ...payload,
          payoutId: generateLocalId(),
        },
        ...prev,
      ]);
      showNotification(
        "Payout recorded locally. It will be saved when you create the agent.",
        "info"
      );
      setPayoutDialogOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await masterService.addAgentCommissionPayout(
        selectedAgent._id,
        payload
      );
      const agent = response?.data || response;
      updateAgentList(agent);
      showNotification("Commission payout recorded", "success");
      setPayoutDialogOpen(false);
    } catch (error) {
      showNotification(error.message || "Failed to record payout", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayoutStatus = (payout, status) => {
    if (!selectedAgent) {
      setLocalCommissionPayouts((prev) =>
        prev.map((entry) =>
          entry.payoutId === payout.payoutId
            ? {
                ...entry,
                payoutStatus: status,
                paidOn:
                  status === "paid" ? new Date().toISOString() : entry.paidOn,
              }
            : entry
        )
      );
      showNotification(
        "Payout status updated locally. It will be saved when you create the agent.",
        "info"
      );
      return;
    }
    openConfirmDialog({
      title: "Update Payout Status",
      message: `Mark payout ${
        payout.reference || ""
      } as ${status.toUpperCase()}?`,
      onConfirm: async () => {
        closeConfirmDialog();
        setLoading(true);
        try {
          const response = await masterService.updateAgentCommissionPayout(
            selectedAgent._id,
            payout.payoutId,
            {
              payoutStatus: status,
              paidOn:
                status === "paid" ? new Date().toISOString() : payout.paidOn,
            }
          );
          const agent = response?.data || response;
          updateAgentList(agent);
          showNotification("Payout status updated", "success");
        } catch (error) {
          showNotification(error.message || "Failed to update payout", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleAddKyc = () => {
    setKycForm({
      documentType: "other",
      fileName: "",
      fileUrl: "",
      notes: "",
    });
    setKycDialogOpen(true);
  };

  const submitKyc = async () => {
    if (!kycForm.fileName || !kycForm.fileUrl) {
      showNotification("File name and URL are required", "warning");
      return;
    }

    if (!selectedAgent) {
      setLocalKycDocuments((prev) => [
        {
          documentId: generateLocalId(),
          documentType: kycForm.documentType,
          fileName: kycForm.fileName,
          fileUrl: kycForm.fileUrl,
          notes: kycForm.notes,
        },
        ...prev,
      ]);
      showNotification(
        "KYC document added locally. It will be saved when you create the agent.",
        "info"
      );
      setKycDialogOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await masterService.addAgentKycDocument(
        selectedAgent._id,
        {
          documentType: kycForm.documentType,
          fileName: kycForm.fileName,
          fileUrl: kycForm.fileUrl,
          notes: kycForm.notes || undefined,
        }
      );
      const agent = response?.data || response;
      updateAgentList(agent);
      showNotification("KYC document added", "success");
      setKycDialogOpen(false);
    } catch (error) {
      showNotification(error.message || "Failed to add KYC document", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveKyc = (document) => {
    if (!selectedAgent) {
      setLocalKycDocuments((prev) =>
        prev.filter(
          (doc) => doc.documentId !== (document.documentId || document.id)
        )
      );
      showNotification(
        "KYC document removed locally. Changes will apply when you save the agent.",
        "info"
      );
      return;
    }
    openConfirmDialog({
      title: "Remove KYC Document",
      message: `Remove ${document.fileName}?`,
      onConfirm: async () => {
        closeConfirmDialog();
        setLoading(true);
        try {
          const response = await masterService.removeAgentKycDocument(
            selectedAgent._id,
            document.documentId
          );
          const agent = response?.data || response;
          updateAgentList(agent);
          showNotification("KYC document removed", "success");
        } catch (error) {
          showNotification(
            error.message || "Failed to remove KYC document",
            "error"
          );
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const customerMenuItems = useMemo(
    () =>
      customers.map((customer) => ({
        id: customer._id || customer.id,
        label: `${customer.name}${
          customer.customerCode ? ` (${customer.customerCode})` : ""
        }`,
      })),
    [customers]
  );

  const renderCustomerSelect = (field, label, error) => (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        {...field}
        multiple
        input={<OutlinedInput label={label} />}
        value={field.value || []}
        onChange={(event) => field.onChange(event.target.value)}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {(selected || []).map((value) => {
              const customer = customerMenuItems.find(
                (item) => item.id === value
              );
              return (
                <Chip
                  key={value}
                  label={customer ? customer.label : value}
                  size="small"
                />
              );
            })}
          </Box>
        )}
        error={error}
      >
        {customerMenuItems.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const columns = [
    { field: "agentCode", headerName: "Agent Code" },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "state", headerName: "State" },
    { field: "phone", headerName: "Phone" },
    {
      field: "targetSalesMeters",
      headerName: "Target (mtrs)",
      renderCell: (params) => formatNumber(params.value || 0),
    },
    {
      field: "defaultRate",
      headerName: "Default Rate",
      renderCell: (params) => formatCurrency(params.value || 0),
    },
    {
      field: "active",
      headerName: "Status",
      renderCell: (params) => (
        <Chip
          label={params.value ? "Active" : "Inactive"}
          size="small"
          color={params.value ? "success" : "default"}
        />
      ),
    },
  ];

  const customActions = [
    {
      icon: <ToggleOnIcon fontSize="small" />,
      label: "Toggle Status",
      onClick: handleToggleStatus,
    },
  ];

  return (
    <Box>
      <DataTable
        title="Sales Agents / Brokers"
        columns={columns}
        rows={agents}
        onAdd={handleAdd}
        onEdit={handleEdit}
        customActions={customActions}
        onSearch={(value) => fetchAgents(value ? { search: value } : {})}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedAgent ? "Edit Agent / Broker" : "Add Agent / Broker"}
          </DialogTitle>
          <DialogContent>
            <Tabs value={tabIndex} onChange={(e, value) => setTabIndex(value)}>
              <Tab label="Profile" />
              <Tab label="Defaults & Controls" />
              <Tab label="Party Commission" />
              <Tab label="Payouts" />
              <Tab label="KYC Documents" />
            </Tabs>

            <TabPanel value={tabIndex} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: "Agent name is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Agent / Broker Name"
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="phone"
                    control={control}
                    rules={{ required: "Phone number is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Phone"
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="whatsapp"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="WhatsApp" />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="contactPersonName"
                    control={control}
                    rules={{ required: "Contact person name is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Contact Person Name"
                        error={!!errors.contactPersonName}
                        helperText={errors.contactPersonName?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="contactPersonPhone"
                    control={control}
                    rules={{ required: "Contact person phone is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Contact Person Phone"
                        error={!!errors.contactPersonPhone}
                        helperText={errors.contactPersonPhone?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="contactPersonEmail"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Contact Email"
                        type="email"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
                  <Controller
                    name="address.line2"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Address Line 2" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
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
                <Grid item xs={12} md={3}>
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
                <Grid item xs={12} md={3}>
                  <Controller
                    name="address.pincode"
                    control={control}
                    rules={{ required: "Pincode is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Pincode"
                        error={!!errors.address?.pincode}
                        helperText={errors.address?.pincode?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="targetSalesMeters"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <NumericFormat
                        {...field}
                        value={value}
                        onValueChange={(values) =>
                          onChange(
                            values.floatValue === undefined
                              ? ""
                              : values.floatValue
                          )
                        }
                        customInput={TextField}
                        fullWidth
                        label="Target Sales (meters)"
                        thousandSeparator=","
                        allowNegative={false}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabIndex} index={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="defaultRate"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <NumericFormat
                        {...field}
                        value={value}
                        onValueChange={(values) =>
                          onChange(
                            values.floatValue === undefined
                              ? ""
                              : values.floatValue
                          )
                        }
                        customInput={TextField}
                        fullWidth
                        label="Default Rate (₹/meter)"
                        thousandSeparator=","
                        decimalScale={2}
                        allowNegative={false}
                        prefix="₹"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="defaultCreditLimit"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <NumericFormat
                        {...field}
                        value={value}
                        onValueChange={(values) =>
                          onChange(
                            values.floatValue === undefined
                              ? ""
                              : values.floatValue
                          )
                        }
                        customInput={TextField}
                        fullWidth
                        label="Default Credit Limit (₹)"
                        thousandSeparator=","
                        decimalScale={2}
                        allowNegative={false}
                        prefix="₹"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="defaultCreditDays"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Default Credit Days"
                        type="number"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="customers"
                    control={control}
                    render={({ field }) =>
                      renderCustomerSelect(
                        field,
                        "Managed Customers",
                        !!errors.customers
                      )
                    }
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="blockedSalesCustomers"
                    control={control}
                    render={({ field }) =>
                      renderCustomerSelect(
                        field,
                        "Block Sales for Selected Customers",
                        !!errors.blockedSalesCustomers
                      )
                    }
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="blockedDeliveryCustomers"
                    control={control}
                    render={({ field }) =>
                      renderCustomerSelect(
                        field,
                        "Block Delivery for Selected Customers",
                        !!errors.blockedDeliveryCustomers
                      )
                    }
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="blockNewSalesForAllParties"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Block new sales invoices for all parties"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="blockNewDeliveriesForAllParties"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Block new delivery challans for all parties"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabIndex} index={2}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6">Party-wise Commissions</Typography>
                <Button
                  variant="contained"
                  startIcon={<AttachMoneyIcon />}
                  onClick={handleAddCommission}
                >
                  Add Commission
                </Button>
              </Box>
              {partyCommissions.length ? (
                <Table 
                  size="small"
                  sx={{ 
                    tableLayout: 'auto',
                    width: '100%'
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell>Auto Apply</TableCell>
                      <TableCell>History</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {partyCommissions.map((commission) => (
                      <TableRow key={commission.entryId || commission.customer}>
                        <TableCell>
                          {resolveCustomerName(commission.customer)}
                        </TableCell>
                        <TableCell>
                          {commission.commissionType === "per_meter"
                            ? "Amount per meter"
                            : "Percentage"}
                        </TableCell>
                        <TableCell align="right">
                          {commission.commissionType === "per_meter"
                            ? formatCurrency(commission.amountPerMeter || 0)
                            : `${commission.percentage || 0}%`}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={commission.applyByDefault ? "Yes" : "No"}
                            size="small"
                            color={
                              commission.applyByDefault ? "success" : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {commission.history?.length ? (
                            <Box>
                              <Typography variant="body2">
                                {formatDate(
                                  commission.history[
                                    commission.history.length - 1
                                  ]?.effectiveFrom
                                )}{" "}
                                →{" "}
                                {formatDate(
                                  commission.history[
                                    commission.history.length - 1
                                  ]?.effectiveTo
                                ) || "Current"}
                              </Typography>
                              {commission.history.length > 1 && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {commission.history.length} records
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveCommission(commission)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary">
                  No party commissions configured yet.
                </Typography>
              )}

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>
                Commission Change Log
              </Typography>
              {selectedAgent?.commissionChanges?.length ? (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    {selectedAgent.commissionChanges.map((change) => (
                      <Box
                        key={change.changeId}
                        sx={{
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          pb: 1.5,
                          "&:last-of-type": {
                            borderBottom: "none",
                            pb: 0,
                          },
                        }}
                      >
                        <Typography variant="subtitle2">
                          {formatDate(change.changeDate)} —{" "}
                          {resolveCustomerName(change.customer)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {change.previousCommissionType
                            ? `Updated from ${
                                change.previousCommissionType === "per_meter"
                                  ? `${formatCurrency(
                                      change.previousAmountPerMeter || 0
                                    )} / meter`
                                  : `${change.previousPercentage || 0}%`
                              } to ${
                                change.newCommissionType === "per_meter"
                                  ? `${formatCurrency(
                                      change.newAmountPerMeter || 0
                                    )} / meter`
                                  : `${change.newPercentage || 0}%`
                              }`
                            : `Set to ${
                                change.newCommissionType === "per_meter"
                                  ? `${formatCurrency(
                                      change.newAmountPerMeter || 0
                                    )} / meter`
                                  : `${change.newPercentage || 0}%`
                              }`}
                        </Typography>
                        {change.notes && (
                          <Typography variant="body2" color="text.secondary">
                            Notes: {change.notes}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              ) : (
                <Typography color="text.secondary">
                  No commission changes recorded yet.
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={tabIndex} index={3}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6">Commission Payouts</Typography>
                <Button
                  variant="contained"
                  startIcon={<PaidIcon />}
                  onClick={handleAddPayout}
                >
                  Record Payout
                </Button>
              </Box>
              {commissionPayouts.length ? (
                <Table 
                  size="small"
                  sx={{ 
                    tableLayout: 'auto',
                    width: '100%'
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Reference</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commissionPayouts.map((payout) => (
                      <TableRow key={payout.payoutId}>
                        <TableCell>{payout.reference || "-"}</TableCell>
                        <TableCell>
                          {resolveCustomerName(payout.customer)}
                        </TableCell>
                        <TableCell>
                          {payout.periodStart
                            ? `${formatDate(payout.periodStart)} → ${formatDate(
                                payout.periodEnd
                              )}`
                            : "-"}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(payout.amount || 0)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payout.payoutStatus
                              ?.replace("_", " ")
                              .toUpperCase()}
                            size="small"
                            color={
                              payout.payoutStatus === "paid"
                                ? "success"
                                : payout.payoutStatus === "pending"
                                ? "warning"
                                : "default"
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            <Tooltip title="Mark as Paid">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() =>
                                  handleUpdatePayoutStatus(payout, "paid")
                                }
                              >
                                <ToggleOnIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Mark as Pending">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() =>
                                  handleUpdatePayoutStatus(payout, "pending")
                                }
                              >
                                <ToggleOffIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary">
                  No commission payouts recorded yet.
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={tabIndex} index={4}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6">KYC Documents</Typography>
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={handleAddKyc}
                >
                  Add Document
                </Button>
              </Box>
              {kycDocuments.length ? (
                <Paper variant="outlined">
                  <List disablePadding>
                    {kycDocuments.map((document) => {
                      const docType =
                        DOCUMENT_TYPE_OPTIONS.find(
                          (option) => option.value === document.documentType
                        )?.label || document.documentType;
                      return (
                        <ListItem
                          key={document.documentId}
                          divider
                          secondaryAction={
                            <IconButton
                              edge="end"
                              color="error"
                              onClick={() => handleRemoveKyc(document)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={`${docType} • ${document.fileName}`}
                            secondary={
                              <>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {document.fileUrl}
                                </Typography>
                                {document.notes && (
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ display: "block" }}
                                  >
                                    Notes: {document.notes}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>
              ) : (
                <Typography color="text.secondary">
                  No KYC documents uploaded.
                </Typography>
              )}
            </TabPanel>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedAgent ? "Update Agent" : "Create Agent"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Commission Dialog */}
      <Dialog
        open={commissionDialogOpen}
        onClose={() => setCommissionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add / Update Party Commission</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={commissionForm.customerId}
                  label="Customer"
                  onChange={(event) =>
                    setCommissionForm((prev) => ({
                      ...prev,
                      customerId: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">
                    <em>Select customer</em>
                  </MenuItem>
                  {customerMenuItems.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Commission Method</InputLabel>
                <Select
                  value={commissionForm.commissionType}
                  label="Commission Method"
                  onChange={(event) =>
                    setCommissionForm((prev) => ({
                      ...prev,
                      commissionType: event.target.value,
                      amountPerMeter: "",
                      percentage: "",
                    }))
                  }
                >
                  {COMMISSION_METHOD_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              {watchCommissionType === "per_meter" ? (
                <NumericFormat
                  value={commissionForm.amountPerMeter}
                  onValueChange={(values) =>
                    setCommissionForm((prev) => ({
                      ...prev,
                      amountPerMeter: values.floatValue,
                    }))
                  }
                  customInput={TextField}
                  fullWidth
                  label="Commission Amount (₹/meter)"
                  thousandSeparator=","
                  decimalScale={2}
                  allowNegative={false}
                  prefix="₹"
                />
              ) : (
                <TextField
                  value={commissionForm.percentage}
                  onChange={(event) =>
                    setCommissionForm((prev) => ({
                      ...prev,
                      percentage: event.target.value,
                    }))
                  }
                  fullWidth
                  label="Commission Percentage (%)"
                  type="number"
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                />
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={commissionForm.applyByDefault}
                    onChange={(event) =>
                      setCommissionForm((prev) => ({
                        ...prev,
                        applyByDefault: event.target.checked,
                      }))
                    }
                  />
                }
                label="Auto apply on invoices"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Effective From"
                type="date"
                value={commissionForm.effectiveFrom || ""}
                onChange={(event) =>
                  setCommissionForm((prev) => ({
                    ...prev,
                    effectiveFrom: event.target.value,
                  }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={commissionForm.notes}
                onChange={(event) =>
                  setCommissionForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommissionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCommission}>
            Save Commission
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payout Dialog */}
      <Dialog
        open={payoutDialogOpen}
        onClose={() => setPayoutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Record Commission Payout</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Customer (optional)</InputLabel>
                <Select
                  value={payoutForm.customerId}
                  label="Customer (optional)"
                  onChange={(event) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      customerId: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">
                    <em>All customers</em>
                  </MenuItem>
                  {customerMenuItems.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Reference"
                value={payoutForm.reference}
                onChange={(event) =>
                  setPayoutForm((prev) => ({
                    ...prev,
                    reference: event.target.value,
                  }))
                }
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Amount (₹)"
                value={payoutForm.amount}
                onChange={(event) =>
                  setPayoutForm((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
                fullWidth
                type="number"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Period Start"
                type="date"
                value={payoutForm.periodStart || ""}
                onChange={(event) =>
                  setPayoutForm((prev) => ({
                    ...prev,
                    periodStart: event.target.value,
                  }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Period End"
                type="date"
                value={payoutForm.periodEnd || ""}
                onChange={(event) =>
                  setPayoutForm((prev) => ({
                    ...prev,
                    periodEnd: event.target.value,
                  }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payout Status</InputLabel>
                <Select
                  value={payoutForm.payoutStatus}
                  label="Payout Status"
                  onChange={(event) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      payoutStatus: event.target.value,
                    }))
                  }
                >
                  {PAYOUT_STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Paid On"
                type="date"
                value={payoutForm.paidOn || ""}
                onChange={(event) =>
                  setPayoutForm((prev) => ({
                    ...prev,
                    paidOn: event.target.value,
                  }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Payment Reference"
                value={payoutForm.paymentReference}
                onChange={(event) =>
                  setPayoutForm((prev) => ({
                    ...prev,
                    paymentReference: event.target.value,
                  }))
                }
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={payoutForm.notes}
                onChange={(event) =>
                  setPayoutForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayoutDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitPayout}>
            Save Payout
          </Button>
        </DialogActions>
      </Dialog>

      {/* KYC Dialog */}
      <Dialog
        open={kycDialogOpen}
        onClose={() => setKycDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add KYC Document</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={kycForm.documentType}
                  label="Document Type"
                  onChange={(event) =>
                    setKycForm((prev) => ({
                      ...prev,
                      documentType: event.target.value,
                    }))
                  }
                >
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="File Name"
                value={kycForm.fileName}
                onChange={(event) =>
                  setKycForm((prev) => ({
                    ...prev,
                    fileName: event.target.value,
                  }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="File URL"
                value={kycForm.fileUrl}
                onChange={(event) =>
                  setKycForm((prev) => ({
                    ...prev,
                    fileUrl: event.target.value,
                  }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={kycForm.notes}
                onChange={(event) =>
                  setKycForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKycDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitKyc}>
            Add Document
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmConfig.open}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onClose={closeConfirmDialog}
        onConfirm={confirmConfig.onConfirm}
      />
    </Box>
  );
};

export default Agents;
