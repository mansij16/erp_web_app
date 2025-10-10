import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { Error as ErrorIcon } from "@mui/icons-material";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#f5f5f5",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: "center",
            }}
          >
            <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Oops! Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {this.state.error?.message || "An unexpected error occurred"}
            </Typography>
            <Button variant="contained" onClick={this.handleReset}>
              Go to Dashboard
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
