import React from 'react';
import { Container, Typography, Button } from '@mui/material';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Error caught by boundary:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container sx={{ mt: 10, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {this.state.error?.message || 'Unexpected error'}
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={this.handleReload}>
            Reload App
          </Button>
        </Container>
      );
    }
    return this.props.children;
  }
}