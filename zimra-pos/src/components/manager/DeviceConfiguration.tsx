import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  Divider, 
  Paper, 
  Step, 
  StepLabel, 
  Stepper, 
  Typography, 
  useTheme,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon, 
  Error as ErrorIcon,
  Lock as LockIcon,
  VpnKey as VpnKeyIcon,
  HowToReg as HowToRegIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const steps = [
  'Generate Key & CSR',
  'Register Device with ZIMRA',
  'Fetch System Config'
];

const DeviceConfiguration: React.FC = () => {
  const theme = useTheme();
  const { deviceStatus, generateKeys, logout } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Set active step based on device status
    if (deviceStatus.csrStatus === 'Registered') {
      setActiveStep(2);
    } else if (deviceStatus.csrStatus === 'Generated') {
      setActiveStep(1);
    } else {
      setActiveStep(0);
    }
  }, [deviceStatus]);

  const handleGenerateKeys = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await generateKeys();
      if (success) {
        setSuccess('Device keys and CSR generated successfully!');
      } else {
        throw new Error('Failed to generate keys');
      }
    } catch (err) {
      setError('Failed to generate device keys. Please try again.');
      console.error('Key generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" paragraph>
              Generate a new private key and Certificate Signing Request (CSR) for this device.
              This is the first step in registering your device with ZIMRA.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateKeys}
              disabled={isLoading || deviceStatus.csrStatus !== 'Not Generated'}
              startIcon={isLoading ? <CircularProgress size={20} /> : <VpnKeyIcon />}
              sx={{ mt: 2 }}
            >
              {isLoading ? 'Generating...' : 'Generate Key & CSR'}
            </Button>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" paragraph>
              Register your device with ZIMRA using the generated CSR. You'll need to provide
              the following details to complete the registration process.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 3, backgroundColor: theme.palette.background.paper }}>
              <Typography variant="subtitle2" color="textSecondary">Device ID:</Typography>
              <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace' }}>
                {deviceStatus.deviceId || 'Not available'}
              </Typography>
              
              <Typography variant="subtitle2" color="textSecondary">Serial Number:</Typography>
              <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace' }}>
                {deviceStatus.serialNo || 'Not available'}
              </Typography>
              
              <Typography variant="subtitle2" color="textSecondary">CSR Status:</Typography>
              <Box display="flex" alignItems="center" mb={2}>
                {deviceStatus.csrStatus === 'Generated' ? (
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                )}
                <Typography variant="body1">
                  {deviceStatus.csrStatus}
                </Typography>
              </Box>
            </Paper>
            
            <Button
              variant="contained"
              color="primary"
              onClick={() => setActiveStep(2)}
              disabled={deviceStatus.csrStatus !== 'Generated'}
              startIcon={<HowToRegIcon />}
            >
              Proceed to Registration
            </Button>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" paragraph>
              Fetch the latest system configuration from ZIMRA to complete the setup process.
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 3, backgroundColor: theme.palette.background.paper }}>
              <Typography variant="subtitle2" color="textSecondary">Device Status:</Typography>
              <Box display="flex" alignItems="center" mb={2}>
                {deviceStatus.isConfigured ? (
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <ErrorIcon color="warning" sx={{ mr: 1 }} />
                )}
                <Typography variant="body1">
                  {deviceStatus.isConfigured ? 'Device is fully configured' : 'Device not fully configured'}
                </Typography>
              </Box>
              
              {deviceStatus.certificate && (
                <>
                  <Typography variant="subtitle2" color="textSecondary">Certificate:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
                    {deviceStatus.certificate}
                  </Typography>
                </>
              )}
            </Paper>
            
            <Button
              variant="contained"
              color="primary"
              onClick={() => {}}
              disabled={!deviceStatus.isConfigured}
              startIcon={<SettingsIcon />}
            >
              {deviceStatus.isConfigured ? 'Configuration Complete' : 'Fetch System Config'}
            </Button>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Device Configuration
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Complete the following steps to configure your device for use with ZIMRA's fiscalization system.
          </Typography>
        </Box>
        <Button
          variant="text"
          color="inherit"
          onClick={logout}
          sx={{ textTransform: 'none', fontSize: '0.9rem' }}
        >
          Back to Login
        </Button>
      </Box>
      
      <Card sx={{ mb: 4, mt: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 4 }}>
            {steps.map((label, index) => (
              <Step key={label} completed={index < activeStep}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Divider sx={{ mb: 4 }} />
          
          {getStepContent(activeStep)}
        </CardContent>
      </Card>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceConfiguration;
