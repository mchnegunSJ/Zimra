import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  Paper,
  useTheme,
  Chip
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon, 
  LockOpen as LockOpenIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const FiscalDayClosed: React.FC = () => {
  const theme = useTheme();
  const { startFiscalDay, user, fiscalDay } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartFiscalDay = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const success = await startFiscalDay();
      if (!success) {
        setError('Failed to start fiscal day. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while starting the fiscal day.');
      console.error('Start fiscal day error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        px: 6,
        py: 3,
      }}
    >
      {/* Top brand bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 10 }}>
        <Box
          sx={{
            width: 18,
            height: 18,
            borderRadius: 4,
            bgcolor: 'primary.main',
            mr: 1.5,
          }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Wassup Dawg Technologies
        </Typography>
      </Box>

      {/* Center content */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ZIMRA connection pill */}
        <Card
          elevation={3}
          sx={{
            mb: 6,
            px: 5,
            py: 2,
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 0 }}>
            <CheckCircleIcon sx={{ color: fiscalDay?.isOpen ? 'success.main' : 'error.main' }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {fiscalDay?.isOpen ? 'Connected to ZIMRA' : 'Not connected to ZIMRA'}
            </Typography>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: fiscalDay?.isOpen ? 'success.main' : 'error.main',
                ml: 'auto',
              }}
            />
          </CardContent>
        </Card>

        {/* Date + status */}
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {currentDate}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
          Fiscal Day is currently CLOSED.
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={handleStartFiscalDay}
          disabled={isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              <LockOpenIcon />
            )
          }
          sx={{
            mt: 1,
            px: 6,
            py: 1.8,
            fontSize: '0.95rem',
            letterSpacing: 1,
          }}
        >
          {isLoading ? 'OPENING...' : 'START FISCAL DAY'}
        </Button>
      </Box>
    </Box>
  );
}

export default FiscalDayClosed;
