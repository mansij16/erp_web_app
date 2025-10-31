import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

const LoadingSpinner = ({ message = "Loading...", size = "medium" }) => {
  const sizeMap = {
    small: 40,
    medium: 60,
    large: 80,
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        gap: 3,
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "inline-flex",
        }}
      >
        <CircularProgress
          size={spinnerSize}
          thickness={4}
          sx={{
            color: "primary.main",
            animationDuration: "1s",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: spinnerSize * 0.6,
            height: spinnerSize * 0.6,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            opacity: 0.1,
          }}
        />
      </Box>
      <Typography
        variant="body1"
        sx={{
          color: "grey.600",
          fontWeight: 500,
          fontSize: "0.9375rem",
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
