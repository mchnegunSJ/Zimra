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
  ListItemText, 
  TextField, 
  Typography, 
  Paper,
  useTheme,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogContent
} from '@mui/material';
import { 
  Add as AddIcon, 
  Remove as RemoveIcon, 
  Receipt as ReceiptIcon,
  AttachMoney as AttachMoneyIcon,
  CreditCard as CreditCardIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Search as SearchIcon,
  Logout as LogoutIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'react-qr-code'; 
import { useAuth } from '../../contexts/AuthContext'; 
import { Product, CartItem } from '../../types'; 

// MOCK DATA 
const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Espresso (Single)', price: 2.50, taxInclusive: true, taxRate: 0.15 },
  { id: '2', name: 'Espresso (Double)', price: 3.50, taxInclusive: true, taxRate: 0.15 },
  { id: '3', name: 'Cappuccino', price: 3.75, taxInclusive: true, taxRate: 0.15 },
  { id: '4', name: 'Latte', price: 4.00, taxInclusive: true, taxRate: 0.15 },
  { id: '5', name: 'Almond Croissant', price: 3.25, taxInclusive: true, taxRate: 0.15 },
  { id: '6', name: 'Chocolate Chip Cookie', price: 2.75, taxInclusive: true, taxRate: 0.15 },
  { id: '7', name: 'Bag of Whole Beans (Col)', price: 12.99, taxInclusive: true, taxRate: 0.15 },
  { id: '8', name: 'Bag of Whole Beans (Eth)', price: 14.99, taxInclusive: true, taxRate: 0.15 },
];

// Helper to bypass strict Grid typing issues in some MUI versions
const AnyGrid: any = Grid;

