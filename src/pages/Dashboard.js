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
  Stack,
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

  const StatCard = ({ title, value, icon, trend, trendValue, color, bgColor }) => (
    <Card
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s ease",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
        },
      }}
    >
      <CardContent sx={{ p: 3, flexGrow: 1 }}>
        <Stack spacing={2} sx={{ height: "100%" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: "grey.600",
                  fontWeight: 500,
                  fontSize: "0.8125rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {title}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                backgroundColor: bgColor || "primary.50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: color || "primary.main",
              }}
            >
              {icon}
            </Box>
          </Stack>
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "grey.900",
                fontSize: "1.875rem",
                mb: trend ? 1 : 0,
              }}
            >
              {value}
            </Typography>
            {trend && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {trend === "up" ? (
                  <TrendingUp
                    sx={{
                      fontSize: "1.125rem",
                      color: "success.main",
                    }}
                  />
                ) : (
                  <TrendingDown
                    sx={{
                      fontSize: "1.125rem",
                      color: "error.main",
                    }}
                  />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: trend === "up" ? "success.main" : "error.main",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  {trendValue}%
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "grey.500", fontSize: "0.875rem" }}
                >
                  vs last month
                </Typography>
              </Stack>
            )}
            {!trend && (
              <Box sx={{ height: 28 }} />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "grey.900",
            mb: 0.5,
            fontSize: "1.75rem",
          }}
        >
          Welcome back, Admin! 👋
        </Typography>
        <Typography variant="body1" sx={{ color: "grey.600" }}>
          Here's what's happening with your business today.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<TrendingUp sx={{ fontSize: 28 }} />}
            trend="up"
            trendValue={stats.monthlyGrowth}
            color="success.main"
            bgColor="success.50"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Active Customers"
            value={stats.totalCustomers}
            icon={<People sx={{ fontSize: 28 }} />}
            color="primary.main"
            bgColor="primary.50"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Active Orders"
            value={stats.activeOrders}
            icon={<ShoppingCart sx={{ fontSize: 28 }} />}
            color="warning.main"
            bgColor="warning.50"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Stock Value"
            value={formatCurrency(stats.stockValue)}
            icon={<Inventory sx={{ fontSize: 28 }} />}
            color="info.main"
            bgColor="info.50"
          />
        </Grid>
      </Grid>

      {/* Charts and Lists */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "grey.900", mb: 0.5 }}
              >
                Sales Trend
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.600" }}>
                Revenue performance over the last 6 months
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={salesData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  style={{ fontSize: "0.8125rem" }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: "0.8125rem" }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "0.875rem",
                    paddingTop: "20px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{
                    fill: "#6366f1",
                    strokeWidth: 2,
                    r: 5,
                    stroke: "white",
                  }}
                  activeDot={{ r: 7 }}
                  fill="url(#salesGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pending Tasks */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "grey.900", mb: 0.5 }}
              >
                Pending Tasks
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.600" }}>
                Items requiring your attention
              </Typography>
            </Box>
            <List sx={{ p: 0 }}>
              {pendingTasks.map((task, index) => (
                <ListItem
                  key={index}
                  sx={{
                    px: 0,
                    py: 1.5,
                    borderBottom:
                      index !== pendingTasks.length - 1
                        ? "1px solid"
                        : "none",
                    borderColor: "grey.100",
                  }}
                >
                  <ListItemText
                    primary={task.task}
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "grey.900",
                    }}
                    secondary={
                      <Chip
                        label={task.type}
                        size="small"
                        sx={{
                          mt: 0.5,
                          height: 22,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          ...(task.urgent && {
                            backgroundColor: "error.50",
                            color: "error.main",
                          }),
                        }}
                      />
                    }
                  />
                  {task.urgent && (
                    <Warning sx={{ color: "error.main", fontSize: 20 }} />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "grey.900", mb: 0.5 }}
              >
                Top Products
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.600" }}>
                Best performing items this month
              </Typography>
            </Box>
            <List sx={{ p: 0 }}>
              {topProducts.map((product, index) => (
                <ListItem
                  key={index}
                  sx={{
                    px: 0,
                    py: 2,
                    borderBottom:
                      index !== topProducts.length - 1 ? "1px solid" : "none",
                    borderColor: "grey.100",
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: "primary.50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                      fontWeight: 700,
                      color: "primary.main",
                      fontSize: "0.875rem",
                    }}
                  >
                    #{index + 1}
                  </Box>
                  <ListItemText
                    primary={product.name}
                    secondary={`Quantity: ${product.qty} rolls`}
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "grey.900",
                    }}
                    secondaryTypographyProps={{
                      fontSize: "0.8125rem",
                      color: "grey.600",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: "primary.main",
                      fontSize: "0.9375rem",
                    }}
                  >
                    {formatCurrency(product.value)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "grey.900", mb: 0.5 }}
              >
                Quick Stats
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.600" }}>
                Key metrics at a glance
              </Typography>
            </Box>
            <List sx={{ p: 0 }}>
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  borderBottom: "1px solid",
                  borderColor: "grey.100",
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: "warning.50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mr: 2,
                  }}
                >
                  <LocalShipping sx={{ color: "warning.main", fontSize: 20 }} />
                </Box>
                <ListItemText
                  primary="Pending Deliveries"
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "grey.900",
                  }}
                />
                <Chip
                  label={stats.pendingDeliveries}
                  sx={{
                    backgroundColor: "warning.50",
                    color: "warning.main",
                    fontWeight: 700,
                  }}
                />
              </ListItem>
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  borderBottom: "1px solid",
                  borderColor: "grey.100",
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: "error.50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mr: 2,
                  }}
                >
                  <Warning sx={{ color: "error.main", fontSize: 20 }} />
                </Box>
                <ListItemText
                  primary="Unmapped Rolls"
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "grey.900",
                  }}
                />
                <Chip
                  label={stats.unmappedRolls}
                  sx={{
                    backgroundColor: "error.50",
                    color: "error.main",
                    fontWeight: 700,
                  }}
                />
              </ListItem>
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  borderBottom: "1px solid",
                  borderColor: "grey.100",
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: "info.50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mr: 2,
                  }}
                >
                  <AccountBalance sx={{ color: "info.main", fontSize: 20 }} />
                </Box>
                <ListItemText
                  primary="Outstanding AR"
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "grey.900",
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "error.main",
                    fontSize: "0.9375rem",
                  }}
                >
                  {formatCurrency(stats.outstandingAR)}
                </Typography>
              </ListItem>
              <ListItem sx={{ px: 0, py: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: "error.50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mr: 2,
                  }}
                >
                  <People sx={{ color: "error.main", fontSize: 20 }} />
                </Box>
                <ListItemText
                  primary="Credit Blocks"
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "grey.900",
                  }}
                />
                <Chip
                  label="3"
                  sx={{
                    backgroundColor: "error.50",
                    color: "error.main",
                    fontWeight: 700,
                  }}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
