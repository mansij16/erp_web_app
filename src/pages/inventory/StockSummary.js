import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Chip,
} from "@mui/material";
import {
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import DataTable from "../../components/common/DataTable";
import { useApp } from "../../contexts/AppContext";
import inventoryService from "../../services/inventoryService";
import { formatCurrency, formatNumber } from "../../utils/formatters";

const StockSummary = () => {
  const { showNotification, setLoading } = useApp();
  const [stockData, setStockData] = useState([]);
  const [summary, setSummary] = useState({
    totalRolls: 0,
    totalValue: 0,
    totalCategories: 0,
  });
  const [filters, setFilters] = useState({
    categoryId: "",
    status: "Mapped",
  });

  useEffect(() => {
    fetchStockSummary();
  }, [filters]);

  const fetchStockSummary = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getStockSummary(filters);
      setStockData(response.data.items || []);
      setSummary(
        response.data.summary || {
          totalRolls: 0,
          totalValue: 0,
          totalCategories: 0,
        }
      );
    } catch (error) {
      showNotification("Failed to fetch stock summary", "error");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: "skuCode",
      headerName: "SKU Code",
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          {params.value}
        </Typography>
      ),
    },
    { field: "categoryName", headerName: "Category" },
    { field: "gsm", headerName: "GSM" },
    { field: "qualityName", headerName: "Quality" },
    { field: "widthInches", headerName: 'Width"' },
    {
      field: "totalRolls",
      headerName: "Total Rolls",
      renderCell: (params) => (
        <Chip label={formatNumber(params.value)} color="primary" size="small" />
      ),
    },
    {
      field: "totalLengthMeters",
      headerName: "Total Length (m)",
      renderCell: (params) => formatNumber(params.value, 2),
    },
    {
      field: "totalValue",
      headerName: "Total Value",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "avgCostPerRoll",
      headerName: "Avg Cost/Meter",
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "mappedRolls",
      headerName: "Available",
      renderCell: (params) => formatNumber(params.value),
    },
    {
      field: "allocatedRolls",
      headerName: "Allocated",
      renderCell: (params) => formatNumber(params.value),
    },
    {
      field: "dispatchedRolls",
      headerName: "Dispatched",
      renderCell: (params) => formatNumber(params.value),
    },
  ];

  const summaryCards = [
    {
      title: "Total Rolls",
      value: formatNumber(summary.totalRolls),
      icon: <InventoryIcon sx={{ fontSize: 40, color: "primary.main" }} />,
      color: "#1976d2",
    },
    {
      title: "Total Value",
      value: formatCurrency(summary.totalValue),
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: "success.main" }} />,
      color: "#2e7d32",
    },
    {
      title: "SKU Varieties",
      value: formatNumber(summary.totalCategories || stockData.length),
      icon: <CategoryIcon sx={{ fontSize: 40, color: "warning.main" }} />,
      color: "#ed6c02",
    },
  ];

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  {card.icon}
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                      {card.value}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
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
              <MenuItem value="Mapped">Mapped (Available)</MenuItem>
              <MenuItem value="Allocated">Allocated</MenuItem>
              <MenuItem value="Dispatched">Dispatched</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Stock Summary Table */}
      <DataTable
        title="Stock Summary by SKU"
        columns={columns}
        rows={stockData}
        hideAddButton
        hideEditButton
        hideDeleteButton
      />
    </Box>
  );
};

export default StockSummary;
