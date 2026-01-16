import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Chip,
  Divider,
  Box,
} from '@mui/material';
import api from '../api';

export default function ExploreDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    api.get(`/restaurants/${id}`)
      .then((res) => setRestaurant(res.data))
      .catch((err) => console.error('Failed to load restaurant', err));
  }, [id]);

  if (!restaurant) return <Typography textAlign="center" mt={5}>Loading...</Typography>;

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h4" mb={1}>{restaurant.name}</Typography>
      <Typography variant="body1" color="text.secondary" mb={2}>
        {restaurant.cuisine} • ⭐ {restaurant.rating || 'N/A'} • 💰 {restaurant.price_level}
      </Typography>

      <Box mb={3}>
        {restaurant.badges?.map((b) => (
          <Chip key={b} label={b} color="primary" variant="outlined" sx={{ mr: 1 }} />
        ))}
      </Box>

      <Divider sx={{ mb: 3 }} />
    </Container>
  );
}