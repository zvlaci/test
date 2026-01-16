import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Fade,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function InstallPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setShowSuccess(false);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/install`,
        form
      );

      setMessage(res.data.message);
      setShowSuccess(true);

      // redirect to login
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Install failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #006DB7 0%, #00A1E5 100%)",
        padding: 2,
      }}
    >
      <Fade in timeout={800}>
        <Paper
          elevation={10}
          sx={{
            maxWidth: 400,
            width: "100%",
            p: 4,
            borderRadius: 3,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: "bold", mb: 2, color: "#006DB7" }}
          >
            App Install – Setup Admin
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            Create your first administrator account to start using your App.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Fade in={showSuccess} timeout={400}>
            <Alert severity="success" sx={{ mb: showSuccess ? 2 : 0 }}>
              {message}
            </Alert>
          </Fade>

          <form onSubmit={handleSubmit} autoComplete="on">
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              autoComplete="name"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              autoComplete="email"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              autoComplete="new-password"
              sx={{ mb: 3 }}
            />

            <Button
              variant="contained"
              fullWidth
              type="submit"
              size="large"
              disabled={loading}
              sx={{
                backgroundColor: "#006DB7",
                ":hover": { backgroundColor: "#005497" },
                fontWeight: "bold",
                letterSpacing: 0.5,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Create Admin"
              )}
            </Button>
          </form>

        </Paper>
      </Fade>
    </Box>
  );
}
