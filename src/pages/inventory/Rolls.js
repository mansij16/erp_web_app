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
  Grid,
  Chip,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  History as HistoryIcon,
  LocalShipping as ShippingIcon,
  Delete as ScrapIcon,
} from "@mui/icons-material";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useApp } from "../../contexts/AppContext";
import inventoryService from "../../services/inventoryService";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getRollStatusColor,
} from "../../utils/formatters";

const Rolls = () => {
  const { showNotification, setLoading } = useApp();
  const [rolls, setRolls] = useState([]);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [rollHistory, setRollHistory] = useState([]);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [confirmScrap, setConfirmScrap] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    skuId: "",
    supplierId: "",
    batchId: "",
  });

  useEffect(() => {
    fetchRolls();
  }, [filters]);

  const fetchRolls = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getRolls(filters);
      setRolls(response.data);
    } catch (error) {
      showNotification("Failed to fetch rolls", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (row) => {
    try {
      const response = await inventoryService.getRoll(row._id);
      setSelectedRoll(response.data);
      setOpenDetailDialog(true);
    } catch (error) {
      showNotification("Failed to fetch roll details", "error");
    }
  };

  const handleHistory = async (row) => {
    try {
      const response = await inventoryService.getRollHistory(row._id);
      setRollHistory(response.data);
      setSelectedRoll(row);
      setOpenHistoryDialog(true);
    } catch (error) {
      showNotification("Failed to fetch roll history", "error");
    }
  };

  const handleScrap = (row) => {
    setSelectedRoll(row);
    setConfirmScrap(true);
  };

  const confirmScrapRoll = async () => {
    try {
      await inventoryService.updateRoll(selectedRoll._id, { status: "Scrap" });
      showNotification("Roll marked as scrap", "success");
      fetchRolls();
    } catch (error) {
      showNotification("Failed to update roll status", "error");
    }
    setConfirmScrap(false);
  };

  const columns = [
    {
      field: "rollNumber",
      headerName: "Roll Number",
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            backgroundColor: getRollStatusColor(params.value),
            color: "white",
          }}
        />
      ),
    },
    { field: "categoryName", headerName: "Category", width: 100 },
    { field: "gsm", headerName: "GSM", width: 80 },
    { field: "qualityName", headerName: "Quality", width: 100 },
    { field: "widthInches", headerName: 'Width"', width: 80 },
    { field: "lengthMeters", headerName: "Length(m)", width: 100 },
    {
      field: "landedCostPerRoll",
      headerName: "Landed Cost",
      width: 120,
      renderCell: (params) => formatCurrency(params.value),
    },
    { field: "supplierName", headerName: "Supplier", width: 150 },
    { field: "batchCode", headerName: "Batch", width: 120 },
    {
      field: "createdAt",
      headerName: "Created",
      width: 120,
      renderCell: (params) => formatDate(params.value),
    },
  ];

  const customActions = [
    {
      icon: <HistoryIcon />,
      label: "History",
      onClick: handleHistory,
    },
    {
      icon: <ScrapIcon />,
      label: "Mark as Scrap",
      onClick: handleScrap,
      show: (row) => ["Mapped", "Returned"].includes(row.status),
    },
  ];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Status Filter"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Unmapped">Unmapped</MenuItem>
              <MenuItem value="Mapped">Mapped</MenuItem>
              <MenuItem value="Allocated">Allocated</MenuItem>
              <MenuItem value="Dispatched">Dispatched</MenuItem>
              <MenuItem value="Returned">Returned</MenuItem>
              <MenuItem value="Scrap">Scrap</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <DataTable
        title="Roll Inventory"
        columns={columns}
        rows={rolls}
        onView={handleView}
        customActions={customActions}
        hideAddButton
      />

      {/* Roll Detail Dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Roll Details</DialogTitle>
        <DialogContent>
          {selectedRoll && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Roll Number
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRoll.rollNumber}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedRoll.status}
                  size="small"
                  sx={{
                    backgroundColor: getRollStatusColor(selectedRoll.status),
                    color: "white",
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Product Details
                </Typography>
                <Typography variant="body2">
                  {selectedRoll.categoryName} - {selectedRoll.gsm} GSM -{" "}
                  {selectedRoll.qualityName}
                </Typography>
                <Typography variant="body2">
                  Width: {selectedRoll.widthInches}" | Length:{" "}
                  {selectedRoll.lengthMeters}m
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Cost Information
                </Typography>
                <Typography variant="body2">
                  Landed Cost: {formatCurrency(selectedRoll.landedCostPerRoll)}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Source Information
                </Typography>
                <Typography variant="body2">
                  Supplier: {selectedRoll.supplierName}
                </Typography>
                <Typography variant="body2">
                  Batch: {selectedRoll.batchCode}
                </Typography>
                <Typography variant="body2">
                  PO: {selectedRoll.poNumber}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Allocation Information
                </Typography>
                {selectedRoll.allocatedToSOId ? (
                  <>
                    <Typography variant="body2">
                      SO: {selectedRoll.soNumber}
                    </Typography>
                    <Typography variant="body2">
                      Customer: {selectedRoll.customerName}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not allocated
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Timeline
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Created"
                      secondary={formatDate(selectedRoll.createdAt)}
                    />
                  </ListItem>
                  {selectedRoll.mappedAt && (
                    <ListItem>
                      <ListItemText
                        primary="Mapped"
                        secondary={formatDate(selectedRoll.mappedAt)}
                      />
                    </ListItem>
                  )}
                  {selectedRoll.allocatedAt && (
                    <ListItem>
                      <ListItemText
                        primary="Allocated"
                        secondary={formatDate(selectedRoll.allocatedAt)}
                      />
                    </ListItem>
                  )}
                  {selectedRoll.dispatchedAt && (
                    <ListItem>
                      <ListItemText
                        primary="Dispatched"
                        secondary={formatDate(selectedRoll.dispatchedAt)}
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Roll History Dialog */}
      <Dialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Roll History - {selectedRoll?.rollNumber}</DialogTitle>
        <DialogContent>
          <List>
            {rollHistory.map((event, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={event.action}
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          {formatDate(event.timestamp)}
                        </Typography>
                        <Typography variant="caption">
                          {event.details}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < rollHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmScrap}
        onClose={() => setConfirmScrap(false)}
        onConfirm={confirmScrapRoll}
        title="Mark as Scrap"
        message={`Are you sure you want to mark roll ${selectedRoll?.rollNumber} as scrap?`}
        confirmColor="error"
      />
    </Box>
  );
};

export default Rolls;
