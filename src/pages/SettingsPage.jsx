import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Divider,
  Alert,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import api from "../api";

export default function SettingsPage() {
  const [platformName, setPlatformName] = useState("");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [cacheDuration, setCacheDuration] = useState(30);
  const [lastBackup, setLastBackup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [status, setStatus] = useState("");
  const [cacheStats, setCacheStats] = useState(null);
  const [cacheWarning, setCacheWarning] = useState("");


  useEffect(() => {
    loadSettings();
    loadCacheStats();
  }, []);

  const loadSettings = () => {
    api
      .get("/settings")
      .then((res) => {
        setPlatformName(res.data.platformName || "");
        setGoogleMapsApiKey(res.data.googleMapsApiKey || "");
        setCacheDuration(res.data.cacheDuration || 30);
        setLastBackup(res.data.lastBackup || null);
      })
      .catch((err) => console.error("Error loading settings:", err));
  };

  const loadCacheStats = async () => {
    try {
      const res = await api.get("/restaurants/google-cache-stats");
      setCacheStats(res.data);
    } catch (err) {
      console.error("Error loading cache stats:", err);
    }
  };


  const saveSettings = async () => {

    const duration = parseInt(cacheDuration);
    if (duration < 1 || duration > 30) {
      setStatus("Cache duration must be between 1 and 30 days");
      setCacheWarning("Google Places API policies require cache duration to be maximum 30 days.");
      setTimeout(() => {
        setStatus("");
        setCacheWarning("");
      }, 5000);
      return;
    }

    const data = {
      platformName,
      googleMapsApiKey,
      cacheDuration: duration,
      lastBackup,
    };

    try {
      const res = await api.post("/settings", data);
      localStorage.setItem("appSettings", JSON.stringify(res.data));

      window.dispatchEvent(new Event("storage"));

      setStatus("Settings saved successfully");
      setCacheWarning("");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setStatus("Error saving settings");
    }
  };


  const handleBackup = async () => {
    setLoading(true);
    setStatus("Generating backup...");
    try {
      const response = await api.get("/backup", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/sql" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString()}.sql`;
      a.click();
      
      const newLastBackup = new Date().toISOString();
      setLastBackup(newLastBackup);
      

      const data = {
        platformName,
        googleMapsApiKey,
        cacheDuration,
        lastBackup: newLastBackup,
      };
      await api.post("/settings", data);
      

      const appSettings = JSON.parse(localStorage.getItem("appSettings") || "{}");
      appSettings.lastBackup = newLastBackup;
      localStorage.setItem("appSettings", JSON.stringify(appSettings));
      
      setStatus("Backup downloaded successfully");
    } catch (err) {
      setStatus("Error creating backup");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const clearCache = async () => {
    if (!window.confirm("Are you sure you want to clear all Google Places cache from the database?")) {
      return;
    }

    setClearingCache(true);
    setStatus("Clearing Google Places cache...");
    
    try {
      const res = await api.post("/restaurants/google-cache/cleanup");
      await loadCacheStats();
      setStatus(`Cache cleared successfully! Deleted ${res.data.deleted || 0} expired entries.`);
    } catch (err) {
      console.error("Error clearing cache:", err);
      setStatus("Error clearing cache");
    } finally {
      setClearingCache(false);
      setTimeout(() => setStatus(""), 5000);
    }
  };


  const handleClearAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete ALL restaurants?\nThis action cannot be undone!"
      )
    )
      return;
    try {
      setClearing(true);
      setStatus("Deleting all restaurants...");
      const res = await api.delete("/admin/clear-all");
      setStatus((res.data.message || "Database cleared."));
    } catch (err) {
      console.error("Error clearing DB:", err);
      setStatus("Error clearing database.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Box sx={{ p: 5 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper
        sx={{
          p: 4,
          width: "100%",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" mb={2}>
          Platform Configuration
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
          <TextField
            label="Platform Name"
            fullWidth
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            placeholder="Ex: Diner App"
          />
          <TextField
            label="Google Maps API Key"
            fullWidth
            value={googleMapsApiKey}
            onChange={(e) => setGoogleMapsApiKey(e.target.value)}
            placeholder="AIza..."
          />
          <TextField
            label="Cache Duration (days)"
            type="number"
            fullWidth
            inputProps={{ min: 1, max: 30 }}
            value={cacheDuration}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setCacheDuration(e.target.value);
              if (value > 30) {
                setCacheWarning("Google Places API policies do not allow cache duration longer than 30 days.");
              } else {
                setCacheWarning("");
              }
            }}
            helperText="Maximum 30 days (Google Places API policy)"
          />
          {cacheWarning && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {cacheWarning}
            </Alert>
          )}
        </Box>

        <Box display="flex" gap={2} mb={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={saveSettings}
          >
            Save Settings
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" mb={2}>
          Google Places Cache Management
        </Typography>

        {cacheStats && (
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Entries
                  </Typography>
                  <Typography variant="h4">
                    {cacheStats.total_entries || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Entries
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {cacheStats.active_entries || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Expired Entries
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {cacheStats.expired_entries || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Button
          variant="outlined"
          color="secondary"
          onClick={clearCache}
          disabled={clearingCache}
          startIcon={clearingCache && <CircularProgress size={18} />}
        >
          {clearingCache ? "Clearing Cache..." : "Clear Expired Cache"}
        </Button>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" mb={1}>
          Backup Database
        </Typography>
        <Typography variant="body2" mb={2}>
          Last backup:{" "}
          {lastBackup
            ? new Date(lastBackup).toLocaleString()
            : "No backup yet"}
        </Typography>

        <Button
          variant="contained"
          onClick={handleBackup}
          disabled={loading}
          startIcon={loading && <CircularProgress size={18} />}
        >
          {loading ? "Creating Backup..." : "Download Backup"}
        </Button>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" color="error" mb={1}>
          Danger Zone
        </Typography>

        <Button
          variant="contained"
          color="error"
          onClick={handleClearAll}
          disabled={clearing}
        >
          {clearing ? "Deleting..." : "Clear All Restaurants"}
        </Button>

        {status && (
          <Box
            mt={3}
            p={2}
            sx={{
              backgroundColor: "#f9f9f9",
              borderRadius: 2,
              borderLeft: "4px solid #1976d2",
            }}
          >
            <Typography>{status}</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
