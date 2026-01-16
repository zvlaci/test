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
  Chip,
  Paper,
  Divider,
  Autocomplete,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "../api";
import AllergyAutocomplete from "../components/AllergyAutocomplete";

export default function UserEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const current = (() => {
    const token = localStorage.getItem('token');
    if (!token) return { id: null, role: null };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const uid = payload.userId || payload.id || payload.sub || null;
      return { id: uid != null ? Number(uid) : null, role: payload.role || null };
    } catch {
      return { id: null, role: null };
    }
  })();

  const [user, setUser] = useState({
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
    allergies: [],
    role: "user",
    groupIds: [],
    password: "",
    confirmPassword: "",
  });

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadUser = async () => {
    try {
      const res = await api.get(`/users/${id}`);
      const u = res.data;
      console.log("Loaded user:", u);

      setUser({
        ...u,
        allergies: Array.isArray(u.allergies)
          ? u.allergies
          : u.allergies
          ? u.allergies.split(",").map((a) => a.trim()).filter(Boolean)
          : [],
        groupIds: u.groups ? u.groups.map((g) => g.id) : [],
        first_name: (u.first_name || "").toString(),
        last_name: (u.last_name || "").toString(),
      });
    } catch (err) {
      console.error("Error loading user:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await api.get("/groups?limit=1000");
      console.log("Groups response:", res.data);
      
    
      const groupsData = res.data.data 
        ? res.data.data 
        : Array.isArray(res.data) 
          ? res.data  
          : [];
      
      setGroups(groupsData);
    } catch (err) {
      console.error("Error loading groups:", err);
      setGroups([]);
    }
  };

  const handleSave = async () => {
    try {

      if (!user.email || !String(user.email).includes('@')) {
        alert('Email is required and must be valid.');
        return;
      }


      if (!user.phone || user.phone.trim().length < 5) {
        alert("Phone is required and must be valid.");
        return;
      }


      if (isNew) {
        if (!user.password || user.password.length < 6) {
          alert("Password must be at least 6 characters.");
          return;
        }
        if (user.password !== user.confirmPassword) {
          alert("Passwords do not match.");
          return;
        }
      }

      setSaving(true);

      const payload = {
        ...user,
        allergies: Array.isArray(user.allergies)
          ? user.allergies
          : user.allergies,
      };


      if (!isNew) {
        delete payload.password;
        delete payload.confirmPassword;
      }

      if (isNew) {
        await api.post("/users", payload);
        alert("User created successfully!");
      } else {
        await api.patch(`/users/${id}`, payload);
        alert("User updated successfully!");
      }

      navigate("/users");
    } catch (err) {
      console.error("Error saving user:", err);
      alert("Error saving user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setDeleting(true);
      await api.delete(`/users/${id}`);
      alert("User deleted.");
      navigate("/users");
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Error deleting user.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {

    if (current.role === 'user') {
      if (isNew || (current.id != null && Number(id) !== Number(current.id))) {
        navigate(`/users/${current.id}`, { replace: true });
        return;
      }
    }
    loadGroups();
    if (!isNew) loadUser();

  }, [id]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ backgroundColor: "#f5f6fa", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          {/* {isNew ? <PersonAddIcon sx={{ fontSize: 40, color: "primary.main" }} /> : null} */}
          <Typography variant="h4" fontWeight={700}>
            {isNew ? "Add New User" : "Edit User"}
          </Typography>
        </Box>

        <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            User Information
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
         
            <Box sx={{ display: "flex", gap: 3 }}>
              <TextField
                label="Email"
                fullWidth
                required
                type="email"
                value={user.email || ""}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
              />
              <TextField
                label="Phone"
                fullWidth
                required
                value={user.phone || ""}
                onChange={(e) => setUser({ ...user, phone: e.target.value })}
                placeholder="Phone number"
              />
            </Box>

         
            <Box sx={{ display: "flex", gap: 3 }}>
              <TextField
                label="First Name"
                fullWidth
                value={user.first_name || ""}
                onChange={(e) => setUser({ ...user, first_name: e.target.value })}
                placeholder="First name"
              />
              <TextField
                label="Last Name"
                fullWidth
                value={user.last_name || ""}
                onChange={(e) => setUser({ ...user, last_name: e.target.value })}
                placeholder="Last name"
              />
            </Box>

         
            {isNew && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" fontWeight={600} mb={1}>
                  Password
                </Typography>
                <Box sx={{ display: "flex", gap: 3 }}>
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    required
                    value={user.password}
                    onChange={(e) => setUser({ ...user, password: e.target.value })}
                    helperText="Minimum 6 characters"
                  />
                  <TextField
                    label="Confirm Password"
                    type="password"
                    fullWidth
                    required
                    value={user.confirmPassword}
                    onChange={(e) =>
                      setUser({ ...user, confirmPassword: e.target.value })
                    }
                  />
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" fontWeight={600} mb={1}>
              Preferences & Access
            </Typography>

           
            <AllergyAutocomplete
              value={user.allergies}
              onChange={(newAllergies) =>
                setUser({ ...user, allergies: newAllergies })
              }
              label="Allergies"
              placeholder="Select allergies"
            />

          
            <Autocomplete
              multiple
              options={groups}
              getOptionLabel={(option) => option?.name || String(option?.id || "")}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              value={user.groupIds
                .map((gid) => groups.find((g) => g.id === gid))
                .filter(Boolean)}
              onChange={(_event, newValue) =>
                setUser({ ...user, groupIds: newValue.map((g) => g.id) })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Groups"
                  placeholder="Select groups"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />

         
            <Box sx={{ display: "flex", gap: 3 }}>
              <TextField
                select
                label="Role"
                fullWidth
                value={user.role}
                onChange={(e) => setUser({ ...user, role: e.target.value })}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="restaurant">Restaurant</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Box>

            <Divider sx={{ my: 2 }} />

           
            <Box display="flex" gap={2} justifyContent="space-between">
              <Box display="flex" gap={2}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleSave} 
                  disabled={saving}
                  //startIcon={isNew ? <PersonAddIcon /> : <SaveIcon />}
                  size="large"
                >
                  {saving ? "Saving..." : isNew ? "Create User" : "Save Changes"}
                </Button>
                {!isNew && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDelete}
                    disabled={deleting}
                    startIcon={<DeleteIcon />}
                    size="large"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </Box>
              
              <Button 
                variant="outlined" 
                onClick={() => navigate("/users")}
                startIcon={<ArrowBackIcon />}
                size="large"
              >
                Back
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
