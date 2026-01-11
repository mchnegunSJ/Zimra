import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import components
import LoginScreen from './components/auth/LoginScreen';
import DeviceConfiguration from './components/manager/DeviceConfiguration';
import FiscalDayClosed from './components/cashier/FiscalDayClosed';
import MainPOS from './components/cashier/MainPOS';
import EndOfDaySummary from './components/cashier/EndOfDaySummary';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      // Warm orange used for primary call-to-action buttons
      main: '#f28a00',
    },
    secondary: {
      main: '#111111',
    },
    background: {
      // Soft warm off-white background like the mockups
      default: '#fbf7f2',
      paper: '#ffffff',
    },
    text: {
      primary: '#111111',
      secondary: '#7a7a7a',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Aptos", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: 0.2,
    },
    h4: {
      fontWeight: 700,
      letterSpacing: 0.2,
    },
    h5: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: 0.6,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        containedPrimary: {
          backgroundColor: '#f28a00',
          '&:hover': {
            backgroundColor: '#d87300',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 18px 45px rgba(0,0,0,0.04)',
        },
      },
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles = ['manager', 'cashier'] 
}) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

// Role-based routing
const AppRoutes = () => {
  const { user, fiscalDay } = useAuth();
  
  if (!user) {
    return <LoginScreen />;
  }
  
  // Manager route
  if (user.role === 'manager') {
    return (
      <Routes>
        <Route path="/device-config" element={
          <ProtectedRoute allowedRoles={['manager']}>
            <DeviceConfiguration />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/device-config" replace />} />
      </Routes>
    );
  }
  
  // Cashier routes
  if (user.role === 'cashier') {
    // If fiscal day is not open, show the fiscal day closed screen
    if (!fiscalDay?.isOpen) {
      return (
        <Routes>
          <Route path="/fiscal-day-closed" element={
            <ProtectedRoute allowedRoles={['cashier']}>
              <FiscalDayClosed />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/fiscal-day-closed" replace />} />
        </Routes>
      );
    }
    
    // Fiscal day is open, show main POS or end of day summary
    return (
      <Routes>
        <Route path="/pos" element={
          <ProtectedRoute allowedRoles={['cashier']}>
            <MainPOS />
          </ProtectedRoute>
        } />
        <Route path="/end-of-day" element={
          <ProtectedRoute allowedRoles={['cashier']}>
            <EndOfDaySummary />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    );
  }
  
  // Default fallback
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <AppRoutes />
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
