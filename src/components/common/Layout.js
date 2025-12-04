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
  Avatar,
  Stack,
  Badge,
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
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
} from "@mui/icons-material";

const drawerWidth = 260;

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
      // { title: "Categories", path: "/categories", icon: <Category /> },
      { title: "Products", path: "/products", icon: <ListAlt /> },
      { title: "SKUs", path: "/skus", icon: <Assignment /> },
      { title: "Suppliers", path: "/suppliers", icon: <Business /> },
      { title: "Customers", path: "/customers", icon: <People /> },
      { title: "Agents / Brokers", path: "/agents", icon: <People /> },
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
  // {
  //   title: "Reports",
  //   icon: <Assessment />,
  //   children: [
  //     {
  //       title: "Trial Balance",
  //       path: "/reports/trial-balance",
  //       icon: <Assessment />,
  //     },
  //     {
  //       title: "Profit & Loss",
  //       path: "/reports/profit-loss",
  //       icon: <Assessment />,
  //     },
  //     {
  //       title: "Balance Sheet",
  //       path: "/reports/balance-sheet",
  //       icon: <Assessment />,
  //     },
  //     { title: "AR Aging", path: "/reports/ar-aging", icon: <Assessment /> },
  //     { title: "Stock Report", path: "/reports/stock", icon: <Assessment /> },
  //   ],
  // },
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
    const isChildActive =
      hasChildren &&
      item.children.some((child) => child.path === location.pathname);

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding sx={{ pl: depth * 1.5, mb: 0.5 }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleExpandClick(item.title);
              } else if (item.path) {
                handleNavigate(item.path);
              }
            }}
            selected={isActive}
            sx={{
              minHeight: depth === 0 ? 44 : 40,
              borderRadius: 1.5,
              mx: 0.5,
              px: 1.5,
              "&.Mui-selected": {
                backgroundColor: depth === 0 ? "primary.50" : "grey.100",
                color: depth === 0 ? "primary.main" : "grey.900",
                fontWeight: 600,
                "& .MuiListItemIcon-root": {
                  color: depth === 0 ? "primary.main" : "grey.700",
                },
              },
              ...(isChildActive &&
                depth === 0 && {
                  backgroundColor: "grey.50",
                }),
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: isActive || isChildActive ? "primary.main" : "grey.600",
                "& .MuiSvgIcon-root": {
                  fontSize: depth === 0 ? "1.35rem" : "1.2rem",
                },
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.title}
              primaryTypographyProps={{
                fontSize: depth === 0 ? "0.9rem" : "0.875rem",
                fontWeight: isActive || isChildActive ? 600 : 500,
              }}
            />
            {hasChildren && (
              <Box
                sx={{
                  color: "grey.400",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {isExpanded ? (
                  <ExpandLess sx={{ fontSize: "1.25rem" }} />
                ) : (
                  <ExpandMore sx={{ fontSize: "1.25rem" }} />
                )}
              </Box>
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 1 }}>
              {item.children.map((child) => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box
        sx={{
          height: "70px",
          minHeight: "70px",
          maxHeight: "70px",
          px: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: "1.25rem",
          }}
        >
          P
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: "1.125rem",
              lineHeight: 1.2,
              color: "grey.900",
            }}
          >
            {process.env.REACT_APP_COMPANY_NAME || "Paper ERP"}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "grey.500", fontSize: "0.75rem" }}
          >
            Enterprise Edition
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "scroll",
          px: 1.5,
          py: 2,
          scrollbarGutter: "stable",
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "grey.300",
            borderRadius: "3px",
            "&:hover": {
              backgroundColor: "grey.400",
            },
          },
          scrollbarWidth: "thin",
          scrollbarColor: "#d1d5db transparent",
        }}
      >
        <List sx={{ p: 0 }}>
          {menuItems.map((item) => renderMenuItem(item))}
        </List>
      </Box>
      <Divider />
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            backgroundColor: "grey.50",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "grey.200",
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: "primary.main",
              fontSize: "0.875rem",
            }}
          >
            AD
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "grey.900", lineHeight: 1.3 }}
            >
              Admin User
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "grey.500", fontSize: "0.75rem" }}
            >
              admin@company.com
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: "white",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }}>
          <IconButton
            color="primary"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                color: "grey.900",
                fontSize: "1.375rem",
              }}
            >
              {menuItems.find(
                (item) =>
                  item.path === location.pathname ||
                  item.children?.some(
                    (child) => child.path === location.pathname
                  )
              )?.title ||
                menuItems
                  .flatMap((item) => item.children || [])
                  .find((child) => child.path === location.pathname)?.title ||
                "Dashboard"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "grey.500",
                fontSize: "0.8125rem",
                display: "block",
                mt: 0.25,
              }}
            >
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              size="medium"
              sx={{
                color: "grey.600",
                "&:hover": { backgroundColor: "grey.100" },
              }}
            >
              <HelpIcon />
            </IconButton>
            <IconButton
              size="medium"
              sx={{
                color: "grey.600",
                "&:hover": { backgroundColor: "grey.100" },
              }}
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton
              size="medium"
              sx={{
                color: "grey.600",
                "&:hover": { backgroundColor: "grey.100" },
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Stack>
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
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }} />
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
