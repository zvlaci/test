import { CircularProgress, Box, Typography } from '@mui/material';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="80vh"
    >
      <CircularProgress size={50} thickness={4} />
      <Typography mt={2}>{text}</Typography>
    </Box>
  );
}