import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { SnackbarProvider } from "notistack";
import { AppProvider } from "./contexts/AppContext";
import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/common/ErrorBoundary";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#dc004e",
      light: "#f50057",
      dark: "#c51162",
    },
    success: {
      main: "#2e7d32",
    },
    warning: {
      main: "#ed6c02",
    },
    info: {
      main: "#0288d1",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "none",
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          autoHideDuration={3000}
        >
          <BrowserRouter>
            <AppProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </AppProvider>
          </BrowserRouter>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
