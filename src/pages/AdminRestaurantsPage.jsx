import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Button,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
} from "@mui/material";
import api from "../api";

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/restaurants/admin/all?status=${filter}`);
      setRestaurants(res.data);
    } catch (err) {
      console.error("Error loading restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, [filter]);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/restaurants/${id}/approve`);
      setStatus("Restaurant approved!");
      loadRestaurants();
    } catch (err) {
      console.error("Error approving:", err);
      setStatus("Error approving restaurant");
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/restaurants/${id}/reject`);
      setStatus("Restaurant rejected!");
      loadRestaurants();
    } catch (err) {
      console.error("Error rejecting:", err);
      setStatus("Error rejecting restaurant");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this restaurant?")) return;
    try {
      await api.delete(`/restaurants/${id}`);
      setStatus("Restaurant deleted!");
      loadRestaurants();
    } catch (err) {
      console.error("Error deleting:", err);
      setStatus("Error deleting restaurant");
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Restaurant Moderation
      </Typography>

      <Paper sx={{ p: 3, mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body1">Filter by status:</Typography>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </Select>
      </Paper>

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><b>ID</b></TableCell>
                <TableCell><b>Name</b></TableCell>
                <TableCell><b>Type</b></TableCell>
                <TableCell><b>Price</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Rating</b></TableCell>
                <TableCell align="right"><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {restaurants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No restaurants found.
                  </TableCell>
                </TableRow>
              )}
              {restaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.type || "-"}</TableCell>
                  <TableCell>{r.price_level || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.status}
                      color={
                        r.status === "approved"
                          ? "success"
                          : r.status === "pending"
                          ? "warning"
                          : "error"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{r.rating?.toFixed(1) || "–"}</TableCell>
                  <TableCell align="right">
                    {r.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleApprove(r.id)}
                          color="success"
                          size="small"
                          variant="contained"
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(r.id)}
                          color="warning"
                          size="small"
                          variant="contained"
                          sx={{ mr: 1 }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => handleDelete(r.id)}
                      color="error"
                      size="small"
                      variant="outlined"
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {status && (
        <Typography
          mt={3}
          textAlign="center"
          sx={{ color: "#444", fontWeight: 500 }}
        >
          {status}
        </Typography>
      )}
    </Box>
  );
}
