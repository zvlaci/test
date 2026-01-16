import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  MenuItem,
  TableContainer,
  TablePagination,
  Chip,
  InputAdornment,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const token = localStorage.getItem('token');
  let currentUserId = null;
  let currentRole = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.userId || payload.id || payload.sub || null;
      currentUserId = id != null ? Number(id) : null;
      currentRole = payload.role || null;
    } catch {
      currentUserId = null;
      currentRole = null;
    }
  }
  const isSelfMode = currentRole === 'user';


  useEffect(() => {
    if (isSelfMode && currentUserId) {
      navigate(`/users/${currentUserId}`, { replace: true });
    }
  }, [isSelfMode, currentUserId, navigate]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      if (isSelfMode) return;

      const params = new URLSearchParams();
      
      if (search) params.append("name", search);
      if (roleFilter) params.append("role", roleFilter);
      
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      console.log("Loading users with params:", params.toString());
      
      const res = await api.get(`/users?${params.toString()}`);
      
      console.log("Server response:", {
        usersCount: res.data.data?.length || 0,
        total: res.data.total,
        page: res.data.page,
        totalPages: res.data.totalPages
      });
      
      setUsers(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error loading users:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page, limit, isSelfMode]);

  const handleEdit = (id) => navigate(`/users/${id}`);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setDeletingId(id);
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error deleting user.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilter = () => {
    setPage(1); 
  };


  useEffect(() => {
    loadUsers();
  }, [loadUsers]);


  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [search, page]);

  return (
    <Box sx={{ backgroundColor: "#f5f6fa", minHeight: "100vh", p: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 4 }}>
        {isSelfMode ? 'My Account' : 'Users Management'}
      </Typography>


      {!isSelfMode && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <FilterListIcon color="action" />
            <Typography variant="body2" fontWeight={600}>
              Filters:
            </Typography>

            <TextField
              label="Search by name or email"
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilter()}
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              label="Role"
              variant="outlined"
              size="small"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="restaurant">Restaurant</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>

            {(search || roleFilter) && (
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={() => {
                  setSearch("");
                  setRoleFilter("");
                }}
                sx={{ height: "40px" }}
              >
                Clear
              </Button>
            )}

            <Chip
              label={`${total} user${total !== 1 ? 's' : ''} found`}
              size="small"
              color="primary"
              variant="outlined"
            />

            <Box sx={{ flexGrow: 1 }} />

            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/users/new")}
              //startIcon={<PersonAddIcon />}
              size="large"
            >
              + Add User
            </Button>
          </Box>
        </Paper>
      )}


      <Paper sx={{ borderRadius: 2, boxShadow: 3 }}>
        <TableContainer sx={{ maxHeight: "70vh" }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Table stickyHeader sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>ID</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>Name</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>Email</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>Role</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>Groups</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={700}>Actions</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No users found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {user.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight={600}>
                          {(
                            `${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() ||
                            user.email ||
                            ''
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role} 
                          size="small"
                          color={
                            user.role === 'admin' ? 'error' : 
                            user.role === 'restaurant' ? 'warning' : 
                            'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {user.groups && user.groups.length > 0 ? (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {user.groups.map((g) => (
                              <Chip 
                                key={g.id} 
                                label={g.name} 
                                size="small" 
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEdit(user.id)}
                          >
                            Edit
                          </Button>
                          {!isSelfMode && (
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              disabled={deletingId === user.id}
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDelete(user.id)}
                            >
                              {deletingId === user.id ? "Deleting..." : "Delete"}
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        {!isSelfMode && (
          <TablePagination
            component="div"
            count={total}
            page={page - 1}
            onPageChange={(_, newPage) => setPage(newPage + 1)}
            rowsPerPage={limit}
            onRowsPerPageChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Users per page:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
            }
          />
        )}
      </Paper>
    </Box>
  );
}
