import React, { useState } from 'react';
import { keyframes } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  SelectChangeEvent, 
  TextField, 
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Grid
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const brandBounceIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-40px) scale(0.9);
  }
  50% {
    opacity: 1;
    transform: translateY(5px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const LoginScreen: React.FC = () => {
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'manager' | 'cashier'>('cashier');
  const [selectedCashier, setSelectedCashier] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input
    const value = e.target.value.replace(/\D/g, '');
    setPin(value);
    setError('');
  };

  const handleRoleChange = (
    event: React.MouseEvent<HTMLElement>,
    newRole: 'manager' | 'cashier',
  ) => {
    if (newRole !== null) {
      setRole(newRole);
      setSelectedCashier('');
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin) {
      setError('Please enter your PIN');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const success = await login(pin);
      
      if (!success) {
        setError('Invalid PIN. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Number pad buttons
  const numPad = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'CLEAR', 0, '⌫'];

  const handleNumPadClick = (value: number | string) => {
    if (value === 'CLEAR') {
      setPin('');
      setError('');
    } else if (value === '⌫') {
      setPin(prev => prev.slice(0, -1));
    } else if (typeof value === 'number' && pin.length < 8) {
      setPin(prev => prev + value.toString());
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 6,
        px: 2,
      }}
    >
      {/* Brand header */}
      <Box
        sx={{
          mt: 2,
          mb: 4,
          px: 4,
          py: 1.5,
          borderRadius: 999,
          bgcolor: '#e0e0e0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: `${brandBounceIn} 900ms ease-out`,
        }}
      >
        <Typography
          variant="h3"
          align="center"
          sx={{
            fontFamily: 'Impact, "Aptos", system-ui, sans-serif',
            letterSpacing: 1,
          }}
        >
          Big Old Cravings & Bakeries
        </Typography>
      </Box>

      {/* Centered auth card */}
      <Card
        elevation={3}
        sx={{
          maxWidth: 430,
          width: '100%',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Please sign in to your account
          </Typography>
          
          <Box mt={1} mb={3}>
            <ToggleButtonGroup
              color="primary"
              value={role}
              exclusive
              onChange={handleRoleChange}
              fullWidth
              sx={{ mb: 3 }}
            >
              <ToggleButton value="cashier">Cashier</ToggleButton>
              <ToggleButton value="manager">Manager</ToggleButton>
            </ToggleButtonGroup>
            
            {role === 'cashier' && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="cashier-select-label">Select Your Name</InputLabel>
                <Select
                  labelId="cashier-select-label"
                  id="cashier-select"
                  value={selectedCashier}
                  label="Select Your Name"
                  onChange={(e: SelectChangeEvent) => setSelectedCashier(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Choose cashier name</em>
                  </MenuItem>
                  <MenuItem value="Shepherd">Shepherd</MenuItem>
                  <MenuItem value="Jane">Jane</MenuItem>
                </Select>
              </FormControl>
            )}
            
            <FormControl fullWidth>
              <TextField
                label="Enter Your PIN Code"
                type="password"
                value={pin}
                onChange={handlePinChange}
                fullWidth
                margin="normal"
                disabled={isLoading}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  maxLength: 8,
                  style: {
                    textAlign: 'center',
                    fontSize: '1.6rem',
                    letterSpacing: '0.6em',
                    paddingLeft: '0.6em',
                  },
                }}
              />
            </FormControl>
            
            {error && (
              <Typography color="error" align="center" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
            
            {/* Number Pad */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mt: 3 }}>
              {numPad.map((num) => (
                <Button
                  key={num}
                  variant="outlined"
                  onClick={() => handleNumPadClick(num)}
                  disabled={isLoading}
                  sx={{
                    height: 70,
                    fontSize: '1.25rem',
                    ...(num === 'CLEAR' && { color: 'error.main' }),
                  }}
                >
                  {num}
                </Button>
              ))}
            </Box>
            
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={isLoading || !pin}
              sx={{ mt: 3, py: 1.6, fontSize: '1.05rem' }}
            >
              {isLoading ? 'Signing in...' : 'Enter'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Footer */}
      <Box sx={{ mt: 4, mb: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          © 2024 Big Old Cravings &amp; Bakeries. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginScreen;
