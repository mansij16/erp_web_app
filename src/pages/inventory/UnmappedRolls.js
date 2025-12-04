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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Checkbox,
  Alert,
} from "@mui/material";
import { Map as MapIcon, CheckCircle as SaveIcon } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import DataTable from "../../components/common/DataTable";
import { useApp } from "../../contexts/AppContext";
import inventoryService from "../../services/inventoryService";
import masterService from "../../services/masterService";
import { formatDate } from "../../utils/formatters";

const UnmappedRolls = () => {
  const { showNotification, setLoading } = useApp();
  const [unmappedRolls, setUnmappedRolls] = useState([]);
  const [selectedRolls, setSelectedRolls] = useState([]);
  const [skus, setSKUs] = useState([]);
  const [openMappingDialog, setOpenMappingDialog] = useState(false);
  const [mappingData, setMappingData] = useState({});

  const { control, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    fetchUnmappedRolls();
    fetchSKUs();
  }, []);

  const fetchUnmappedRolls = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getUnmappedRolls();
      setUnmappedRolls(response.data);
    } catch (error) {
      showNotification("Failed to fetch unmapped rolls", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSKUs = async () => {
    try {
      const response = await masterService.getSKUs({ active: true });
      setSKUs(response.data);
    } catch (error) {
      console.error("Failed to fetch SKUs:", error);
    }
  };

  const handleSelectRoll = (rollId) => {
    setSelectedRolls((prev) => {
      if (prev.includes(rollId)) {
        return prev.filter((id) => id !== rollId);
      }
      return [...prev, rollId];
    });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedRolls(unmappedRolls.map((roll) => roll._id));
    } else {
      setSelectedRolls([]);
    }
  };

  const handleBulkMap = () => {
    if (selectedRolls.length === 0) {
      showNotification("Please select rolls to map", "warning");
      return;
    }

    // Initialize mapping data for selected rolls
    const initialMapping = {};
    selectedRolls.forEach((rollId) => {
      const roll = unmappedRolls.find((r) => r._id === rollId);
      if (roll) {
        initialMapping[rollId] = {
          rollNumber: roll.rollNumber,
          skuId: "",
          widthInches: "",
          lengthMeters: roll.lengthMeters || 0,
        };
      }
    });

    setMappingData(initialMapping);
    setOpenMappingDialog(true);
  };

  const handleSKUChange = (rollId, skuId) => {
    const sku = skus.find((s) => s._id === skuId);
    if (sku) {
      setMappingData((prev) => ({
        ...prev,
        [rollId]: {
          ...prev[rollId],
          skuId,
          widthInches: sku.widthInches,
          categoryName: sku.categoryName,
          gsm: sku.gsm,
          qualityName: sku.qualityName,
        },
      }));
    }
  };

  const onSubmitMapping = async () => {
    try {
      const mappings = Object.entries(mappingData).map(([rollId, data]) => ({
        rollId,
        skuId: data.skuId,
        lengthMeters: data.lengthMeters,
      }));

      await inventoryService.bulkMapRolls({ mappings });
      showNotification(
        `Successfully mapped ${mappings.length} rolls`,
        "success"
      );
      setOpenMappingDialog(false);
      setSelectedRolls([]);
      fetchUnmappedRolls();
    } catch (error) {
      showNotification("Failed to map rolls", "error");
    }
  };

  const columns = [
    {
      field: "select",
      headerName: (
        <Checkbox
          checked={
            selectedRolls.length === unmappedRolls.length &&
            unmappedRolls.length > 0
          }
          indeterminate={
            selectedRolls.length > 0 &&
            selectedRolls.length < unmappedRolls.length
          }
          onChange={handleSelectAll}
        />
      ),
      minWidth: 60,
      flex: 0,
      sortable: false,
      renderCell: (params) => (
        <Checkbox
          checked={selectedRolls.includes(params.row._id)}
          onChange={() => handleSelectRoll(params.row._id)}
        />
      ),
    },
    { field: "rollNumber", headerName: "Roll Number" },
    { field: "supplierName", headerName: "Supplier", flex: 1 },
    { field: "batchCode", headerName: "Batch" },
    { field: "grnNumber", headerName: "GRN" },
    {
      field: "createdAt",
      headerName: "Created",
      renderCell: (params) => formatDate(params.value),
    },
  ];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Alert severity="warning">
          {unmappedRolls.length} unmapped rolls require SKU mapping
        </Alert>
      </Paper>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<MapIcon />}
          onClick={handleBulkMap}
          disabled={selectedRolls.length === 0}
        >
          Map Selected Rolls ({selectedRolls.length})
        </Button>
      </Box>

      <DataTable
        title="Unmapped Rolls"
        columns={columns}
        rows={unmappedRolls}
        hideAddButton
        showActions={false}
      />

      {/* Bulk Mapping Dialog */}
      <Dialog
        open={openMappingDialog}
        onClose={() => setOpenMappingDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Map Rolls to SKUs</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Mapping {selectedRolls.length} rolls. Select appropriate SKU for
            each roll.
          </Alert>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Roll Number</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>GSM</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell>Width"</TableCell>
                  <TableCell>Length(m)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(mappingData).map(([rollId, data]) => (
                  <TableRow key={rollId}>
                    <TableCell>{data.rollNumber}</TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={data.skuId}
                        onChange={(e) =>
                          handleSKUChange(rollId, e.target.value)
                        }
                      >
                        <MenuItem value="">Select SKU</MenuItem>
                        {skus.map((sku) => (
                          <MenuItem key={sku._id} value={sku._id}>
                            {sku.skuCode}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>{data.categoryName || "-"}</TableCell>
                    <TableCell>{data.gsm || "-"}</TableCell>
                    <TableCell>{data.qualityName || "-"}</TableCell>
                    <TableCell>{data.widthInches || "-"}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={data.lengthMeters}
                        onChange={(e) =>
                          setMappingData((prev) => ({
                            ...prev,
                            [rollId]: {
                              ...prev[rollId],
                              lengthMeters: e.target.value,
                            },
                          }))
                        }
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMappingDialog(false)}>Cancel</Button>
          <Button
            onClick={onSubmitMapping}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Save Mapping
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UnmappedRolls;
