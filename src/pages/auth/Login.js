import React from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Link as MuiLink,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";

const Login = () => {
  const { login } = useAuth();
  const { setLoading, showNotification } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data);
      const redirectTo = location.state?.from?.pathname || "/";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      showNotification(error.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 420,
          width: "100%",
          p: 4,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "grey.200",
          boxShadow:
            "0px 10px 30px rgba(99, 102, 241, 0.08), 0px 6px 16px rgba(0,0,0,0.04)",
        }}
      >
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in with your username or email and password.
        </Typography>

        <Stack spacing={2.5} component="form" onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="identifier"
            control={control}
            rules={{ required: "Username or email is required" }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Username or Email"
                error={!!errors.identifier}
                helperText={errors.identifier?.message}
              />
            )}
          />

          <Controller
            name="password"
            control={control}
            rules={{ required: "Password is required" }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="password"
                label="Password"
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )}
          />

          <Button type="submit" variant="contained" size="large" fullWidth>
            Sign In
          </Button>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: "center" }}
        >
          New here?{" "}
          <MuiLink component={Link} to="/register" underline="hover">
            Create an account
          </MuiLink>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;

