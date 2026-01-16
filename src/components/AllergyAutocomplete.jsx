import React, { useState, useEffect } from "react";
import { Autocomplete, TextField, Chip, CircularProgress } from "@mui/material";
import api from "../api";

export default function AllergyAutocomplete({
  value = [],
  onChange,
  label = "Allergies",
  placeholder = "Select allergies",
  disabled = false,
  returnType = 'name',
}) {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllergies = async () => {
      try {
        const res = await api.get("/settings/allergies");
        setAllergies(res.data.allergies || []);
      } catch (err) {
        console.error("Error fetching allergies:", err);
        setAllergies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllergies();
  }, []);

  const normalizeKey = (v) => String(v ?? '').trim().toLowerCase();

  const selectedAllergies = Array.isArray(value)
    ? value
        .map((v) => {
          const key = normalizeKey(v);
          if (!key) return null;

          // Try match by ID (number/string)
          const byId = allergies.find((a) => normalizeKey(a?.id) === key);
          if (byId) return byId;

          // Try match by name
          const byName = allergies.find((a) => normalizeKey(a?.name) === key);
          return byName || null;
        })
        .filter(Boolean)
    : [];

  const handleChange = (event, newValue) => {
    if (!Array.isArray(newValue)) {
      onChange([]);
      return;
    }
    if (returnType === 'id') {
      onChange(newValue.map((a) => a.id));
      return;
    }
    onChange(newValue.map((a) => a.name));
  };

  if (loading) {
    return (
      <TextField
        fullWidth
        label={label}
        disabled
        InputProps={{
          endAdornment: <CircularProgress size={20} />,
        }}
      />
    );
  }

  return (
    <Autocomplete
      multiple
      options={allergies}
      getOptionLabel={(option) => option.name || option}
      value={selectedAllergies}
      onChange={handleChange}
      disabled={disabled}
      groupBy={(option) => option.category || "Other"}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
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
  );
}
