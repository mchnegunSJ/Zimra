import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import { 
  Box, Button, Card, CardContent, CircularProgress, 
  Step, StepLabel, Stepper, Typography, useTheme, 
  Alert, Snackbar, TextField, Divider, Chip, Paper 
} from '@mui/material';
import { 
  VpnKey as KeyIcon, 
  CloudUpload as CloudIcon, 
  VerifiedUser as VerifiedIcon, 
  Settings as SettingsIcon,
  ReceiptLong as ReceiptIcon,
  RestartAlt as ResetIcon 
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// --- HELPER COMPONENT ---
const CloudUploadIconWrapper = () => (
  <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
    <CloudIcon sx={{ fontSize: 80, color: '#0288d1' }} />
    <VerifiedIcon sx={{ 
      fontSize: 30, color: '#fff', bgcolor: '#2e7d32', borderRadius: '50%', 
      position: 'absolute', bottom: 5, right: -5, padding: '2px'
    }} />
  </Box>
);

const steps = ['Initialize Device', 'ZIMRA Handshake', 'Fiscalisation Complete'];

const DeviceConfiguration: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate(); 
  const { logout } = useAuth();

  // --- STATE ---
  const [activeStep, setActiveStep] = useState(0);
  const [deviceID, setDeviceID] = useState(""); 
  const [serialNumber, setSerialNumber] = useState("LITHITRUST-POS-001");
  const [csrData, setCsrData] = useState<string | null>(null);
  const [zimraCertificate, setZimraCertificate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- FIX: Added 'info' to the allowed types here ---
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info' | null}>({ message: '', type: null });

  // --- 1. CHECK STATUS ON LOAD ---
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get<any>('http://localhost:5000/api/device/status');
        if (response.data.status === 'configured') {
          setDeviceID(response.data.deviceID);
          setActiveStep(2); // Jump to success if already configured
        }
      } catch (error) {
        console.log("Device not configured yet");
      }
    };
    checkStatus();
  }, []);

  // --- 2. ACTION: GENERATE KEYS (STAGE 1) ---
  const handleGenerateKeys = async () => {
    if (!deviceID) return showNotification('Please enter a valid Device ID', 'error');
    setIsLoading(true);
    try {
      const response = await axios.post<any>('http://localhost:5000/api/setup/generate-keys', {
        deviceID, serialNumber
      });
      if (response.data.status === 'success') {
        setCsrData(response.data.csr);
        setActiveStep(1); 
        showNotification('Secure Keys Generated Successfully', 'success');
      }
    } catch (error) {
      showNotification('Failed to generate keys. Is Backend running?', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. ACTION: SUBMIT TO ZIMRA (STAGE 2) ---
  const handleSubmitToZimra = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post<any>('http://localhost:5000/api/setup/register', {
        deviceID, 
        csr: csrData 
      });

      if (response.data.status === 'success') {
        setZimraCertificate(response.data.certificate);
        setActiveStep(2); 
        showNotification('Registration Approved by ZIMRA Authority', 'success');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Connection to ZIMRA Failed';
      showNotification(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. RESET FUNCTION (For Demo) ---
  const handleReset = async () => {
    if(!window.confirm("Are you sure? This will wipe the device memory for the demo.")) return;
    try {
        setActiveStep(0);
        setDeviceID("");
        setCsrData(null);
        showNotification('System Reset for Demonstration', 'info');
    } catch (e) {
        console.error(e);
    }
  };

  const showNotification = (msg: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message: msg, type });
  };

  const handleBackToLogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ maxWidth: 900, margin: '0 auto', p: 4 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e', mb: 1 }}>
            Fiscalisation Setup
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Secure Hardware Initialization & Authority Registration
          </Typography>
        </Box>

        <Button
          variant="text"
          color="inherit"
          onClick={handleBackToLogin}
          sx={{ textTransform: 'none', fontSize: '0.9rem' }}
        >
          Back to Login
        </Button>
      </Box>

      {/* Progress Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card elevation={4} sx={{ borderRadius: 3, border: '1px solid #e0e0e0' }}>
        <CardContent sx={{ p: 5 }}>
          
          {/* --- STAGE 1: INITIALIZATION --- */}
          {activeStep === 0 && (
            <Box textAlign="center">
              <SettingsIcon sx={{ fontSize: 70, color: '#1a237e', mb: 2, opacity: 0.8 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>Step 1: Initialize Hardware</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                Enter the unique Device ID provided by the tax authority. The system will generate a mathematically unique private key for this ID.
              </Typography>

              <Box sx={{ maxWidth: 400, mx: 'auto', textAlign: 'left' }}>
                <TextField 
                  fullWidth label="ZIMRA Device ID" 
                  placeholder="e.g. 72000003" 
                  value={deviceID} onChange={(e) => setDeviceID(e.target.value)}
                  variant="outlined" sx={{ mb: 3 }}
                />
                <Button 
                  fullWidth variant="contained" size="large" 
                  onClick={handleGenerateKeys} disabled={isLoading || !deviceID}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit"/> : <KeyIcon />}
                  sx={{ py: 1.5, bgcolor: '#1a237e' }}
                >
                  {isLoading ? 'Generating Keys...' : 'Generate Secure Keys'}
                </Button>
              </Box>
            </Box>
          )}

          {/* --- STAGE 2: THE HANDSHAKE (CSR) --- */}
          {activeStep === 1 && (
            <Box>
              <Box textAlign="center" sx={{ mb: 4 }}>
                <CloudUploadIconWrapper />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>Step 2: Authority Handshake</Typography>
                <Typography variant="body2" color="text.secondary">
                  Review the generated request below before transmitting to ZIMRA.
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }}><Chip label="Generated CSR Data" /></Divider>
              
              <Paper variant="outlined" sx={{ 
                p: 3, bgcolor: '#f8f9fa', borderRadius: 2, 
                fontFamily: 'monospace', fontSize: '0.75rem', 
                color: '#455a64', maxHeight: 200, overflow: 'auto', mb: 4 
              }}>
                <Typography variant="caption" display="block" sx={{ mb: 1, fontWeight: 'bold', color: '#1a237e' }}>
                  -----BEGIN CERTIFICATE REQUEST-----
                </Typography>
                {csrData || "Loading CSR Data..."}
                <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 'bold', color: '#1a237e' }}>
                  -----END CERTIFICATE REQUEST-----
                </Typography>
              </Paper>

              <Box textAlign="center">
                <Button 
                  variant="contained" size="large" color="success"
                  onClick={handleSubmitToZimra} disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit"/> : <CloudIcon />}
                  sx={{ py: 1.5, px: 6, fontSize: '1.1rem', fontWeight: 'bold' }}
                >
                  {isLoading ? 'Connecting to Authority...' : 'Submit to ZIMRA Authority'}
                </Button>
              </Box>
            </Box>
          )}

          {/* --- STAGE 3: SUCCESS (Certificate) --- */}
          {activeStep === 2 && (
            <Box textAlign="center">
              <VerifiedIcon sx={{ fontSize: 80, color: '#2e7d32', mb: 2 }} />
              <Typography variant="h4" gutterBottom sx={{ color: '#2e7d32', fontWeight: 800 }}>
                Fiscalisation Complete
              </Typography>
              
              <Alert severity="success" sx={{ mb: 4, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Device Authorized</Typography>
                This device ({deviceID}) has been digitally signed by the ZIMRA Authority. 
                All future receipts will be legally verifiable.
              </Alert>

              {/* Display Certificate Snippet if available */}
              {zimraCertificate && (
                 <Paper variant="outlined" sx={{ p: 2, mb: 4, bgcolor: '#e8f5e9', border: '1px dashed #2e7d32' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#1b5e20' }}>
                        <strong>ZIMRA DIGITAL SIGNATURE RECEIVED:</strong><br/>
                        {zimraCertificate.substring(0, 50)}...[Verified]
                    </Typography>
                 </Paper>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button 
                    variant="contained" 
                    size="large" 
                    startIcon={<ReceiptIcon />}
                    onClick={() => navigate('/')} 
                    sx={{ py: 1.5, px: 4 }}
                >
                    Go to Point of Sale
                </Button>

                <Button 
                    variant="outlined" 
                    color="error"
                    startIcon={<ResetIcon />}
                    onClick={handleReset}
                >
                    Reset (Demo)
                </Button>
              </Box>
            </Box>
          )}

        </CardContent>
      </Card>

      <Snackbar 
        open={!!notification.type} autoHideDuration={6000} 
        onClose={() => setNotification({ ...notification, type: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notification.type || 'info'} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceConfiguration;