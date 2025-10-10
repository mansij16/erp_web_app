import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  Inventory,
  People,
  ShoppingCart,
  LocalShipping,
  AccountBalance,
  Warning,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatNumber } from "../utils/formatters";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 2450000,
    monthlyGrowth: 12.5,
    totalCustomers: 145,
    activeOrders: 23,
    pendingDeliveries: 8,
    unmappedRolls: 45,
    stockValue: 1850000,
    outstandingAR: 450000,
  });

  const [salesData] = useState([
    { month: "Jul", sales: 320000 },
    { month: "Aug", sales: 380000 },
    { month: "Sep", sales: 420000 },
    { month: "Oct", sales: 390000 },
    { month: "Nov", sales: 480000 },
    { month: "Dec", sales: 460000 },
  ]);

  const [topProducts] = useState([
    { name: "Sublimation 45 GSM Premium", qty: 120, value: 450000 },
    { name: "Sublimation 55 GSM Standard", qty: 95, value: 380000 },
    { name: "Butter 30 GSM Economy", qty: 85, value: 280000 },
    { name: "Sublimation 65 GSM Premium", qty: 75, value: 350000 },
  ]);

  const [pendingTasks] = useState([
    { task: "Approve PO-2412-0045", type: "approval", urgent: true },
    { task: "Map 23 unmapped rolls", type: "action", urgent: false },
    {
      task: "Review credit block - ABC Printers",
      type: "review",
      urgent: true,
    },
    {
      task: "Post Purchase Invoice PI-2412-0012",
      type: "action",
      urgent: false,
    },
  ]);

  const StatCard = ({ title, value, icon, trend, trendValue, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h5" component="div">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color: color || "primary.main" }}>{icon}</Box>
        </Box>
        {trend && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {trend === "up" ? (
              <TrendingUp color="success" sx={{ mr: 1 }} />
            ) : (
              <TrendingDown color="error" sx={{ mr: 1 }} />
            )}
            <Typography
              variant="body2"
              color={trend === "up" ? "success.main" : "error.main"}
            >
              {trendValue}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<TrendingUp sx={{ fontSize: 40 }} />}
            trend="up"
            trendValue={stats.monthlyGrowth}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Customers"
            value={stats.totalCustomers}
            icon={<People sx={{ fontSize: 40 }} />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Orders"
            value={stats.activeOrders}
            icon={<ShoppingCart sx={{ fontSize: 40 }} />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Stock Value"
            value={formatCurrency(stats.stockValue)}
            icon={<Inventory sx={{ fontSize: 40 }} />}
            color="info.main"
          />
        </Grid>
      </Grid>

      {/* Charts and Lists */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sales Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pending Tasks */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Pending Tasks
            </Typography>
            <List>
              {pendingTasks.map((task, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={task.task}
                    secondary={
                      <Chip
                        label={task.type}
                        size="small"
                        color={task.urgent ? "error" : "default"}
                      />
                    }
                  />
                  {task.urgent && <Warning color="error" />}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Products
            </Typography>
            <List>
              {topProducts.map((product, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={product.name}
                    secondary={`Qty: ${product.qty} rolls`}
                  />
                  <Typography variant="body2" color="primary">
                    {formatCurrency(product.value)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Stats
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="Pending Deliveries" />
                <Chip label={stats.pendingDeliveries} color="warning" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Unmapped Rolls" />
                <Chip label={stats.unmappedRolls} color="error" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Outstanding AR" />
                <Typography color="error">
                  {formatCurrency(stats.outstandingAR)}
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText primary="Credit Blocks" />
                <Chip label="3" color="error" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