const MainPOS: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { logout, user } = useAuth(); 

  // --- STATE ---
  const [deviceID, setDeviceID] = useState<string>("");
  const [isDayOpen, setIsDayOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null); 

  // --- 1. FETCH DEVICE STATUS ON LOAD ---
  useEffect(() => {
    const fetchStatus = async () => {
        try {
            // FIX: Cast to <any> to solve TS18046 error
            const res = await axios.get<any>('http://localhost:5000/api/device/status');
            const data = res.data; 
            setDeviceID(data.deviceID || "UNKNOWN");
            setIsDayOpen(!!data.is_day_open);
        } catch (e) {
            console.error("Failed to fetch device status");
        }
    };
    fetchStatus();
  }, []);

  // --- FILTERING ---
  const filteredProducts = MOCK_PRODUCTS.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- TOTALS CALCULATOR ---
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.15; 
  const total = subtotal + tax; 

  // --- CART OPERATIONS ---
  const addToCart = () => {
    if (!selectedProduct || quantity <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === selectedProduct.id);
      
      if (existing) {
        return prev.map(item => {
            if (item.id === selectedProduct.id) {
                const newQty = item.quantity + quantity;
                const lineTotal = selectedProduct.price * newQty;
                const taxAmount = lineTotal * selectedProduct.taxRate;
                
                // Return updated item with all required fields
                return { 
                    ...item, 
                    quantity: newQty,
                    total: lineTotal,
                    taxAmount: taxAmount 
                };
            }
            return item;
        });
      }
      
      // FIX: Calculate total & taxAmount for new item to satisfy TS2345
      const lineTotal = selectedProduct.price * quantity;
      const taxAmount = lineTotal * selectedProduct.taxRate;

      const newItem: CartItem = {
          ...selectedProduct,
          quantity: quantity,
          total: lineTotal,
          taxAmount: taxAmount
      };
      
      return [...prev, newItem];
    });

    setSelectedProduct(null);
    setQuantity(1);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
        if (item.id === id) {
            const newQty = Math.max(0, item.quantity + delta);
            const lineTotal = item.price * newQty;
            const taxAmount = lineTotal * item.taxRate;
            
            return { 
                ...item, 
                quantity: newQty,
                total: lineTotal,
                taxAmount: taxAmount
            };
        }
        return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  // --- CORE LOGIC: FISCALISATION ---
  const handleFinalizeSale = async () => {
    if (!isDayOpen) {
        alert("Fiscal Day is CLOSED. Please open the day first.");
        return;
    }
    
    setIsLoading(true);
    try {
      // FIX: Cast to <any> to solve TS18046 error
      const response = await axios.post<any>('http://localhost:5000/api/submit-receipt', {
        deviceID: deviceID,
        totalAmount: total,
        currency: "USD",
        items: cart 
      });

      const backendData = response.data; // Now safe to use

      if (backendData.status === 'success') {
        
        // 2. Map backend + static store data to Receipt object
        const receiptData = {
            // --- Dynamic Fields from Backend ---
            invoiceNo:    backendData.invoiceNo,
            globalNo:     backendData.globalNo,
            date:         backendData.date,
            qr_data:      backendData.qr_data,
            verification: backendData.verification,

            // --- Static Fields ---
            storeName:    "Big Old Cravings & Bakeries",
            address:      "123 Main Street, Bulawayo",
            bpNumber:     "200123456",
            vatNumber:    "100123456",

            // --- Local Cart Data ---
            items:        [...cart],
            total:        total,
            paymentMethod,
            cashier:      user?.name || "Admin"
        };

        setLastReceipt(receiptData);
        setCart([]); 
      }
    } catch (error: any) {
      console.error("Fiscal Error", error);
      alert(`Fiscalisation Failed: ${error.response?.data?.message || "Check Backend Connection"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Box>
            <Typography variant="h4" fontWeight="800" color="primary">LithiTrust POS</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                    width: 12, height: 12, borderRadius: '50%', 
                    bgcolor: isDayOpen ? 'success.main' : 'error.main' 
                }} />
                <Typography variant="caption" fontWeight="bold">
                    DEVICE: {deviceID} | STATUS: {isDayOpen ? "OPEN" : "CLOSED"}
                </Typography>
            </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<HistoryIcon />} variant="outlined" onClick={() => navigate('/end-of-day')}>
                End of Day
            </Button>
            <Button startIcon={<LogoutIcon />} color="error" onClick={logout}>
                Logout
            </Button>
        </Box>
      </Box>

      {/* MAIN CONTENT GRID - Using AnyGrid to bypass strict typing issues */}
      <AnyGrid container spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT: PRODUCTS */}
        <AnyGrid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
           {/* Search & Inputs */}
           <Paper sx={{ p: 2, mb: 2 }}>
             <TextField 
                fullWidth placeholder="Search Products..." variant="outlined" size="small"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon/></InputAdornment> }}
             />
           </Paper>

           {/* Product List */}
           <Box sx={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
             {filteredProducts.map((prod) => (
               <Card 
                 key={prod.id} 
                 sx={{ 
                   cursor: 'pointer', transition: '0.2s',
                   border: selectedProduct?.id === prod.id ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
                   '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                 }}
                 onClick={() => setSelectedProduct(prod)}
               >
                 <CardContent sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>{prod.name}</Typography>
                    <Typography variant="h6" color="primary">${prod.price.toFixed(2)}</Typography>
                 </CardContent>
               </Card>
             ))}
           </Box>

           {/* Add Controls */}
           <Paper sx={{ mt: 2, p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField 
                label="Qty" type="number" size="small" sx={{ width: 80 }}
                value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              <TextField 
                fullWidth disabled size="small" 
                value={selectedProduct ? selectedProduct.name : "Select a product above"} 
              />
              <Button 
                variant="contained" size="large" disabled={!selectedProduct}
                onClick={addToCart} startIcon={<AddIcon />}
              >
                Add
              </Button>
           </Paper>
        </AnyGrid>

        {/* RIGHT: CART & PAY */}
        <AnyGrid item xs={12} md={5} sx={{ height: '100%' }}>
           <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f9fafb' }}>
             <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Current Sale</Typography>
                
                {/* Cart Items */}
                <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'white', borderRadius: 1, border: '1px solid #eee' }}>
                    <List dense>
                        {cart.length === 0 && (
                            <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                Cart is empty
                            </Typography>
                        )}
                        {cart.map((item) => (
                            <ListItem key={item.id} divider>
                                <ListItemText 
                                    primary={item.name} 
                                    secondary={`$${item.price.toFixed(2)} each`} 
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton size="small" onClick={() => updateQuantity(item.id, -1)}><RemoveIcon fontSize="small"/></IconButton>
                                    <Typography fontWeight="bold">{item.quantity}</Typography>
                                    <IconButton size="small" onClick={() => updateQuantity(item.id, 1)}><AddIcon fontSize="small"/></IconButton>
                                    <Typography fontWeight="bold" sx={{ minWidth: 50, textAlign: 'right' }}>
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </Typography>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                </Box>

                {/* Totals */}
                <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Subtotal</Typography>
                        <Typography>${subtotal.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Tax (15%)</Typography>
                        <Typography>${tax.toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h5" fontWeight="bold">Total</Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary">${total.toFixed(2)}</Typography>
                    </Box>
                </Box>

                {/* Payment Methods */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    {['cash', 'card', 'mobile'].map((method) => (
                        <Button 
                            key={method}
                            variant={paymentMethod === method ? 'contained' : 'outlined'}
                            onClick={() => setPaymentMethod(method as any)}
                            startIcon={method === 'cash' ? <AttachMoneyIcon/> : method === 'card' ? <CreditCardIcon/> : <AccountBalanceWalletIcon/>}
                            fullWidth size="small" sx={{ textTransform: 'capitalize' }}
                        >
                            {method}
                        </Button>
                    ))}
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button variant="outlined" color="error" fullWidth onClick={clearCart}>
                        Clear
                    </Button>
                    <Button 
                        variant="contained" color="success" fullWidth size="large"
                        onClick={handleFinalizeSale}
                        disabled={cart.length === 0 || isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} color="inherit"/> : <ReceiptIcon/>}
                    >
                        {isLoading ? "Signing..." : "PAY & PRINT"}
                    </Button>
                </Box>
             </CardContent>
           </Card>
        </AnyGrid>
      </AnyGrid>

      {/* --- RECEIPT MODAL --- */}
      <Dialog open={!!lastReceipt} onClose={() => setLastReceipt(null)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', p: 3, fontFamily: 'monospace', bgcolor: '#fff' }}>
           <Typography variant="h6" fontWeight="bold">{lastReceipt?.storeName}</Typography>
           <Typography variant="caption">{lastReceipt?.address}</Typography>
           <Divider sx={{ my: 1 }} />
           
           <Box sx={{ textAlign: 'left', fontSize: '0.8rem' }}>
              <Typography variant="caption">BP No: {lastReceipt?.bpNumber}</Typography><br/>
              <Typography variant="caption">VAT No: {lastReceipt?.vatNumber}</Typography><br/>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption">Date: {lastReceipt?.date}</Typography><br/>
              <Typography variant="caption">Invoice: {lastReceipt?.invoiceNo}</Typography><br/>
              <Typography variant="caption">Global No: {lastReceipt?.globalNo}</Typography><br/>
              <Typography variant="caption">Device ID: {deviceID}</Typography>
           </Box>

           <Divider sx={{ my: 1 }} />
           {/* Items List */}
           <Box sx={{ textAlign: 'left', mb: 2 }}>
             {lastReceipt?.items.map((item: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>{item.quantity} x {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                </Box>
             ))}
           </Box>
           <Divider sx={{ my: 1 }} />
           <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>TOTAL PAID</span>
              <span>${lastReceipt?.total.toFixed(2)}</span>
           </Box>
           <Divider sx={{ my: 2 }} />

           {/* THE REAL QR CODE */}
           <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              {lastReceipt?.qr_data && (
                  <QRCode value={lastReceipt.qr_data} size={128} />
              )}
           </Box>
           
           {lastReceipt?.verification && (
               <>
                <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', wordBreak: 'break-all', mt: 1 }}>
                    <strong>FISCAL HASH:</strong><br/>
                    {lastReceipt.verification.device_hash}
                </Typography>
                <Typography variant="caption" fontWeight="bold" display="block" sx={{ mt: 1, color: lastReceipt.verification.server_status === 'VERIFIED' ? 'green' : 'orange' }}>
                    ZIMRA STATUS: {lastReceipt.verification.server_status || "PENDING"}
                </Typography>
               </>
           )}
           
           <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={() => setLastReceipt(null)}>
              Start New Sale
           </Button>
        </DialogContent>
      </Dialog>

    </Box>
  );
};

export default MainPOS;