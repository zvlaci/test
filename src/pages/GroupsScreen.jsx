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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function GroupsScreen() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  const currentUser = (() => {
    const token = localStorage.getItem('token');
    if (!token) return { id: null, role: null };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.userId || payload.id || payload.sub || null;
      const role = payload.role || null;
      return { id: id != null ? Number(id) : null, role };
    } catch {
      return { id: null, role: null };
    }
  })();

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (search) params.append("name", search);
      
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      console.log("Loading groups with params:", params.toString());
      
      const res = await api.get(`/groups?${params.toString()}`);
      
      console.log("Server response summary:", {
        groupsCount: res.data.data?.length || 0,
        total: res.data.total,
        page: res.data.page,
        totalPages: res.data.totalPages
      });

      console.debug('Full groups payload from API:', res.data);
      
      setGroups(res.data.data || []);
      setTotal(res.data.total || 0);
   
      try {
        const groupsWithOwner = res.data.data || [];
   
        console.debug('Groups to process for owner enrichment:', groupsWithOwner);
        const fetches = groupsWithOwner.map(async (g) => {
          if (!g.owner && g.ownerId) {
            try {
              const r = await api.get(`/users/${g.ownerId}`);
              const owner = r.data?.user || r.data || null;
              return { ...g, owner };
            } catch (err) {
          
              return g;
            }
          }
          return g;
        });
        const resolved = await Promise.all(fetches);
     
        const normalized = resolved.map((g) => ({
          ...g,
          owner: g.owner || (Array.isArray(g.members) && g.members.length ? g.members[0] : null),
          ownerId: g.owner?.id || (Array.isArray(g.members) && g.members.length ? g.members[0].id : g.ownerId),
        }));
        setGroups(normalized);
      } catch (err) {
        console.warn('Could not fetch owner details for groups', err);
      }
    } catch (err) {
      console.error("Error loading groups:", err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);


  useEffect(() => {
    loadGroups();
  }, [loadGroups]);


  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [search, page]);

  const handleFilter = () => {
    setPage(1); 
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this group?")) return;
    try {
      setDeletingId(id);
    
      const token = localStorage.getItem('token');
      let userId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id || payload.sub || null;
        } catch {
          console.warn('Invalid token format, cannot extract userId');
        }
      }

   
      if (userId != null) {
        await api.delete(`/groups/${id}`, { data: { userId: Number(userId) } });
      } else {
     
        await api.delete(`/groups/${id}`);
      }
    
      await loadGroups();
    } catch (err) {
      console.error("Error deleting group:", err);
      const serverMsg = err?.response?.data?.message || err?.response?.data || err?.message;
      alert(`Failed to delete group. ${serverMsg ? `Server: ${serverMsg}` : ""}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box sx={{ p: 5 }}>
      <Typography variant="h4" gutterBottom>
        Groups
      </Typography>

      {/* Search bar */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          label="Search groups"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFilter()}
        />
        <Button
          variant="contained"
          onClick={handleFilter}
          sx={{ height: "40px" }}
        >
          Search
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setSearch("");
          }}
          sx={{ height: "40px" }}
        >
          Reset
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          color="success"
          onClick={() => navigate("/groups/new")}
        >
          + Add Group
        </Button>
      </Box>

      <Paper
        sx={{
          width: "100%",
          overflow: "hidden",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <TableContainer sx={{ maxHeight: "70vh", overflow: "auto" }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Owner</strong></TableCell>
                  <TableCell><strong>Allergens</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No groups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((g) => (
                    <TableRow key={g.id} hover>
                      <TableCell>{g.id}</TableCell>
                      <TableCell>{g.name}</TableCell>
                      <TableCell>
                        {g.owner && (
                          `${String(g.owner.first_name || '').trim()} ${String(g.owner.last_name || '').trim()}`.trim() ||
                          g.owner.email ||
                          String(g.owner.id || '')
                        )}
                        {!g.owner && g.ownerId ? g.ownerId : (!g.owner && !g.ownerId ? '-' : '')}
                      </TableCell>
                      <TableCell>
                        {Array.isArray(g.allergy_filter)
                          ? g.allergy_filter.join(", ")
                          : g.allergy_filter
                          ? g.allergy_filter
                          : "-"}
                      </TableCell>
                      <TableCell align="right">
                        {(() => {
                          const ownerId = Number(g.owner?.id ?? g.ownerId ?? NaN);
                          const isOwner = currentUser.id != null && ownerId === currentUser.id;
                          const isAdmin = currentUser.role === 'admin';
                          const canManage = isAdmin || isOwner;
                          if (!canManage) return null;
                          return (
                            <>
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ mr: 1 }}
                                onClick={() => navigate(`/groups/${g.id}`)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                disabled={deletingId === g.id}
                                onClick={() => handleDelete(g.id)}
                              >
                                {deletingId === g.id ? "Deleting..." : "Delete"}
                              </Button>
                            </>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
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
          labelRowsPerPage="Groups per page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </Paper>
    </Box>
  );
}
