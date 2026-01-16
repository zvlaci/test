import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  InputAdornment,
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import VerifiedIcon from "@mui/icons-material/Verified";
import StarIcon from "@mui/icons-material/Star";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import api from "../api";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [displayedRestaurants, setDisplayedRestaurants] = useState([]);
  const [view, setView] = useState(() => {
    const appSettings = JSON.parse(localStorage.getItem("appSettings") || "{}");
    return appSettings.restaurantsViewMode || "grid";
  });
  const [loading, setLoading] = useState(true);


  const formatAddress = (restaurant) => {
    const parts = [];
    if (restaurant.address_line1) parts.push(restaurant.address_line1);
    else if (restaurant.address_line2) parts.push(restaurant.address_line2);
    if (restaurant.postcode) parts.push(restaurant.postcode);
    return parts.length > 0 ? parts.join(", ") : "Unknown address";
  };
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [fhrsFilter, setFhrsFilter] = useState("all");
  const [priceLevelFilter, setPriceLevelFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, restaurant: null });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 20;
  const navigate = useNavigate();
  const location = useLocation();

  const currentRole = (() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  })();
  const isReadOnlyUser = currentRole === 'user';

  const [initializedFromURL, setInitializedFromURL] = useState(false);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        let data = [];
        if (isReadOnlyUser) {
       
          const res = await api.get("/restaurants?limit=500&page=1");
          data = Array.isArray(res.data?.data) ? res.data.data : [];

        } else {
        
          const res = await api.get("/restaurants/admin/all");
          data = Array.isArray(res.data) ? res.data : [];
        }
        
        console.log("Total restaurants loaded (approved + pending):", data.length);
        console.log("Approved:", data.filter(r => r.status === 'approved').length);
        console.log("Pending:", data.filter(r => r.status === 'pending' || !r.status).length);
        
        setRestaurants(data);
        setFilteredRestaurants(data);
      } catch (err) {
        console.error("Error loading restaurants:", err);
        setRestaurants([]);
        setFilteredRestaurants([]);
      } finally {
        setLoading(false);
      }
    };
    loadRestaurants();
  }, [isReadOnlyUser]);

  
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const q = params.get('q') || "";
      const rating = params.get('rating') || 'all';
      const fhrs = params.get('fhrs') || 'all';
      const price = params.get('price') || 'all';
      const approval = params.get('approval') || 'all';
      const p = parseInt(params.get('page') || '1', 10);

      setSearchQuery(q);
      setSearchInput(q);
      setRatingFilter(rating);
      setFhrsFilter(fhrs);
      setPriceLevelFilter(price);
      setApprovalFilter(approval);
      setPage(isNaN(p) ? 1 : p);
    } catch (err) {
      console.error('Error parsing URL params for filters:', err);
    } finally {
      setInitializedFromURL(true);
    }
  }, []);


  useEffect(() => {
    if (!initializedFromURL) return;
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (ratingFilter && ratingFilter !== 'all') params.set('rating', ratingFilter);
    if (fhrsFilter && fhrsFilter !== 'all') params.set('fhrs', fhrsFilter);
    if (priceLevelFilter && priceLevelFilter !== 'all') params.set('price', priceLevelFilter);
    if (approvalFilter && approvalFilter !== 'all') params.set('approval', approvalFilter);
    if (page && page > 1) params.set('page', String(page));

    const search = params.toString() ? `?${params.toString()}` : '';

    navigate(`${location.pathname}${search}`, { replace: true });

  }, [searchQuery, ratingFilter, fhrsFilter, priceLevelFilter, approvalFilter, page, initializedFromURL]);


  useEffect(() => {
    let filtered = [...restaurants];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.address_line1?.toLowerCase().includes(q) ||
          r.address_line2?.toLowerCase().includes(q) ||
          r.postcode?.toLowerCase().includes(q)
      );
    }

    if (ratingFilter !== "all") {
      const exactRating = parseInt(ratingFilter);
      filtered = filtered.filter((r) => {
        const restaurantRating = Math.round(parseFloat(r.rating));
        return !isNaN(restaurantRating) && restaurantRating === exactRating;
      });
    }


    if (fhrsFilter !== "all") {
      filtered = filtered.filter((r) => {
        if (!r.fhrs_rating) return false;
        const fhrsRatingValue = r.fhrs_rating.toLowerCase();
        return fhrsRatingValue === fhrsFilter;
      });
    }


    if (priceLevelFilter !== "all") {
      const priceLevel = parseInt(priceLevelFilter);
      filtered = filtered.filter((r) => parseInt(r.price_level) === priceLevel);
    }


    if (approvalFilter !== "all") {
      if (approvalFilter === "approved") {
        filtered = filtered.filter((r) => r.status === 'approved');
      } else if (approvalFilter === "pending") {
        filtered = filtered.filter((r) => r.status === 'pending' || !r.status);
      }
    }

    setFilteredRestaurants(filtered);
    setPage(1); 
  }, [searchQuery, ratingFilter, fhrsFilter, priceLevelFilter, approvalFilter, restaurants]);


  useEffect(() => {
    const newDisplayed = filteredRestaurants.slice(0, page * itemsPerPage);
    console.log("Displaying restaurants:", newDisplayed.length, "of", filteredRestaurants.length, "(page:", page, ")");
    console.log(newDisplayed);
    setDisplayedRestaurants(newDisplayed);
    setHasMore(newDisplayed.length < filteredRestaurants.length);
    setLoadingMore(false);
  }, [filteredRestaurants, page, itemsPerPage]);


  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      
      if (distanceFromBottom < 500 && hasMore && !loading && !loadingMore) {
        console.log("Loading next page..., current page:", page);
        setLoadingMore(true);
        setPage(prev => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadingMore, page]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setRatingFilter("all");
    setFhrsFilter("all");
    setPriceLevelFilter("all");
    setApprovalFilter("all");
  }, []);

  const applySearch = useCallback(() => {
    const next = (searchInput || "").trim();
    setSearchQuery(next);
  }, [searchInput]);

  const handleDeleteClick = useCallback((restaurant) => {
    setDeleteDialog({ open: true, restaurant });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.restaurant) return;

    try {
      await api.delete(`/restaurants/${deleteDialog.restaurant.id}`);
      setRestaurants((prev) => prev.filter((r) => r.id !== deleteDialog.restaurant.id));
      setDeleteDialog({ open: false, restaurant: null });
    } catch (err) {
      console.error("Error deleting restaurant:", err);
      alert("Failed to delete restaurant");
    }
  }, [deleteDialog.restaurant]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ open: false, restaurant: null });
  }, []);

  const handleViewChange = useCallback((_e, nextView) => {
    if (nextView) {
      setView(nextView);
   
      const appSettings = JSON.parse(localStorage.getItem("appSettings") || "{}");
      appSettings.restaurantsViewMode = nextView;
      localStorage.setItem("appSettings", JSON.stringify(appSettings));
    }
  }, []);


  const content = useMemo(() => {
    if (loading) {
      return <Typography color="text.secondary">Loading...</Typography>;
    }

    if (filteredRestaurants.length === 0) {
      return (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography color="text.secondary">
            {restaurants.length === 0
              ? "No restaurants found."
              : "No restaurants match your filters."}
          </Typography>
        </Box>
      );
    }

    const grid = (
      <>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(5, 1fr)",
            },
            gap: 2.5,
            gridAutoRows: "1fr",
          }}
        >
          {displayedRestaurants.map((r) => (
            <Card
              key={r.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: 3,
                "&:hover": {
                  boxShadow: 8,
                  transform: "translateY(-6px)",
                },
                transition: "all 0.3s ease",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  cursor: !isReadOnlyUser ? "pointer" : "default",
                }}
                onClick={
                  !isReadOnlyUser
                    ? () =>
                        navigate(`/restaurants/${r.id}`, {
                          state: { returnTo: location.search },
                        })
                    : undefined
                }
              >
                <CardMedia
                  component="img"
                  height="180"
                  image={
                    Array.isArray(r.images) && r.images.length > 0
                      ? r.images[0]
                      : "https://placehold.co/400x300?text=No+Image"
                  }
                  alt={r.name}
                  sx={{ objectFit: "cover" }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)",
                  }}
                />
                {r.verified && (
                  <Chip
                    icon={<VerifiedIcon />}
                    label="Verified"
                    color="success"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      backgroundColor: "#4CAF50",
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                )}
                {(r.status === "pending" || !r.status) && (
                  <Chip
                    label="Pending Approval"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      backgroundColor: "#ff9800",
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>

              <CardContent
                sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    mb: 1.5,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color="primary"
                    sx={{
                      textDecoration: "none",
                      cursor: !isReadOnlyUser ? "pointer" : "default",
                      "&:hover": {
                        textDecoration: !isReadOnlyUser ? "underline" : "none",
                      },
                      flex: 1,
                      fontSize: "1rem",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                    onClick={
                      !isReadOnlyUser
                        ? () =>
                            navigate(`/restaurants/${r.id}`, {
                              state: { returnTo: location.search },
                            })
                        : undefined
                    }
                  >
                    {r.name}
                  </Typography>
                  {!isReadOnlyUser && (
                    <Box sx={{ display: "flex", gap: 0.5, ml: 1 }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() =>
                          navigate(`/restaurants/${r.id}`, {
                            state: { returnTo: location.search },
                          })
                        }
                        sx={{
                          "&:hover": {
                            backgroundColor: "primary.light",
                            color: "white",
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(r)}
                        sx={{
                          "&:hover": {
                            backgroundColor: "error.light",
                            color: "white",
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                  mb={1.5}
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.type || "Unknown Cuisine"}
                </Typography>

                <Box sx={{ display: "flex", gap: 0.5, mb: 1.5, flexWrap: "wrap" }}>
                  <Chip
                    icon={<StarIcon />}
                    label={typeof r.rating === "number" ? r.rating.toFixed(1) : "N/A"}
                    size="small"
                    sx={{
                      backgroundColor: "#ffd700",
                      color: "#000",
                      fontWeight: 600,
                    }}
                  />
                  {r.price_level && (
                    <Chip
                      label={"$".repeat(parseInt(r.price_level))}
                      size="small"
                      sx={{
                        backgroundColor: "#e3f2fd",
                        color: "#1976d2",
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <LocationOnIcon
                      fontSize="small"
                      sx={{ color: "#1976d2", flexShrink: 0 }}
                    />{" "}
                    {formatAddress(r)}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <AccessTimeIcon fontSize="small" sx={{ flexShrink: 0 }} />
                    {r.updated_at
                      ? new Date(r.updated_at).toLocaleDateString()
                      : "N/A"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {hasMore && !loadingMore && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Scroll down to load more...
            </Typography>
          </Box>
        )}
        {loadingMore && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={30} />
          </Box>
        )}
      </>
    );

    const list = (
      <>
        <Box>
          {displayedRestaurants.map((r) => (
            <Paper
              key={r.id}
              elevation={2}
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2.5,
                borderRadius: 3,
                p: 2.5,
                border: "1px solid",
                borderColor: "divider",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: 6,
                  transform: "translateX(4px)",
                },
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  flexShrink: 0,
                  mr: 3,
                  cursor: !isReadOnlyUser ? "pointer" : "default",
                }}
                onClick={
                  !isReadOnlyUser
                    ? () =>
                        navigate(`/restaurants/${r.id}`, {
                          state: { returnTo: location.search },
                        })
                    : undefined
                }
              >
                <img
                  src={
                    Array.isArray(r.images) && r.images.length > 0
                      ? r.images[0]
                      : "https://placehold.co/400x300?text=No+Image"
                  }
                  alt={r.name}
                  width={140}
                  height={140}
                  style={{
                    borderRadius: 12,
                    objectFit: "cover",
                  }}
                />
                {r.verified && (
                  <Chip
                    icon={<VerifiedIcon />}
                    label="Verified"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "#4CAF50",
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>

              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  {isReadOnlyUser ? (
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color="primary"
                      sx={{ textDecoration: "none" }}
                    >
                      {r.name}
                    </Typography>
                  ) : (
                    <Typography
                      component={Link}
                      to={`/restaurants/${r.id}`}
                      variant="h5"
                      fontWeight={700}
                      color="primary"
                      sx={{
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {r.name}
                    </Typography>
                  )}
                  {(r.status === "pending" || !r.status) && (
                    <Chip
                      label="Pending Approval"
                      size="small"
                      sx={{
                        backgroundColor: "#ff9800",
                        color: "white",
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  <Chip
                    icon={<StarIcon />}
                    label={typeof r.rating === "number" ? r.rating.toFixed(1) : "N/A"}
                    size="small"
                    sx={{
                      backgroundColor: "#ffd700",
                      color: "#000",
                      fontWeight: 600,
                    }}
                  />
                  {r.price_level && (
                    <Chip
                      label={"$".repeat(parseInt(r.price_level))}
                      size="small"
                      sx={{
                        backgroundColor: "#e3f2fd",
                        color: "#1976d2",
                        fontWeight: 600,
                      }}
                    />
                  )}
                  <Typography variant="body1" color="text.secondary" fontWeight={500}>
                    {r.type || "Unknown Cuisine"}
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <LocationOnIcon fontSize="small" sx={{ color: "#1976d2" }} />
                  {formatAddress(r)}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <AccessTimeIcon fontSize="small" />
                  Last updated:{" "}
                  {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "N/A"}
                </Typography>
              </Box>

              {!isReadOnlyUser && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, ml: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() =>
                      navigate(`/restaurants/${r.id}`, {
                        state: { returnTo: location.search },
                      })
                    }
                    sx={{ minWidth: 120 }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteClick(r)}
                    sx={{ minWidth: 120 }}
                  >
                    Delete
                  </Button>
                </Box>
              )}
            </Paper>
          ))}
        </Box>

        {hasMore && !loadingMore && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Scroll down to load more...
            </Typography>
          </Box>
        )}
        {loadingMore && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={30} />
          </Box>
        )}
      </>
    );

    return view === "grid" ? grid : list;
  }, [
    loading,
    filteredRestaurants.length,
    restaurants.length,
    view,
    displayedRestaurants,
    hasMore,
    loadingMore,
    isReadOnlyUser,
    navigate,
    location.search,
    handleDeleteClick,
  ]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600} sx={{ mb: 0.5 }}>
            Restaurants
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Showing {displayedRestaurants.length} of {filteredRestaurants.length} restaurants
            {filteredRestaurants.length !== restaurants.length && ` (filtered from ${restaurants.length} total)`}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {!isReadOnlyUser && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate("/restaurants/new")}
            >
              Add Restaurant
            </Button>
          )}

          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={handleViewChange}
            aria-label="view mode"
          >
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title="List View">
                <ViewListIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="grid" aria-label="grid view">
              <Tooltip title="Grid View">
                <ViewModuleIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <FilterListIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Filters
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearFilters}
            disabled={
              searchInput === "" &&
              ratingFilter === "all" &&
              fhrsFilter === "all" &&
              priceLevelFilter === "all" &&
              approvalFilter === "all"
            }
          >
            Clear Filters
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
            placeholder="Search by name, address..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 250 }}
          />
          <TextField
            select
            label="Rating"
            variant="outlined"
            size="small"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">All Ratings</MenuItem>
            <MenuItem value="5">⭐⭐⭐⭐⭐ 5 Stars</MenuItem>
            <MenuItem value="4">⭐⭐⭐⭐ 4 Stars</MenuItem>
            <MenuItem value="3">⭐⭐⭐ 3 Stars</MenuItem>
            <MenuItem value="2">⭐⭐ 2 Stars</MenuItem>
            <MenuItem value="1">⭐ 1 Star</MenuItem>
          </TextField>
          <TextField
            select
            label="Hygiene Rating"
            variant="outlined"
            size="small"
            value={fhrsFilter}
            onChange={(e) => setFhrsFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All FHRS Ratings</MenuItem>
            <MenuItem value="fhrs_5_en-gb">⭐⭐⭐⭐⭐ 5 - Very Good</MenuItem>
            <MenuItem value="fhrs_4_en-gb">⭐⭐⭐⭐ 4 - Good</MenuItem>
            <MenuItem value="fhrs_3_en-gb">⭐⭐⭐ 3 - Satisfactory</MenuItem>
            <MenuItem value="fhrs_2_en-gb">⭐⭐ 2 - Improvement</MenuItem>
            <MenuItem value="fhrs_1_en-gb">⭐ 1 - Major Improvement</MenuItem>
            <MenuItem value="fhrs_0_en-gb">0 - Urgent Improvement</MenuItem>
            <MenuItem value="fhrs_awaitinginspection_en-gb">⏳ Awaiting Inspection</MenuItem>
            <MenuItem value="fhrs_exempt_en-gb">Exempt</MenuItem>
          </TextField>
          <TextField
            select
            label="Price Level"
            variant="outlined"
            size="small"
            value={priceLevelFilter}
            onChange={(e) => setPriceLevelFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">All Prices</MenuItem>
            <MenuItem value="1">$ Budget</MenuItem>
            <MenuItem value="2">$$ Moderate</MenuItem>
            <MenuItem value="3">$$$ Expensive</MenuItem>
            <MenuItem value="4">$$$$ Luxury</MenuItem>
          </TextField>
          <TextField
            select
            label="Approval Status"
            variant="outlined"
            size="small"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="approved">✓ Approved</MenuItem>
            <MenuItem value="pending">⏳ Pending</MenuItem>
          </TextField>

          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={applySearch}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Filter
          </Button>
        </Box>
      </Paper>


      {content}


      {!isReadOnlyUser && (
        <Dialog
          open={deleteDialog.open}
          onClose={handleDeleteCancel}
        >
          <DialogTitle>Delete Restaurant</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{deleteDialog.restaurant?.name}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
