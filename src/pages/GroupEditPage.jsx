import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  TextField,
  MenuItem,
  Button,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  Autocomplete,
} from "@mui/material";
import api from "../api";
import AllergyAutocomplete from "../components/AllergyAutocomplete";

export default function GroupEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [group, setGroup] = useState({
    name: "",
    description: "",
    allergy_filter: [],
    memberIds: [],
    ownerId: null,
  });
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  

  const loadUsers = async () => {
    try {
      const res = await api.get("/users");
      console.log("Users API response:", res.data);

      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else if (res.data?.users && Array.isArray(res.data.users)) {
        setUsers(res.data.users);
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
      } else {
        console.error("Unexpected users response format:", res.data);
        setUsers([]);
      }
    } catch (err) {
      console.error("Error loading users:", err);
      setUsers([]);
    }
  };

  const loadGroup = async () => {
    try {
      const res = await api.get(`/groups/${id}`);
      const g = res.data;
      console.debug('Full group payload from API:', g);

      const fallbackOwner = g.owner || (Array.isArray(g.members) && g.members.length ? g.members[0] : null);
      const fallbackOwnerId = g.ownerId || (fallbackOwner ? fallbackOwner.id : null);
      setGroup({
        name: g.name || "",
        description: g.description || "",
        allergy_filter: Array.isArray(g.allergy_filter)
          ? g.allergy_filter
          : g.allergy_filter
          ? g.allergy_filter.split(",").map((a) => a.trim()).filter(Boolean)
          : [],
        memberIds: g.members ? g.members.map((m) => m.id) : [],
        ownerId: fallbackOwnerId,
      });
      setSelectedNewOwner(fallbackOwnerId);
    } catch (err) {
      console.error("Error loading group:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (currentUserRole !== 'user') {
      loadUsers();
    }
    if (id && id !== "new") {
      loadGroup();
    } else {
      setLoading(false);
    }
  }, [id, currentUserRole]);

  useEffect(() => {
    if (currentUserRole !== 'user') return;
    if (isNew) return;
    if (!currentUserId) return;
    if (!group?.ownerId) return;
    if (Number(group.ownerId) !== Number(currentUserId)) {
      alert('You can only edit groups you created.');
      navigate('/groups', { replace: true });
    }
  }, [currentUserRole, isNew, currentUserId, group?.ownerId, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const uid = payload.userId || payload.id || payload.sub || null;
      setCurrentUserId(uid != null ? Number(uid) : null);
      setCurrentUserRole(payload.role || null);
      const name = payload.email || null;
      setCurrentUserName(name);
    } catch {
      console.warn('Invalid token format');
    }
  }, []);

  useEffect(() => {
    if (isNew && currentUserId) {
      setGroup((prev) => {
        const currentIds = Array.isArray(prev.memberIds) ? prev.memberIds.map(Number) : [];
        if (!currentIds.includes(Number(currentUserId))) currentIds.push(Number(currentUserId));
        return {
          ...prev,
          ownerId: prev.ownerId || Number(currentUserId),
          memberIds: currentIds,
        };
      });
    }
  }, [isNew, currentUserId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...group,
        allergy_filter: Array.isArray(group.allergy_filter)
          ? group.allergy_filter
          : group.allergy_filter,
      };

      if (currentUserRole === 'user') {
        delete payload.memberIds;
        delete payload.ownerId;
      }

      if (id === "new" || !id) {
        if (currentUserId) {
          payload.ownerId = Number(currentUserId);
          // ensure memberIds includes current user
          const members = Array.isArray(payload.memberIds) ? payload.memberIds.map(Number) : [];
          if (!members.includes(Number(currentUserId))) members.push(Number(currentUserId));
          payload.memberIds = members;
        }
        await api.post("/groups", payload);
      } else {
        await api.patch(`/groups/${id}`, payload);
      }

      navigate("/groups");
    } catch (err) {
      console.error("Error saving group:", err);
      alert("Error saving group.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeOwner = async () => {
    if (!group || !id) return;
    if (!selectedNewOwner) {
      alert('Select a new owner first.');
      return;
    }
    if (!window.confirm('Change owner to selected user?')) return;
    try {
      // debug 
      console.debug('Attempting owner change', {
        groupId: id,
        currentUserId,
        currentUserRole,
        currentOwnerId: group.ownerId,
        selectedNewOwner,
      });

      const ownerId = group.ownerId || null;
      if (ownerId && Number(currentUserId) !== Number(ownerId) && currentUserRole !== 'admin') {
        alert('Only the current owner or an admin can transfer ownership.');
        return;
      }

      const payload = { newOwnerId: Number(selectedNewOwner) };

      const token = localStorage.getItem('token');
      console.debug('Token present for owner change?', !!token);
      console.debug('Owner change payload:', payload);
      const res = await api.patch(`/groups/${id}/owner`, payload);
      console.debug('Owner change response:', res.data);

      const returned = res.data || {};
      const newOwnerId = returned.owner?.id || Number(selectedNewOwner);
      const newMembers = returned.members ? returned.members.map((m) => m.id) : group.memberIds;

      setGroup((prev) => ({ ...prev, ownerId: newOwnerId, memberIds: newMembers }));
      setSelectedNewOwner(newOwnerId);

      try {
        const check = await api.get(`/groups/${id}`);
        console.debug('Reloaded group after owner change:', check.data);
        const checkedOwnerId = check.data?.ownerId || (check.data?.owner ? check.data.owner.id : null) || (Array.isArray(check.data?.members) && check.data.members.length ? check.data.members[0].id : null);
        if (Number(checkedOwnerId) !== Number(newOwnerId)) {
          alert('Owner change returned OK but server did not persist the new owner. The UI shows the change temporarily. Backend needs to persist owner.');
        } else {
          alert('Owner changed.');
        }
      } catch (chkErr) {
        console.warn('Could not verify owner change after update', chkErr);
        alert('Owner changed locally; could not verify persistence.');
      }

      await loadGroup();
    } catch (err) {
      console.error('Error changing owner:', err);
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('Owner change error status:', status, 'data:', data);
      const serverMsg = data?.message || data || err?.message;
      alert(`Failed to change owner (status ${status}). ${serverMsg ? `Server: ${JSON.stringify(serverMsg)}` : ''}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      setDeleting(true);
      await api.delete(`/groups/${id}`);
      alert("Group deleted.");
      navigate("/groups");
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("Error deleting group.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <Box textAlign="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container sx={{ mt: 5, maxWidth: 600 }}>
      <Typography variant="h4" gutterBottom>
        {isNew ? "Add New Group" : "Edit Group"}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Group Name"
          value={group.name}
          onChange={(e) => setGroup({ ...group, name: e.target.value })}
        />

        <TextField
          label="Description"
          multiline
          rows={3}
          value={group.description}
          onChange={(e) => setGroup({ ...group, description: e.target.value })}
        />

        {/* Allergy Filter */}
        <AllergyAutocomplete
          value={group.allergy_filter}
          onChange={(newAllergies) =>
            setGroup({ ...group, allergy_filter: newAllergies })
          }
          label="Allergy Filter"
          placeholder="Select allergies"
        />

        {currentUserRole !== 'user' && (
          <>
            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(option) => {
                const first = String(option?.first_name || '').trim();
                const last = String(option?.last_name || '').trim();
                return `${first} ${last}`.trim() || option?.email || String(option?.id);
              }}
              value={Array.isArray(group.memberIds) ? group.memberIds.map((id) => {
                const found = users.find((u) => Number(u.id) === Number(id));
                if (found) return found;
                return { id, email: currentUserId === Number(id) ? (currentUserName || `User ${id}`) : `User ${id}` };
              }) : []}
              onChange={(event, newValue) => {
                const ids = newValue.map((u) => Number(u.id));
                setGroup({ ...group, memberIds: ids });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Members"
                  placeholder="Select members"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option ? (
                      `${String(option?.first_name || '').trim()} ${String(option?.last_name || '').trim()}`.trim() ||
                      option?.email ||
                      `User ${option?.id}`
                    ) : option}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 240 }}>
                <InputLabel id="owner-label">Owner</InputLabel>
                <Select
                  labelId="owner-label"
                  value={selectedNewOwner ?? group.ownerId ?? ''}
                  label="Owner"
                  onChange={(e) => setSelectedNewOwner(e.target.value)}
                >
          
                  {group.memberIds && group.memberIds.length > 0 ? (
                    group.memberIds.map((mid) => {
                      const u = users.find((uu) => Number(uu.id) === Number(mid));
                      const label = u
                        ? (`${String(u.first_name || '').trim()} ${String(u.last_name || '').trim()}`.trim() || u.email || String(u.id))
                        : (Number(mid) === Number(currentUserId) ? (currentUserName || `User ${mid}`) : String(mid));
                      return (
                        <MenuItem key={mid} value={mid}>
                          {label}
                        </MenuItem>
                      );
                    })
                  ) : (
                    <MenuItem disabled value="">No members</MenuItem>
                  )}
                </Select>
              </FormControl>
              {!isNew && (
                <Button variant="outlined" onClick={handleChangeOwner} disabled={!selectedNewOwner || selectedNewOwner === group.ownerId}>
                  Change Owner
                </Button>
              )}
            </Box>
          </>
        )}

     
        <Box display="flex" gap={2}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Create Group" : "Save Changes"}
          </Button>
          {!isNew && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          )}
          <Button variant="outlined" onClick={() => navigate("/groups")}>
            Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
