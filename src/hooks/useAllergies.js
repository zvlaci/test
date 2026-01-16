import { useState, useEffect } from "react";
import api from "../api";

export function useAllergies() {
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

  const getAllergyName = (id) => {
    const allergy = allergies.find((a) => a.id === id);
    return allergy ? allergy.name : id;
  };

  const getAllergyNames = (ids) => {
    if (!Array.isArray(ids)) return [];
    return ids.map(getAllergyName);
  };

  return {
    allergies,
    loading,
    getAllergyName,
    getAllergyNames,
  };
}
