import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Divider, 
  Grid, 
  IconButton, 
  List, 
  ListItem, 
  ListItemSecondaryAction, 
  ListItemText, 
  TextField, 
  Typography, 
  Paper,
  useTheme,
  InputAdornment,
  Badge
} from '@mui/material';
import { 
  Add as AddIcon, 
  Remove as RemoveIcon, 
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Clear as ClearIcon,
  ArrowBack as ArrowBackIcon,
  AttachMoney as AttachMoneyIcon,
  LocalAtm as LocalAtmIcon,
  CreditCard as CreditCardIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { CartItem, Product } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// Mock products data
const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Espresso (Single)', price: 2.50, taxInclusive: true, taxRate: 0.15 },
  { id: '2', name: 'Espresso (Double)', price: 3.50, taxInclusive: true, taxRate: 0.15 },
  { id: '3', name: 'Cappuccino', price: 3.75, taxInclusive: true, taxRate: 0.15 },
  { id: '4', name: 'Latte', price: 4.00, taxInclusive: true, taxRate: 0.15 },
  { id: '5', name: 'Almond Croissant', price: 3.25, taxInclusive: true, taxRate: 0.15 },
  { id: '6', name: 'Chocolate Chip Cookie', price: 2.75, taxInclusive: true, taxRate: 0.15 },
  { id: '7', name: 'Bag of Whole Beans (Colombia)', price: 12.99, taxInclusive: true, taxRate: 0.15 },
  { id: '8', name: 'Bag of Whole Beans (Ethiopia Yirgacheffe)', price: 14.99, taxInclusive: true, taxRate: 0.15 },
];

