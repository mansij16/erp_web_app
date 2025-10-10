import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  Category,
  Inventory,
  People,
  Business,
  ShoppingCart,
  LocalShipping,
  Receipt,
  AccountBalance,
  Assessment,
  ExpandLess,
  ExpandMore,
  Assignment,
  ListAlt,
} from "@mui/icons-material";

const drawerWidth = 280;

const menuItems = [
  {
    title: "Dashboard",
    path: "/",
    icon: <Dashboard />,
  },
  {
    title: "Masters",
    icon: <Category />,
    children: [
      { title: "Categories", path: "/categories", icon: <Category /> },
      { title: "Products", path: "/products", icon: <ListAlt /> },
      { title: "SKUs", path: "/skus", icon: <Assignment /> },
      { title: "Suppliers", path: "/suppliers", icon: <Business /> },
      { title: "Customers", path: "/customers", icon: <People /> },
    ],
  },
  {
    title: "Purchase",
    icon: <ShoppingCart />,
    children: [
      {
        title: "Purchase Orders",
        path: "/purchase-orders",
        icon: <Assignment />,
      },
      { title: "Goods Receipt", path: "/grns", icon: <LocalShipping /> },
      {
        title: "Purchase Invoices",
        path: "/purchase-invoices",
        icon: <Receipt />,
      },
    ],
  },
  {
    title: "Inventory",
    icon: <Inventory />,
    children: [
      { title: "Rolls", path: "/rolls", icon: <ListAlt /> },
      {
        title: "Unmapped Rolls",
        path: "/unmapped-rolls",
        icon: <Assignment />,
      },
      { title: "Stock Summary", path: "/stock-summary", icon: <Assessment /> },
    ],
  },
  {
    title: "Sales",
    icon: <LocalShipping />,
    children: [
      { title: "Sales Orders", path: "/sales-orders", icon: <Assignment /> },
      {
        title: "Delivery Challans",
        path: "/delivery-challans",
        icon: <LocalShipping />,
      },
      { title: "Sales Invoices", path: "/sales-invoices", icon: <Receipt /> },
    ],
  },
  {
    title: "Accounting",
    icon: <AccountBalance />,
    children: [
      { title: "Payments", path: "/payments", icon: <Receipt /> },
      { title: "Vouchers", path: "/vouchers", icon: <Assignment /> },
      { title: "Ledgers", path: "/ledgers", icon: <ListAlt /> },
    ],
  },
  {
    title: "Reports",
    icon: <Assessment />,
    children: [
      {
        title: "Trial Balance",
        path: "/reports/trial-balance",
        icon: <Assessment />,
      },
      {
        title: "Profit & Loss",
        path: "/reports/profit-loss",
        icon: <Assessment />,
      },
      {
        title: "Balance Sheet",
        path: "/reports/balance-sheet",
        icon: <Assessment />,
      },
      { title: "AR Aging", path: "/reports/ar-aging", icon: <Assessment /> },
      { title: "Stock Report", path: "/reports/stock", icon: <Assessment /> },
    ],
  },
];

const Layout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleExpandClick = (title) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const renderMenuItem = (item, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.title];
    const isActive = location.pathname === item.path;

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding sx={{ pl: depth * 2 }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleExpandClick(item.title);
              } else if (item.path) {
                handleNavigate(item.path);
              }
            }}
            selected={isActive}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.title} />
            {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          {process.env.REACT_APP_COMPANY_NAME || "Paper Trading ERP"}
        </Typography>
      </Toolbar>
      <Divider />
      <List>{menuItems.map((item) => renderMenuItem(item))}</List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(
              (item) =>
                item.path === location.pathname ||
                item.children?.some((child) => child.path === location.pathname)
            )?.title ||
              menuItems
                .flatMap((item) => item.children || [])
                .find((child) => child.path === location.pathname)?.title ||
              "Dashboard"}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
