import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Paper,
  Grid,
  Divider,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LanguageIcon from "@mui/icons-material/Language";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api";
import AllergyAutocomplete from "../components/AllergyAutocomplete";

const CUISINE_PRESETS = [
  "Mediterranean",
  "Italian",
  "Indian",
  "Chinese",
  "Vegetarian",
];

const findCuisinePreset = (raw) => {
  const s = (raw ?? "").toString().trim();
  if (!s) return null;
  return (
    CUISINE_PRESETS.find((c) => c.toLowerCase() === s.toLowerCase()) || null
  );
};

const splitTypeToUi = (typeValue) => {
  const s = (typeValue ?? "").toString().trim();
  const preset = findCuisinePreset(s);
  if (preset) return { typePreset: preset, typeOther: "" };
  if (s) return { typePreset: "Other", typeOther: s };
  return { typePreset: "", typeOther: "" };
};

const composeTypeForSave = (typePreset, typeOther) => {
  const preset = (typePreset ?? "").toString().trim();
  if (!preset) return "";
  if (preset !== "Other") return preset;
  return (typeOther ?? "").toString().trim();
};

export default function RestaurantEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === "new";

  const [restaurant, setRestaurant] = useState({
    name: "",
    address_line1: "",
    address_line2: "",
    town: "",
    city: "",
    postcode: "",
    email: "",
    website: "",
    phone: "",
    type: "",
    typePreset: "",
    typeOther: "",
    price_level: 2,
    rating: 0,
    badges: [],
    open_hours: "",
    lat: "",
    lng: "",
    place_id: "",
    images: [],
    allergy_filter: [],
    fhrs_rating: "",
    fhrs_rating_date: null,
  });

  const ratingIcons = import.meta.glob('../assets/ratings/*.svg', { eager: true, as: 'url' });

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [fetchingPlaceData, setFetchingPlaceData] = useState(false);
  const [successDialog, setSuccessDialog] = useState({ open: false, fields: [] });

  const weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const [openHoursMap, setOpenHoursMap] = useState(() => {
    const m = {};
    weekdays.forEach((d) => (m[d] = { closed: false, open: '', close: '' }));
    return m;
  });

  const openHoursArrayToMap = (arr) => {
    const m = {};
    weekdays.forEach((d) => (m[d] = { closed: false, open: '', close: '' }));
    if (!arr) return m;
    if (Array.isArray(arr)) {
      arr.forEach((entry, idx) => {
        if (!entry) return;
        const s = String(entry).trim();

        const matchedDay = weekdays.find((d) => s.toLowerCase().startsWith(d.toLowerCase() + ':'));
        let rest = s;
        let targetDay = weekdays[idx];
        if (matchedDay) {
          targetDay = matchedDay;
          rest = s.slice(matchedDay.length + 1).trim();
        }
     
        if (/closed/i.test(rest)) {
          m[targetDay] = { closed: true, open: '', close: '' };
        } else {
        
          const parts = rest.split(/\s*(?:-|–|—|to)\s*/i);
          const a = parts[0] ? parts[0].trim() : '';
          const b = parts[1] ? parts[1].trim() : '';
          m[targetDay] = { closed: false, open: a, close: b };
        }
      });
    } else if (typeof arr === 'string') {
    
      const s = String(arr).trim();
      if (!s) return m;
      if (/closed/i.test(s)) m[weekdays[0]] = { closed: true, open: '', close: '' };
      else {
        const parts = s.split(/\s*(?:-|–|—|to)\s*/i);
        m[weekdays[0]] = { closed: false, open: parts[0] ? parts[0].trim() : '', close: parts[1] ? parts[1].trim() : '' };
      }
    }
    return m;
  };

  const openHoursMapToArray = (map) => {
    return weekdays.map((d) => {
      const raw = map?.[d];
      const v = (raw && typeof raw === 'object') ? raw : { closed: false, open: '', close: '' };
      if (v.closed) return `${d}: Closed`;
      if (v.open && v.close) return `${d}: ${v.open} - ${v.close}`;
      if (v.open) return `${d}: ${v.open}`;
      return `${d}:`;
    });
  };

  const timeOptions = (() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
        opts.push(label);
      }
    }
    return opts;
  })();

 
  useEffect(() => {
    setOpenHoursMap(openHoursArrayToMap(restaurant.open_hours));
   
  }, [restaurant.open_hours]);

  useEffect(() => {
    if (!id || id === "new") {
      setLoading(false);
      return;
    }
    loadRestaurant();
 
  }, [id]);

  const loadRestaurant = async () => {
    if (!id || id === "new") return;
    try {
      setLoading(true);
      const res = await api.get(`/restaurants/${id}`);
      const r = res.data;
      console.log("Restaurant data:", r);
      console.log("status value:", r.status);
      
      setRestaurant({
        ...r,
        ...(splitTypeToUi(r.type)),
        fhrs_rating: r.fhrs_rating ? r.fhrs_rating.toLowerCase() : "",
        allergy_filter: Array.isArray(r.allergy_filter)
          ? r.allergy_filter
          : r.allergy_filter
          ? r.allergy_filter.split(",").map((a) => a.trim()).filter(Boolean)
          : [],
      });
      
    
      const pendingStatus = r.status === 'pending' || !r.status;
      
      console.log("Setting isPending to:", pendingStatus);
      setIsPending(pendingStatus);
    } catch (err) {
      console.error("Error loading restaurant:", err);
    } finally {
      setLoading(false);
    }
  };


  const handleChange = (field, value) => {
    setRestaurant((prev) => ({ ...prev, [field]: value }));
  };

  const handleApprove = async () => {
    try {
      await api.patch(`/restaurants/${id}/approve`);
      alert("Restaurant approved!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error approving restaurant:", err);
      alert("Failed to approve restaurant");
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Are you sure you want to reject this restaurant?")) {
      return;
    }
    try {
      await api.delete(`/restaurants/${id}`);
      alert("Restaurant rejected and deleted");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error rejecting restaurant:", err);
      alert("Failed to reject restaurant");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${restaurant.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/restaurants/${id}`);
      alert("Restaurant deleted successfully");
      const returnTo = location.state?.returnTo || location.search || "";
      navigate(`/restaurants${returnTo}`);
    } catch (err) {
      console.error("Error deleting restaurant:", err);
      alert("Failed to delete restaurant");
    }
  };

  const handleFetchPlaceData = async () => {
   
    if (!restaurant.name || !restaurant.name.trim()) {
      alert("Please enter Business Name first!");
      return;
    }
    
    if (!restaurant.postcode || !restaurant.postcode.trim()) {
      alert("Please enter Postcode first!\n\nIn the UK, postcodes are essential for accurate location.");
      return;
    }

    try {
      setFetchingPlaceData(true);
   
      const queryParts = [restaurant.name];
      
      if (restaurant.address_line1?.trim()) {
        queryParts.push(restaurant.address_line1.trim());
      }
      
      const townTrimmed = restaurant.town?.trim();
      const cityTrimmed = restaurant.city?.trim();
      
    
      if (townTrimmed && townTrimmed.toLowerCase() !== cityTrimmed?.toLowerCase()) {
        queryParts.push(townTrimmed);
      }
      

      if (cityTrimmed) {
        queryParts.push(cityTrimmed);
      }
      
     
      queryParts.push(`${restaurant.postcode.trim()}`);
      
      const searchQuery = queryParts.join(", ");
      
      console.log("Searching Google Places with query:", searchQuery);
      console.log("Checking cache first, then Google Places API if needed");
      console.log("Full API URL:", `/restaurants/google-places/search?query=${encodeURIComponent(searchQuery)}&useCache=true`);
      
   
      const res = await api.get(`/restaurants/google-places/search`, {
        params: { 
          query: searchQuery,
          useCache: true 
        }
      });

      console.log("Google Places API response:", res.data);
      

      if (res.data?.fromCache) {
        console.log("Data loaded from cache (saved API call)");
      } else {
        console.log("Data fetched from Google Places API and cached for future use");
      }

      if (res.data && res.data.success && res.data.data) {
      
        const placeData = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
        
        if (!placeData) {
          alert("No results found for this search.\n\nQuery used: " + searchQuery);
          return;
        }

    
        const updatedFields = [];
        if (placeData.place_id) updatedFields.push('Place ID');
        if (placeData.website) updatedFields.push('Website');
        if (placeData.phone) updatedFields.push('Phone');
        if (placeData.rating !== undefined) updatedFields.push('Rating');
        if (placeData.price_level !== undefined) updatedFields.push('Price Level');
        if (placeData.lat !== undefined && placeData.lng !== undefined) updatedFields.push('Coordinates');

     
        const hasNewStructure = placeData.address_line1 || placeData.postcode;
        const hasOldStructure = placeData.business_address || placeData.post_code;

        if (hasNewStructure || hasOldStructure) {
          updatedFields.push('Address');
        }
        if (placeData.types?.[0]) updatedFields.push('Type');

       
        let addressUpdates = {};

        if (hasNewStructure) {
    
          addressUpdates = {
            address_line1: placeData.address_line1 || restaurant.address_line1,
            address_line2: placeData.address_line2 || restaurant.address_line2,
            town: placeData.town || restaurant.town,
            city: placeData.city || restaurant.city,
            postcode: placeData.postcode || restaurant.postcode,
          };
        } else if (hasOldStructure) {
        
          addressUpdates = {
            address_line1: placeData.business_address || restaurant.address_line1,
            address_line2: restaurant.address_line2, 
            town: restaurant.town, 
            city: restaurant.city, 
            postcode: placeData.post_code || restaurant.postcode,
          };
        }

        let photoUrl = null;
        let additionalWebsite = placeData.website;
        let additionalPhone = placeData.phone;
    
        let openingHours = null;
        let photosArray = [];

        if (placeData.place_id) {
          try {
            console.log("Fetching additional details for place_id:", placeData.place_id);
            
    
            const detailsRes = await api.get(`/restaurants/google-places/details`, {
              params: { 
                place_id: placeData.place_id,
                fields: 'name,photos,website,formatted_phone_number'
              }
            });

            console.log("Place Details response:", detailsRes.data);

            const detailsData = detailsRes.data?.data;
            
         
            if (detailsData?.website && !additionalWebsite) {
              additionalWebsite = detailsData.website;
              console.log("Website from details:", additionalWebsite);
            }
            
          
            if (detailsData?.formatted_phone_number && !additionalPhone) {
              additionalPhone = detailsData.formatted_phone_number;
              console.log("Phone from details:", additionalPhone);
            }

         
            if (detailsData?.photos?.[0]?.photo_reference) {
              const photoReference = detailsData.photos[0].photo_reference;
              console.log("Photo reference:", photoReference);

              // Get photo URL
              const photoRes = await api.get(`/restaurants/google-places/photo`, {
                params: {
                  photo_reference: photoReference,
                  maxwidth: 800
                }
              });

              console.log("Photo URL response:", photoRes.data);

              if (photoRes.data?.success && photoRes.data?.url) {
                photoUrl = photoRes.data.url;
                console.log("Photo URL obtained:", photoUrl);
              }
            } else {
              console.log("No photos available for this place");
            }
        
            if (detailsData?.opening_hours) {
           
              openingHours = detailsData.opening_hours.weekday_text || detailsData.opening_hours || null;
              console.log("Opening hours from details:", openingHours);
            }
          
            if (detailsData?.photos && Array.isArray(detailsData.photos) && detailsData.photos.length > 0) {
          
              photosArray = detailsData.photos.map((p) => p.photo_reference || null).filter(Boolean);
              console.log("Photos references from details:", photosArray);
            }
          } catch (photoErr) {
            console.error("Error fetching additional details:", photoErr);
  
          }
        }

   
        if (additionalWebsite && additionalWebsite !== restaurant.website) {
          if (!updatedFields.includes('Website')) updatedFields.push('Website');
        }
        if (additionalPhone && additionalPhone !== restaurant.phone) {
          if (!updatedFields.includes('Phone')) updatedFields.push('Phone');
        }
        if (photoUrl) {
          updatedFields.push('Photo');
        }
        if (openingHours) {
          updatedFields.push('Open Hours');
        }
        if (photosArray && photosArray.length > 0) {
          updatedFields.push('Photos');
        }

     
        setRestaurant(prev => ({
          ...prev,
          place_id: placeData.place_id || prev.place_id,
          website: additionalWebsite || prev.website,
          phone: additionalPhone || prev.phone,
          rating: placeData.rating !== undefined ? placeData.rating : prev.rating,
          price_level: placeData.price_level !== undefined ? placeData.price_level : prev.price_level,
          lat: placeData.lat !== undefined ? placeData.lat : prev.lat,
          lng: placeData.lng !== undefined ? placeData.lng : prev.lng,
          ...addressUpdates,
          type: placeData.types?.[0] || prev.type,
          ...(splitTypeToUi(placeData.types?.[0] || prev.type)),
          images: photoUrl ? [photoUrl, ...(prev.images || []).filter(img => img !== photoUrl)] : prev.images,
          open_hours: openingHours || prev.open_hours,
          photos: (photosArray && photosArray.length > 0) ? photosArray : (prev.photos || (photoUrl ? [photoUrl] : [])),
        }));

        setSuccessDialog({ open: true, fields: updatedFields });

      } else {
        const message = res.data?.message || "Unknown error";
        alert(`${message}\n\nQuery used: ${searchQuery}\n\nTry:\nCheck spelling of business name\nVerify postcode is correct (e.g., SW1A 1AA)\nEnsure restaurant exists on Google Maps`);
      }
    } catch (err) {
      console.error("Error fetching place data:", err);
      console.error("Error response:", err.response?.data);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert("Failed to fetch data from Google Places.\n\nError: " + errorMsg);
    } finally {
      setFetchingPlaceData(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const typeValue = composeTypeForSave(
        restaurant.typePreset,
        restaurant.typeOther,
      );

      const { ...restaurantForSave } = restaurant;
      delete restaurantForSave.typePreset;
      delete restaurantForSave.typeOther;

   
      const payload = {
        ...restaurantForSave,
      
        email: restaurant.email || "",
        website: restaurant.website || "",
        phone: restaurant.phone || "",
        address_line1: restaurant.address_line1 || "",
        address_line2: restaurant.address_line2 || "",
        town: restaurant.town || "",
        city: restaurant.city || "",
        postcode: restaurant.postcode || "",
        place_id: restaurant.place_id || "",
        type: typeValue,

        badges: Array.isArray(restaurant.badges) ? restaurant.badges.filter(Boolean) : [],
        images: Array.isArray(restaurant.images) ? restaurant.images.filter(Boolean) : [],
        photos: Array.isArray(restaurant.photos) ? restaurant.photos.filter(Boolean) : [],
        dietary_flags: Array.isArray(restaurant.dietary_flags)
          ? restaurant.dietary_flags.filter(Boolean)
          : [],
        may_contain: Array.isArray(restaurant.may_contain)
          ? restaurant.may_contain.filter(Boolean)
          : [],
     
        allergy_filter: Array.isArray(restaurant.allergy_filter)
          ? restaurant.allergy_filter.filter(Boolean).join(', ')
          : (restaurant.allergy_filter || ''),
      };

      if (isNew) {
        await api.post('/restaurants', payload);
      } else {
        await api.put(`/restaurants/${id}`, payload);
      }

      const returnTo = location.state?.returnTo || location.search || "";
      navigate(`/restaurants${returnTo}`);
    } catch (err) {
      console.error('Error saving restaurant:', err);
      const message = err?.response?.data?.message || err?.message || 'Failed to save restaurant';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 5 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" fontWeight={700}>
            {isNew ? 'Add Restaurant' : (restaurant.name || 'Edit Restaurant')}
          </Typography>

          {!!restaurant.fhrs_rating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, backgroundColor: 'white', borderRadius: 2, boxShadow: 2 }}>
              {(() => {
                const key = `../assets/ratings/${restaurant.fhrs_rating ? restaurant.fhrs_rating.toLowerCase() : ''}.svg`;
                const src = ratingIcons[key] || null;
                if (!src) return null;
                return (
                  <img
                    src={src}
                    alt={`FHRS Rating ${restaurant.fhrs_rating}`}
                    style={{ height: 60, width: 'auto' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              })()}
              {restaurant.fhrs_rating_date && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Inspected: {new Date(restaurant.fhrs_rating_date).toLocaleDateString('en-GB')}
                </Typography>
              )}
            </Box>
          )}
        </Box>


        <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3, mb: 4 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Basic Information
          </Typography>
          
        
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Business Name"
              fullWidth
              required
              value={restaurant.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </Box>

       
          <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
            <TextField
              label="Email"
              type="email"
              sx={{ width: "50%" }}
              value={restaurant.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="email@example.com"
            />

            <TextField
              label="Website"
              sx={{ width: "50%" }}
              value={restaurant.website || ""}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://example.com"
              InputProps={{
                endAdornment: restaurant.website ? (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        const url = restaurant.website.startsWith('http')
                          ? restaurant.website
                          : `https://${restaurant.website}`;
                        window.open(url, "_blank");
                      }}
                      edge="end"
                      color="primary"
                    >
                      <LanguageIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>

      
          <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
            <TextField
              label="Phone"
              sx={{ width: "50%" }}
              value={restaurant.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="e.g., +44 20 7123 4567"
            />
            <TextField
              label="Type"
              select
              sx={{ width: "50%" }}
              value={restaurant.typePreset || ""}
              onChange={(e) =>
                setRestaurant((prev) => {
                  const nextPreset = e.target.value;
                  if (nextPreset === 'Other') {
                    return {
                      ...prev,
                      typePreset: 'Other',
                      type: prev.typeOther || prev.type || '',
                    };
                  }
                  return {
                    ...prev,
                    typePreset: nextPreset,
                    typeOther: '',
                    type: nextPreset,
                  };
                })
              }
            >
              {CUISINE_PRESETS.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
          </Box>

          {restaurant.typePreset === 'Other' && (
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Other type"
                fullWidth
                value={restaurant.typeOther || ''}
                onChange={(e) =>
                  setRestaurant((prev) => ({
                    ...prev,
                    typeOther: e.target.value,
                    type: e.target.value,
                  }))
                }
                placeholder="e.g., Coffee, Steakhouse, Sushi"
              />
            </Box>
          )}


          <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
            <TextField
              label="Rating"
              type="number"
              sx={{ width: "50%" }}
              value={restaurant.rating || ""}
              onChange={(e) => handleChange("rating", parseFloat(e.target.value))}
              inputProps={{ min: 0, max: 5, step: 0.1 }}
            />
            <TextField
              label="Price Level"
              type="number"
              sx={{ width: "50%" }}
              value={restaurant.price_level || ""}
              onChange={(e) => handleChange("price_level", parseInt(e.target.value))}
              inputProps={{ min: 1, max: 4 }}
            />
          </Box>


          <Box sx={{ mb: 3 }}>
            <AllergyAutocomplete
              value={restaurant.allergy_filter}
              onChange={(newAllergies) =>
                setRestaurant({ ...restaurant, allergy_filter: newAllergies })
              }
              label="Allergy Filter"
              placeholder="Select allergies"
            />
          </Box>


          <Box sx={{ mb: 3 }}>
            <TextField
              label="Image URLs"
              fullWidth
              multiline
              rows={2}
              value={restaurant.images?.join(", ") || ""}
              onChange={(e) =>
                handleChange(
                  "images",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
              placeholder="Comma-separated image URLs"
              InputProps={{
                endAdornment: Array.isArray(restaurant.images) && restaurant.images[0] ? (
                  <InputAdornment position="end">
                    <IconButton
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const raw = String(restaurant.images?.[0] || '').trim();
                        if (!raw) return;
                        const url = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
                        window.open(url, "_blank");
                      }}
                      edge="end"
                      color="primary"
                      title="Open first image in new tab"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" fontWeight={600} mb={3}>
            Location & Details
          </Typography>
          
      
          {(restaurant.name?.trim() && restaurant.postcode?.trim()) && (
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleFetchPlaceData}
                disabled={fetchingPlaceData}
                fullWidth
                sx={{ 
                  py: 1.5, 
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2 }
                }}
              >
                {fetchingPlaceData ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Fetching data from Google Places...
                  </>
                ) : (
                  <>
                    <LocationOnIcon sx={{ mr: 1 }} /> Get Place ID & Details from Google
                  </>
                )}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Tip: Fill in address fields for best results • Auto-fills coordinates, rating, website, Place ID
              </Typography>
            </Box>
          )}
          
        
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Address Line 1"
              fullWidth
              required
              value={restaurant.address_line1 || ""}
              onChange={(e) => handleChange("address_line1", e.target.value)}
              placeholder="Street address, building number"
              InputProps={{
                endAdornment: restaurant.address_line1 && (
                  <InputAdornment position="end">
                    <IconButton
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const parts = [restaurant.address_line1, restaurant.address_line2, restaurant.town, restaurant.city, restaurant.postcode].filter(Boolean);
                        const fullAddress = parts.join(", ");
                        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
                        window.open(url, "_blank");
                      }}
                      edge="end"
                      color="primary"
                    >
                      <LocationOnIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>


          <Box sx={{ mb: 3 }}>
            <TextField
              label="Address Line 2 (Optional)"
              fullWidth
              value={restaurant.address_line2 || ""}
              onChange={(e) => handleChange("address_line2", e.target.value)}
              placeholder="Apartment, suite, unit, etc."
            />
          </Box>

       
          <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
            <TextField
              label="Town"
              sx={{ width: "50%" }}
              value={restaurant.town || ""}
              onChange={(e) => handleChange("town", e.target.value)}
              placeholder="e.g., Westminster"
            />
            <TextField
              label="City"
              sx={{ width: "50%" }}
              value={restaurant.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="e.g., London"
            />
          </Box>

       
          <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
            <TextField
              label="Postcode"
              required
              sx={{ width: "33.333%" }}
              value={restaurant.postcode || ""}
              onChange={(e) => handleChange("postcode", e.target.value)}
              placeholder="e.g., SW1A 1AA"
            />
            <TextField
              label="Latitude"
              type="number"
              sx={{ width: "33.333%" }}
              value={restaurant.lat || ""}
              onChange={(e) => handleChange("lat", e.target.value)}
              placeholder="e.g., 40.7128"
            />
            <TextField
              label="Longitude"
              type="number"
              sx={{ width: "33.333%" }}
              value={restaurant.lng || ""}
              onChange={(e) => handleChange("lng", e.target.value)}
              placeholder="e.g., -74.0060"
            />
            
          </Box>

       
          <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
            
            <TextField
              label="Google Place ID"
              sx={{ width: "33.333%" }}
              value={restaurant.place_id || ""}
              onChange={(e) => handleChange("place_id", e.target.value)}
              placeholder="Google Maps Place ID"
            />
            <TextField
              select
              label="FHRS Rating"
              sx={{ width: "33.333%" }}
              value={restaurant.fhrs_rating || ""}
              onChange={(e) => handleChange("fhrs_rating", e.target.value)}
              helperText="UK Food Hygiene Rating"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="fhrs_0_en-gb">0 - Urgent Improvement</MenuItem>
              <MenuItem value="fhrs_1_en-gb">1 - Major Improvement</MenuItem>
              <MenuItem value="fhrs_2_en-gb">2 - Improvement Necessary</MenuItem>
              <MenuItem value="fhrs_3_en-gb">3 - Generally Satisfactory</MenuItem>
              <MenuItem value="fhrs_4_en-gb">4 - Good</MenuItem>
              <MenuItem value="fhrs_5_en-gb">5 - Very Good</MenuItem>
              <MenuItem value="fhrs_awaitinginspection_en-gb">Awaiting Inspection</MenuItem>
              <MenuItem value="fhrs_awaitingpublication_en-gb">Awaiting Publication</MenuItem>
              <MenuItem value="fhrs_exempt_en-gb">Exempt</MenuItem>
            </TextField>
            <TextField
              label="FHRS Rating Date"
              type="date"
              sx={{ width: "33.333%" }}
              value={restaurant.fhrs_rating_date ? restaurant.fhrs_rating_date.split('T')[0] : ""}
              onChange={(e) => handleChange("fhrs_rating_date", e.target.value || null)}
              InputLabelProps={{ shrink: true }}
              helperText="Date of FHRS inspection"
            />
          </Box>

       
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={3}>
                Opening Hours
            </Typography>
            {weekdays.map((day) => {
              const v = openHoursMap[day] || { closed: false, open: '', close: '' };
              return (
                <Box key={day} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ width: 120, fontWeight: 600 }}>{day}</Typography>

                  <TextField
                    select
                    sx={{ width: 180 }}
                    value={v.open || ''}
                    onChange={(e) => {
                      const newMap = { ...openHoursMap, [day]: { ...v, open: e.target.value, closed: false } };
                      setOpenHoursMap(newMap);
                      handleChange('open_hours', openHoursMapToArray(newMap));
                    }}
                    disabled={v.closed}
                    size="small"
                  >
                    <MenuItem value="">--</MenuItem>
                    {timeOptions.map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                    {v.open && v.open !== '' && !timeOptions.includes(v.open) && (
                      <MenuItem key={`saved-open-${day}`} value={v.open}>{v.open}</MenuItem>
                    )}
                  </TextField>

                  <Typography sx={{ mx: 1 }}>—</Typography>

                  <TextField
                    select
                    sx={{ width: 180 }}
                    value={v.close || ''}
                    onChange={(e) => {
                      const newMap = { ...openHoursMap, [day]: { ...v, close: e.target.value, closed: false } };
                      setOpenHoursMap(newMap);
                      handleChange('open_hours', openHoursMapToArray(newMap));
                    }}
                    disabled={v.closed}
                    size="small"
                  >
                    <MenuItem value="">--</MenuItem>
                    {timeOptions.map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                    {v.close && v.close !== '' && !timeOptions.includes(v.close) && (
                      <MenuItem key={`saved-close-${day}`} value={v.close}>{v.close}</MenuItem>
                    )}
                  </TextField>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!v.closed}
                        onChange={(e) => {
                          const closed = e.target.checked;
                          const newMap = { ...openHoursMap, [day]: { closed, open: closed ? '' : v.open, close: closed ? '' : v.close } };
                          setOpenHoursMap(newMap);
                          handleChange('open_hours', openHoursMapToArray(newMap));
                        }}
                        size="small"
                      />
                    }
                    label="Closed"
                    sx={{ ml: 1 }}
                  />
                </Box>
              );
            })}
            <Typography variant="caption" color="text.secondary">
              Values from Google Places are pre-populated. Use the selects to pick opening and closing times or mark a day as closed.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }} />

      
          <Box display="flex" gap={2} flexWrap="wrap" justifyContent="space-between">
            <Box display="flex" gap={2} flexWrap="wrap">
              {isPending && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleApprove}
                    startIcon={<CheckCircleIcon />}
                    size="large"
                  >
                    Approve Restaurant
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleReject}
                    startIcon={<CancelIcon />}
                    size="large"
                  >
                    Reject Restaurant
                  </Button>
                </>
              )}
              {!isNew && !isPending && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDelete}
                  startIcon={<DeleteIcon />}
                  size="large"
                >
                  Delete Restaurant
                </Button>
              )}
            </Box>
            
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
                size="large"
              >
                {saving ? "Saving..." : isNew ? "Add Restaurant" : "Save Changes"}
              </Button>

              <Button 
                variant="outlined" 
                onClick={() => {
                  const returnTo = location.state?.returnTo || location.search || "";
                  navigate(`/restaurants${returnTo}`);
                }}
                size="large"
              >
                Back
              </Button>
            </Box>
          </Box>
        </Paper>

    
        <Dialog 
          open={successDialog.open} 
          onClose={() => setSuccessDialog({ open: false, fields: [] })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'success.main' }}>
            <CheckCircleOutlineIcon fontSize="large" />
            Data Fetched Successfully!
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Fields updated from Google Places:
            </Typography>
            <List>
              {successDialog.fields.map((field, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={field} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setSuccessDialog({ open: false, fields: [] })}
              variant="contained"
              color="primary"
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