const MainPOS: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { fiscalDay, logout, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(MOCK_PRODUCTS);
      return;
    }

    const filtered = MOCK_PRODUCTS.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm]);

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.15; // 15% VAT
  const tax = subtotal * (taxRate / (1 + taxRate)); // Calculate tax from tax-inclusive price
  const total = subtotal;

  const cartTotal = total;

  // Add item to cart
  const addToCart = () => {
    if (!selectedProduct || quantity <= 0) return;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === selectedProduct.id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item.id === selectedProduct.id
            ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.price }
            : item
        );
      }

      return [
        ...prevCart,
        {
          ...selectedProduct,
          quantity,
          total: quantity * selectedProduct.price,
          taxAmount: (quantity * selectedProduct.price) * (taxRate / (1 + taxRate))
        }
      ];
    });

    // Reset form
    setSelectedProduct(null);
    setQuantity(1);
  };

  // Update item quantity in cart
  const updateCartItemQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      )
    );
  };

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
  };

  // Process payment and persist receipt (optionally with fiscal data)
  const processPayment = (fiscalData?: any) => {
    if (cart.length === 0) return;

    const receipt = {
      id: `R-${Date.now()}`,
      cashier: user?.name || 'Cashier',
      date: new Date().toISOString(),
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod,
      fiscal: fiscalData || null,
    };

    // Persist to localStorage for end-of-day screen
    try {
      const existingRaw = localStorage.getItem('sales');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [...existing, receipt];
      localStorage.setItem('sales', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist sales', e);
    }

    setLastReceipt(receipt);

    // Clear the cart after recording
    clearCart();
  };

  const handleFinalizeSale = async () => {
    const saleData = {
      deviceID: '123456', // TODO: load from DeviceConfig/local storage
      totalAmount: cartTotal,
      invoiceNo: 'INV-' + Date.now(),
    };

    try {
      const response = await fetch('http://localhost:5000/api/submit-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        // Persist and show a full receipt that includes fiscal identity
        processPayment(data);

        alert('Receipt Fiscalised!\nGlobal No: ' + data.receiptID);
        console.log('QR Data:', data.qr_data);
      }
    } catch (error) {
      console.error('Fiscalisation Failed', error);
      alert('Error: Could not fiscalise receipt. Check if Day is Open.');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isFiscalOpen = !!fiscalDay?.isOpen;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
            Point of Sale
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: isFiscalOpen ? 'success.main' : 'error.main',
                mr: 1,
              }}
            />
            <Typography variant="body2" color="textSecondary">
              Fiscal Day:{' '}
              <Box
                component="span"
                sx={{ fontWeight: 600 }}
              >
                {isFiscalOpen ? 'OPEN' : 'CLOSED'}
              </Box>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/end-of-day')}
            sx={{
              borderRadius: 999,
              px: 3,
              py: 1,
              fontSize: '0.9rem',
              textTransform: 'none',
              bgcolor: '#ffffff',
            }}
          >
            Go to End of Day...
          </Button>
          <Button
            variant="text"
            color="inherit"
            onClick={logout}
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
          >
            Logout
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Left Panel - Add Item */}
        <Card elevation={0} sx={{ bgcolor: '#f3f3f3' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <Typography variant="h6">Add Item</Typography>

              {/* Currency toggle mock (UI only) */}
              <Box
                sx={{
                  display: 'inline-flex',
                  borderRadius: 999,
                  overflow: 'hidden',
                  border: `1px solid ${theme.palette.divider}`,
                  fontSize: '0.75rem',
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    bgcolor: 'primary.main',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  USD
                </Box>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    fontWeight: 500,
                  }}
                >
                  ZWL
                </Box>
              </Box>
            </Box>

            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
              Item Name
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Start typing to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2, mt: 0.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Box
              sx={{
                maxHeight: 220,
                overflowY: 'auto',
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <List dense disablePadding>
                {filteredProducts.map((product) => (
                  <Box
                    key={product.id}
                    component="li"
                    sx={{
                      cursor: 'pointer',
                      backgroundColor:
                        selectedProduct?.id === product.id
                          ? theme.palette.action.selected
                          : 'transparent',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                      px: 2,
                      py: 1,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      '&:last-of-type': {
                        borderBottom: 'none',
                      },
                    }}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {formatCurrency(product.price)}
                    </Typography>
                  </Box>
                ))}
              </List>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                  Quantity
                </Typography>
                <TextField
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                  Unit Price
                </Typography>
                <TextField
                  value={
                    selectedProduct
                      ? formatCurrency(selectedProduct.price)
                      : '0.00'
                  }
                  disabled
                />
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={addToCart}
              disabled={!selectedProduct}
              startIcon={<AddIcon />}
              sx={{ mt: 1, py: 1.4 }}
            >
              Add Item to Receipt
            </Button>
          </CardContent>
        </Card>

        {/* Right Panel - Current Sale */}
        <Card elevation={0} sx={{ display: 'flex', flexDirection: 'column', bgcolor: '#f3f3f3' }}>
          <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography variant="h6">Current Sale</Typography>
              <Typography variant="body2" color="textSecondary">
                Currency: <Box component="span" sx={{ fontWeight: 600 }}>USD</Box>
              </Typography>
            </Box>

            <Paper
              variant="outlined"
              sx={{ flexGrow: 1, mb: 2, overflow: 'hidden' }}
            >
              {cart.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    p: 4,
                  }}
                >
                  <Typography variant="body1" color="textSecondary" align="center">
                    No items added to the sale yet.
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    align="center"
                    sx={{ mt: 1 }}
                  >
                    Search and add items from the left panel.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Table header */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '2.5fr 0.6fr 0.8fr 1fr 0.3fr',
                      px: 2,
                      py: 1,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      bgcolor: theme.palette.grey[50],
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                    }}
                  >
                    <Box>Item</Box>
                    <Box>Qty</Box>
                    <Box>Price</Box>
                    <Box sx={{ textAlign: 'right' }}>Total</Box>
                    <Box></Box>
                  </Box>
                  <List sx={{ maxHeight: 340, overflowY: 'auto', pt: 0 }}>
                    {cart.map((item) => (
                      <ListItem
                        key={item.id}
                        divider
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '2.5fr 0.6fr 0.8fr 1fr 0.3fr',
                          columnGap: 1,
                          alignItems: 'center',
                          py: 0.75,
                        }}
                      >
                        <ListItemText
                          primary={item.name}
                          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              updateCartItemQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography
                            variant="body2"
                            sx={{ mx: 1, minWidth: 20, textAlign: 'center' }}
                          >
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              updateCartItemQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="body2">
                          {formatCurrency(item.price)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ textAlign: 'right', fontWeight: 500 }}
                        >
                          {formatCurrency(item.total)}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Paper>

            {/* Order Summary */}
            <Box sx={{ mt: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Subtotal</Typography>
                <Typography variant="body2">{formatCurrency(subtotal)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">VAT (15%)</Typography>
                <Typography variant="body2">{formatCurrency(tax)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">TOTAL</Typography>
                <Typography variant="h6">{formatCurrency(total)}</Typography>
              </Box>
            </Box>

            {/* Payment Method */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                gutterBottom
              >
                PAYMENT METHOD
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <Button
                  variant={paymentMethod === 'cash' ? 'contained' : 'outlined'}
                  onClick={() => setPaymentMethod('cash')}
                  startIcon={<AttachMoneyIcon />}
                  fullWidth
                >
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'contained' : 'outlined'}
                  onClick={() => setPaymentMethod('card')}
                  startIcon={<CreditCardIcon />}
                  fullWidth
                >
                  Card
                </Button>
                <Button
                  variant={paymentMethod === 'mobile' ? 'contained' : 'outlined'}
                  onClick={() => setPaymentMethod('mobile')}
                  startIcon={<AccountBalanceWalletIcon />}
                  fullWidth
                >
                  Mobile
                </Button>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleFinalizeSale}
                disabled={cart.length === 0}
                startIcon={<ReceiptIcon />}
                sx={{
                  bgcolor: '#16a34a',
                  '&:hover': { bgcolor: '#15803d' },
                }}
              >
                FINALIZE & PRINT FISCAL RECEIPT
              </Button>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={clearCart}
                disabled={cart.length === 0}
                sx={{
                  bgcolor: '#dc2626',
                  '&:hover': { bgcolor: '#b91c1c' },
                }}
              >
                Clear Sale
              </Button>
            </Box>

            {/* Receipt preview approximating printed slip */}
            {lastReceipt && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 2,
                  border: `1px dashed ${theme.palette.divider}`,
                  maxWidth: 320,
                  mx: 'auto',
                  bgcolor: '#ffffff',
                  fontFamily: 'monospace',
                }}
              >
                {(() => {
                  const fiscal = lastReceipt.fiscal || {};
                  const identity = fiscal.fiscal_identity || {};

                  return (
                    <>
                      {/* Header with trade name and top QR placeholder */}
                      <Box sx={{ textAlign: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {identity.trade_name || 'Store Name'}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {identity.tax_payer_name || 'Registered Tax Payer'}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {identity.address || 'Address'}
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            width: 96,
                            height: 96,
                            mx: 'auto',
                            border: `2px solid ${theme.palette.grey[400]}`,
                            borderRadius: 1,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 8,
                              bgcolor: theme.palette.grey[200],
                              backgroundImage:
                                'repeating-linear-gradient(45deg, rgba(0,0,0,0.15) 0, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px)',
                            }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      {/* Order meta */}
                      <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                        *** TAKE - AWAY ***
                      </Typography>
                      <Typography variant="caption" display="block">
                        Order Num: {lastReceipt.id}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Fiscal Day: {identity.fiscal_day_no ?? '-'} | REC GN: {fiscal.receiptID ?? '-'}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Cashier: {lastReceipt.cashier}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                        {new Date(lastReceipt.date).toLocaleString()}
                      </Typography>

                      <Divider sx={{ my: 1 }} />

                      {/* Line items */}
                      <Box sx={{ mb: 1 }}>
                        {lastReceipt.items?.map((item: any) => (
                          <Box
                            key={item.id}
                            sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}
                          >
                            <Box sx={{ maxWidth: '60%' }}>{item.name}</Box>
                            <Box>
                              {item.quantity} x {formatCurrency(item.price)}
                            </Box>
                          </Box>
                        ))}
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      {/* Totals */}
                      <Box sx={{ fontSize: '0.75rem' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Subtotal</span>
                          <span>{formatCurrency(lastReceipt.subtotal)}</span>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>VAT 15%</span>
                          <span>{formatCurrency(lastReceipt.tax)}</span>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, fontWeight: 700 }}>
                          <span>Total</span>
                          <span>{formatCurrency(lastReceipt.total)}</span>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      {/* Fiscal identity block */}
                      <Box sx={{ fontSize: '0.7rem', mb: 1 }}>
                        <Typography variant="caption" display="block">
                          BP No: {identity.bp_number || '-'}
                        </Typography>
                        <Typography variant="caption" display="block">
                          VAT No: {identity.vat_number || '-'}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Device Id: {identity.device_id || '123456'}
                        </Typography>
                      </Box>

                      {/* Verification section with bottom QR placeholder */}
                      <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            mx: 'auto',
                            border: `2px solid ${theme.palette.grey[400]}`,
                            borderRadius: 1,
                            position: 'relative',
                            overflow: 'hidden',
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 8,
                              bgcolor: theme.palette.grey[200],
                              backgroundImage:
                                'repeating-linear-gradient(45deg, rgba(0,0,0,0.15) 0, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px)',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" display="block">
                          Verification Code: {(fiscal.hash || '').slice(0, 16) || '--------'}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Verify at https://fdms.zimra.co.zw
                        </Typography>
                      </Box>
                    </>
                  );
                })()}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default MainPOS;
