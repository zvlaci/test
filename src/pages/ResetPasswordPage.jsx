import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import api from '../api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  const handleReset = async () => {
    if (!newPassword) return alert('Enter a new password');
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      alert('Password changed! You can now log in.');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Invalid or expired reset link.');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box mt={10} textAlign="center">
        <Typography variant="h5" mb={3}>Set a new password</Typography>
        <TextField
          fullWidth type="password"
          label="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={handleReset}>
          Change Password
        </Button>
      </Box>
    </Container>
  );
}