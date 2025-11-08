import React from "react";
import { Typography, Box } from "@mui/material";

const Dashboard = () => {
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
    </Box>
  );
};

export default Dashboard;
