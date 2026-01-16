import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import GroupIcon from "@mui/icons-material/Group";
import GroupsIcon from "@mui/icons-material/Groups";
import SettingsIcon from "@mui/icons-material/Settings";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import LogoutIcon from "@mui/icons-material/Logout";
import api from "../api";

const drawerWidth = 240;

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [appName, setAppName] = useState("Diner FF");

  const role = (() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  })();

  // 1. Fetch API (or fallback to localStorage)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/settings");
        const name = res.data.platformName || "Diner FF";
        setAppName(name);
        localStorage.setItem("appSettings", JSON.stringify(res.data));
      } catch {
        console.warn("Using cached settings");
        const cached = JSON.parse(localStorage.getItem("appSettings"));
        if (cached?.platformName) setAppName(cached.platformName);
      }
    };
    fetchSettings();
  }, []);

  // 2. listen changes in localStorage (when save in SettingsPage)
  useEffect(() => {
    const handleStorageChange = () => {
      const updated = JSON.parse(localStorage.getItem("appSettings"))?.platformName;
      setAppName(updated || "Diner FF");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const menuItems = (() => {
    // User role: only self-management
    if (role === 'user') {
      return [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Restaurants', icon: <RestaurantIcon />, path: '/restaurants' },
        { text: 'Groups', icon: <GroupsIcon />, path: '/groups' },
        { text: 'Users', icon: <GroupIcon />, path: '/users' },
      ];
    }

    // Restaurant role: staff pages (no admin-only)
    if (role === 'restaurant') {
      return [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Restaurants', icon: <RestaurantIcon />, path: '/restaurants' },
        { text: 'Groups', icon: <GroupsIcon />, path: '/groups' },
      ];
    }

    // Admin: full menu
    return [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Restaurants', icon: <RestaurantIcon />, path: '/restaurants' },
      { text: 'Groups', icon: <GroupsIcon />, path: '/groups' },
      { text: 'Users', icon: <GroupIcon />, path: '/users' },
      { text: 'Import', icon: <UploadFileIcon />, path: '/import' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ];
  })();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar fix */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#1e1e2f",
            color: "#fff",
            borderRight: "none",
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            {appName}
          </Typography>
        </Toolbar>

        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  color: "inherit",
                  "&.Mui-selected": {
                    backgroundColor: "#2a2a40",
                    borderLeft: "4px solid #4f9cff",
                  },
                  "&:hover": {
                    backgroundColor: "#2a2a40",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* bottom separator + logout */}
        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ backgroundColor: "#2a2a40" }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          backgroundColor: "#f5f6fa",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
