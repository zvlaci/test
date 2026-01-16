import { useEffect, useState } from 'react';
import { 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  CardActions, 
  Button,
  Box,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api';

export default function ExplorePage() {
  const [restaurants, setRestaurants] = useState([]);
  const [allergies, setAllergies] = useState(null);
  const [allergyFilter, setAllergyFilter] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/restaurants')
      .then((res) => setRestaurants(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    api.get('/settings/allergies')
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.allergies || []);
        setAllergies(list);
      })
      .catch((err) => {
        console.error('Error fetching allergies:', err);
        setAllergies([]);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) return <LoadingSpinner text="Fetching restaurants..." />;

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h4" mb={3} textAlign="center">
        Discover Restaurants
      </Typography>
      {/* If backend returs no allergies show 3 standard filters */}
      {Array.isArray(allergies) && allergies.length === 0 && (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
          {['vegetarian', 'vegan', 'gluten-free'].map((label) => {
            const active = allergyFilter.includes(label);
            return (
              <Chip
                key={label}
                label={label}
                clickable
                color={active ? 'primary' : 'default'}
                onClick={() => {
                  setAllergyFilter((prev) => (
                    prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]
                  ));
                }}
              />
            );
          })}
        </Box>
      )}
      <Grid container spacing={2}>
        {(restaurants.data || restaurants || [])
          .filter((r) => {
            if (!allergyFilter || allergyFilter.length === 0) return true;
            const af = Array.isArray(r.allergy_filter)
              ? r.allergy_filter.map((a) => String(a).toLowerCase())
              : (r.allergy_filter ? String(r.allergy_filter).toLowerCase().split(',').map(s => s.trim()) : []);
            return allergyFilter.every((f) => af.includes(f.toLowerCase()));
          })
          .map((r) => (
          <Grid size={{xs:12, md:4}} key={r.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">{r.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.cuisine || 'Cuisine not specified'}
                </Typography>
                <Typography variant="body2">
                  ⭐ {r.rating || 'N/A'} — 💰 {r.price_level}
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={() => navigate(`/explore/${r.id}`)}>View Details</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}