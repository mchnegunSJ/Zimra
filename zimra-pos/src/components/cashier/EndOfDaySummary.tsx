import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Divider, 
  Paper, 
  useTheme,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const EndOfDaySummary: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { closeFiscalDay, fiscalDay } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Summary values derived from today's sales
  const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalVat = sales.reduce((sum, s) => sum + (s.tax || 0), 0);
  const receiptCount = sales.length;
  const summaryDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleCloseFiscalDay = async () => {
    if (!window.confirm('Are you sure you want to close the fiscal day? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await closeFiscalDay();
      if (!success) {
        throw new Error('Failed to close fiscal day');
      }
      // Navigate back to the main POS screen after a short delay
      setTimeout(() => {
        navigate('/pos');
      }, 1500);
    } catch (err) {
      setError('Failed to close fiscal day. Please try again.');
      console.error('Close fiscal day error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSales = () => {
    navigate('/pos');
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sales');
      const all = raw ? JSON.parse(raw) : [];
      const todayStr = new Date().toISOString().split('T')[0];
      const todays = all.filter((s: any) => s.date?.startsWith(todayStr));
      setSales(todays.reverse());
    } catch (e) {
      console.error('Failed to load sales', e);
    }
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        px: 6,
        py: 4,
      }}
    >
      {/* Back link */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 6 }}>
        <Button
          color="inherit"
          onClick={handleBackToSales}
          startIcon={<ArrowBackIcon sx={{ fontSize: 20 }} />}
          sx={{
            textTransform: 'none',
            fontSize: '0.9rem',
            px: 0,
          }}
        >
          Back to Sales Screen
        </Button>
      </Box>

      {/* Center content */}
      <Box sx={{ maxWidth: 960, mx: 'auto', textAlign: 'center' }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          End of Day Summary
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 5 }}>
          {summaryDate}
        </Typography>
      
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
          {/* Total Sales Card */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              textAlign: 'center',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Total Sales (inc. VAT)
            </Typography>
            <Typography variant="h4" color="primary">
              ${totalSales.toFixed(2)}
            </Typography>
          </Paper>
            
          {/* Total VAT Card */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              textAlign: 'center',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Total VAT Collected
            </Typography>
            <Typography variant="h4" color="secondary">
              ${totalVat.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              15% of total sales
            </Typography>
          </Paper>
            
            {/* Receipts Card */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Total Receipts Issued
                </Typography>
                <Typography variant="h4">
                  {receiptCount}
                </Typography>
              </div>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Fiscal receipts generated today
              </Typography>
            </Paper>
        </Box>

        {/* Sales list for the day */}
        <Box sx={{ mt: 3, textAlign: 'left' }}>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            Today&apos;s Receipts
          </Typography>
          {sales.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No receipts have been issued today.
            </Typography>
          ) : (
            <Paper variant="outlined" sx={{ maxHeight: 260, overflowY: 'auto' }}>
              {sales.map((sale) => (
                <Box
                  key={sale.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '&:last-of-type': { borderBottom: 'none' },
                    cursor: 'pointer',
                    '&:hover': { bgcolor: theme.palette.action.hover },
                  }}
                  onClick={() => setSelectedSale(sale)}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {sale.id}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' · '}Cashier: {sale.cashier}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ${sale.total?.toFixed ? sale.total.toFixed(2) : sale.total}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={handleCloseFiscalDay}
          disabled={isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <CheckCircleIcon />
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
          {isLoading ? 'PROCESSING...' : 'CLOSE FISCAL DAY & SUBMIT Z-REPORT'}
        </Button>
      </Box>
    
      {/* Invoice dialog */}
      <Dialog
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Receipt Details</DialogTitle>
        <DialogContent dividers>
          {selectedSale && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Receipt ID: {selectedSale.id}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Cashier: {selectedSale.cashier}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Date: {new Date(selectedSale.date).toLocaleString()}
              </Typography>

              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Items
              </Typography>
              {selectedSale.items?.map((item: any) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.75,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Qty {item.quantity} × ${item.price.toFixed(2)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ${item.total?.toFixed ? item.total.toFixed(2) : (item.price * item.quantity).toFixed(2)}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Subtotal</Typography>
                <Typography variant="body2">
                  ${selectedSale.subtotal?.toFixed ? selectedSale.subtotal.toFixed(2) : selectedSale.subtotal}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">VAT (15%)</Typography>
                <Typography variant="body2">
                  ${selectedSale.tax?.toFixed ? selectedSale.tax.toFixed(2) : selectedSale.tax}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="subtitle1">TOTAL</Typography>
                <Typography variant="subtitle1">
                  ${selectedSale.total?.toFixed ? selectedSale.total.toFixed(2) : selectedSale.total}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSale(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EndOfDaySummary;
