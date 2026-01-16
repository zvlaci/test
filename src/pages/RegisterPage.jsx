import { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'admin') setIsAdmin(true);
    } catch (err) {
      console.warn('Invalid token format');
    }
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault(); 
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await api.post('/auth/register', { email, password, role });
      alert('Account created successfully! You can now log in.');
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Registration failed. Email may already exist.');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box mt={10} textAlign="center">
        <Typography variant="h5" mb={3}>Create Account</Typography>

        <form onSubmit={handleRegister}>
          <TextField
            fullWidth
            label="Email"
            margin="normal"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Role select always visible */}
          <FormControl fullWidth margin="normal">
            <InputLabel>I am registering as</InputLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              label="I am registering as"
            >
              <MenuItem value="user">Diner</MenuItem>
              <MenuItem value="restaurant">Restaurant</MenuItem>
              {isAdmin && <MenuItem value="admin">Admin</MenuItem>}
            </Select>
          </FormControl>

          <Button
            fullWidth
            type="submit"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Register
          </Button>
        </form>

        <Typography variant="body2" mt={2}>
          Already have an account?{' '}
          <a href="/" style={{ color: '#1976d2' }}>Login</a>
        </Typography>
      </Box>
    </Container>
  );
}
