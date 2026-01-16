import { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import api from '../api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) return alert('Enter your email');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      console.error(err);
      alert('Email not found or error sending email');
    }
  };

  if (sent)
    return (
      <Container maxWidth="xs">
        <Box mt={10} textAlign="center">
          <Typography variant="h5">Check your email</Typography>
          <Typography variant="body2">We've sent you a password reset link.</Typography>
        </Box>
      </Container>
    );

  return (
    <Container maxWidth="xs">
      <Box mt={10} textAlign="center">
        <Typography variant="h5" mb={3}>Forgot Password?</Typography>
        <TextField
          fullWidth label="Your email"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <Button variant="contained" sx={{ mt: 2 }} onClick={handleSubmit}>
          Send Reset Link
        </Button>
      </Box>
    </Container>
  );
}