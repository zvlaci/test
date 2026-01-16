import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  Chip,
  Card,
  CardContent,
  Grid,
  TablePagination,
  InputLabel,
  Autocomplete,
  TextField,
} from "@mui/material";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import GroupIcon from "@mui/icons-material/Group";
import GroupsIcon from "@mui/icons-material/Groups";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import LoginIcon from "@mui/icons-material/Login";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import UpdateIcon from "@mui/icons-material/Update";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [approvingAll, setApprovingAll] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterRating, setFilterRating] = useState("");
  const [filterPriceLevel, setFilterPriceLevel] = useState("");
  const [filterName, setFilterName] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const hasPendingRestaurants = Array.isArray(pending) && pending.length > 0;

  const isAdmin = (() => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'admin';
    } catch {
      return false;
    }
  })();

  const currentUser = (() => {
    const token = localStorage.getItem('token');
    if (!token) return { id: null, role: null };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.userId || payload.id || payload.sub || null;
      return { id: id != null ? Number(id) : null, role: payload.role || null };
    } catch {
      return { id: null, role: null };
    }
  })();

  const isUser = currentUser.role === 'user';

  const reloadDashboardData = async () => {
    if (isUser) {
      if (!currentUser.id) {
        setRecentActivity([]);
        return;
      }
      const res = await api.get(`/activity/user/${currentUser.id}?limit=50`);
      setRecentActivity(Array.isArray(res.data) ? res.data : []);
      return;
    }

    const [statsRes, pendingRes] = await Promise.all([
      api.get("/stats"),
      api.get("/restaurants/pending"),
    ]);
    setStats(statsRes.data);
    setPending(pendingRes.data);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await reloadDashboardData();
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleApproveAll = async () => {
    if (!isAdmin) return;
    if (!hasPendingRestaurants) return;
    if (!window.confirm('Approve ALL pending restaurants?')) return;
    try {
      setApprovingAll(true);
      const res = await api.patch('/restaurants/approve-all');
      const approvedCount = res?.data?.approved;
      alert(`Approved ${approvedCount ?? 0} restaurant(s).`);
      await reloadDashboardData();
      setSelected([]);
      setBulkAction('');
    } catch (err) {
      console.error('Error approving all restaurants:', err);
      alert('Failed to approve all restaurants');
    } finally {
      setApprovingAll(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/restaurants/${id}/approve`);
      setPending((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error approving restaurant:", err);
      alert("Failed to approve restaurant");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this restaurant?")) {
      return;
    }
    try {
      await api.delete(`/restaurants/${id}`);
      setPending((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error rejecting restaurant:", err);
      alert("Failed to reject restaurant");
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      // Select only items on current page
      const currentPageIds = paginatedPending.map((r) => r.id);
      setSelected(currentPageIds);
    } else {
      setSelected([]);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    setSelected([]); // Clear selection when changing page
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    setSelected([]);
  };

  // Filtered data
  const filteredPending = pending.filter((r) => {
    if (filterName && !r.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterRating) {
      const exactRating = parseInt(filterRating);
      const restaurantRating = Math.round(parseFloat(r.rating));
      if (isNaN(restaurantRating) || restaurantRating !== exactRating) return false;
    }
    if (filterPriceLevel && r.price_level !== parseInt(filterPriceLevel)) return false;
    return true;
  });

  const sortedPending = [...filteredPending].sort((a, b) => {
    if (!sortBy) return 0;
    
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'created_at') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }
    else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue || "").toLowerCase();
    }
    
    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  const paginatedPending = sortedPending.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleSelectOne = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selected.length === 0) {
      alert("Please select restaurants and an action");
      return;
    }

    if (bulkAction === "reject") {
      if (!window.confirm(`Are you sure you want to reject ${selected.length} restaurant(s)?`)) {
        return;
      }
    }

    try {
      if (bulkAction === "approve") {
        await Promise.all(selected.map((id) => api.patch(`/restaurants/${id}/approve`)));
      } else if (bulkAction === "reject") {
        await Promise.all(selected.map((id) => api.delete(`/restaurants/${id}`)));
      }
      setPending((prev) => prev.filter((r) => !selected.includes(r.id)));
      setSelected([]);
      setBulkAction("");
    } catch (err) {
      console.error("Error performing bulk action:", err);
      alert("Failed to perform bulk action");
    }
  };

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: 4, backgroundColor: "#f5f6fa", minHeight: "100vh" }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={700} sx={{ mb: 0 }}>
          Dashboard
        </Typography>
        {isAdmin && hasPendingRestaurants && (
          <Button
            variant="contained"
            color="success"
            onClick={handleApproveAll}
            disabled={approvingAll}
            startIcon={<CheckCircleIcon />}
          >
            {approvingAll ? 'Approving…' : 'Approve all restaurants'}
          </Button>
        )}
      </Box>

      {/* Stats cards */}
      {!isUser && stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              boxShadow: 3,
            }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Restaurants
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {stats.restaurants}
                    </Typography>
                  </Box>
                  <RestaurantIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card sx={{ 
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
              boxShadow: 3,
            }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Users
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {stats.users}
                    </Typography>
                  </Box>
                  <GroupIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card sx={{ 
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              color: "white",
              boxShadow: 3,
            }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Groups
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {stats.groups}
                    </Typography>
                  </Box>
                  <GroupsIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Pending Approval Section */}
      {!isUser && (
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Restaurants Pending Approval
          </Typography>
          {pending.length > 0 && (
            <Chip 
              label={pending.length} 
              color="warning" 
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>

        {pending.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: "#4CAF50", mb: 2 }} />
            <Typography color="text.secondary">
              No pending restaurants - All clear!
            </Typography>
          </Box>
        ) : (
          <>
            {/* Bulk Actions and Filters */}
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {selected.length} selected
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  displayEmpty
                  disabled={selected.length === 0}
                >
                  <MenuItem value="" disabled>
                    Bulk Action
                  </MenuItem>
                  <MenuItem value="approve">
                    <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: "success.main" }} />
                    Approve
                  </MenuItem>
                  <MenuItem value="reject">
                    <CancelIcon fontSize="small" sx={{ mr: 1, color: "error.main" }} />
                    Reject
                  </MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleBulkAction}
                disabled={!bulkAction || selected.length === 0}
              >
                Apply
              </Button>

              <Box sx={{ width: "1px", height: "40px", bgcolor: "divider", mx: 1 }} />

              <FilterListIcon color="action" />
              <Typography variant="body2" fontWeight={600}>
                Filters:
              </Typography>
              
              <TextField
                size="small"
                label="Restaurant Name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Search by name"
                sx={{ minWidth: 200 }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Rating</InputLabel>
                <Select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  label="Rating"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="5">⭐⭐⭐⭐⭐ 5 Stars</MenuItem>
                  <MenuItem value="4">⭐⭐⭐⭐ 4 Stars</MenuItem>
                  <MenuItem value="3">⭐⭐⭐ 3 Stars</MenuItem>
                  <MenuItem value="2">⭐⭐ 2 Stars</MenuItem>
                  <MenuItem value="1">⭐ 1 Star</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Price Level</InputLabel>
                <Select
                  value={filterPriceLevel}
                  onChange={(e) => setFilterPriceLevel(e.target.value)}
                  label="Price Level"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="1">$ (Budget)</MenuItem>
                  <MenuItem value="2">$$ (Moderate)</MenuItem>
                  <MenuItem value="3">$$$ (Expensive)</MenuItem>
                  <MenuItem value="4">$$$$ (Luxury)</MenuItem>
                </Select>
              </FormControl>

              {(filterName || filterRating || filterPriceLevel) && (
                <Button
                  size="small"
                  onClick={() => {
                    setFilterName("");
                    setFilterRating("");
                    setFilterPriceLevel("");
                    setPage(0);
                  }}
                >
                  Clear Filters
                </Button>
              )}

              <Chip 
                label={`${filteredPending.length} of ${pending.length} restaurants`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={paginatedPending.length > 0 && selected.length === paginatedPending.length}
                        indeterminate={selected.length > 0 && selected.length < paginatedPending.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>
                      <Box 
                        sx={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 0.5,
                          cursor: "pointer",
                          "&:hover": { color: "primary.main" }
                        }}
                        onClick={() => {
                          if (sortBy === "name") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("name");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          Restaurant Name
                        </Typography>
                        {sortBy === "name" && (
                          sortOrder === "asc" ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        Type
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box 
                        sx={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 0.5,
                          cursor: "pointer",
                          "&:hover": { color: "primary.main" }
                        }}
                        onClick={() => {
                          if (sortBy === "created_at") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("created_at");
                            setSortOrder("desc"); // Default to newest first
                          }
                        }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          Date Added
                        </Typography>
                        {sortBy === "created_at" && (
                          sortOrder === "asc" ? 
                            <ArrowUpwardIcon fontSize="small" /> : 
                            <ArrowDownwardIcon fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={700}>
                        Actions
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPending.map((r) => (
                    <TableRow 
                      key={r.id}
                      hover
                      selected={selected.includes(r.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(r.id)}
                          onChange={() => handleSelectOne(r.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight={600}>
                          {r.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={r.type || "N/A"} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/restaurants/${r.id}`)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleApprove(r.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<CancelIcon />}
                            onClick={() => handleReject(r.id)}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={filteredPending.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              labelRowsPerPage="Rows per page:"
            />
          </>
        )}
      </Paper>
      )}

      {/* Recent Activity */}
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>
          Recent Activity
        </Typography>
        <List>
          {(
            (isUser && (!recentActivity || recentActivity.length === 0)) ||
            (!isUser && (!stats || !stats.recent || stats.recent.length === 0))
          ) && (
            <ListItem>
              <ListItemText 
                primary="No recent activity"
                primaryTypographyProps={{ color: "text.secondary" }}
              />
            </ListItem>
          )}
          {(isUser ? recentActivity : (stats?.recent || [])).map((a, i) => {
            let IconComponent = NotificationsIcon;
            let iconColor = "action";
            let message = a.description || "";
            
            if (a.action === "logged_in") {
              IconComponent = LoginIcon;
              iconColor = "primary";
              message = `${a.name || 'User'} logged in`;
            } else if (a.action === "pending") {
              IconComponent = PendingActionsIcon;
              iconColor = "warning";
              message = `New ${a.type} pending approval: ${a.name}`;
            } else if (a.action === "approved") {
              IconComponent = CheckCircleIcon;
              iconColor = "success";
              message = `Restaurant approved: ${a.name}`;
              if (a.approvedBy) {
                message = `${a.approvedBy} approved restaurant: ${a.name}`;
              }
            } else if (a.action === "created") {
              IconComponent = AddCircleIcon;
              iconColor = "success";
              if (a.type === "user") {
                message = `New user registered: ${a.name}`;
              } else {
                message = `New ${a.type} created: ${a.name}`;
              }
            } else if (a.action === "updated") {
              IconComponent = UpdateIcon;
              iconColor = "info";
              message = `${a.type.charAt(0).toUpperCase() + a.type.slice(1)} updated: ${a.name}`;
            } else if (a.action === "deleted") {
              IconComponent = DeleteIcon;
              iconColor = "error";
              message = `${a.type.charAt(0).toUpperCase() + a.type.slice(1)} deleted: ${a.name}`;
            } else {
              message = message || `${a.action} ${a.type}: ${a.name || ''}`.trim();
            }
            
            const listLen = isUser ? (recentActivity?.length || 0) : (stats?.recent?.length || 0);
            return (
              <ListItem key={i} divider={i < listLen - 1}>
                <ListItemIcon>
                  <IconComponent color={iconColor} />
                </ListItemIcon>
                <ListItemText
                  primary={message}
                  secondary={new Date(a.date || a.created_at || a.timestamp || a.last_login_at).toLocaleString()}
                  primaryTypographyProps={{ fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: "0.875rem" }}
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
}
