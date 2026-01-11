import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, FiscalDay, DeviceStatus } from '../types';

interface AuthContextType {
  user: User | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  fiscalDay: FiscalDay | null;
  deviceStatus: DeviceStatus;
  startFiscalDay: () => Promise<boolean>;
  closeFiscalDay: () => Promise<boolean>;
  generateKeys: () => Promise<boolean>;
}

const defaultFiscalDay: FiscalDay = {
  isOpen: false,
  date: new Date().toISOString().split('T')[0],
  openedAt: '',
  closedAt: null,
  totalSales: 0,
  totalTax: 0,
  receiptCount: 0,
};

const defaultDeviceStatus: DeviceStatus = {
  isConfigured: false,
  deviceId: null,
  serialNo: null,
  csrStatus: 'Not Generated',
  certificate: null,
};

// Mock users - in a real app, this would come from a backend
const MOCK_USERS: User[] = [
  { id: '1', name: 'Manager', pin: '1234', role: 'manager' },
  { id: '2', name: 'Shepherd', pin: '1111', role: 'cashier' },
  { id: '3', name: 'Jane', pin: '2222', role: 'cashier' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [fiscalDay, setFiscalDay] = useState<FiscalDay | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(defaultDeviceStatus);

  // Load initial state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedFiscalDay = localStorage.getItem('fiscalDay');
    const storedDeviceStatus = localStorage.getItem('deviceStatus');

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedFiscalDay) setFiscalDay(JSON.parse(storedFiscalDay));
    if (storedDeviceStatus) setDeviceStatus(JSON.parse(storedDeviceStatus));
  }, []);

  const login = async (pin: string): Promise<boolean> => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const foundUser = MOCK_USERS.find(u => u.pin === pin);
        if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('user', JSON.stringify(foundUser));

          // For cashier logins, always start with fiscal day CLOSED so
          // they see the "Start Fiscal Day" screen after entering PIN.
          if (foundUser.role === 'cashier') {
            const newFiscalDay: FiscalDay = {
              ...defaultFiscalDay,
              date: new Date().toISOString().split('T')[0],
              isOpen: false,
            };
            setFiscalDay(newFiscalDay);
            localStorage.setItem('fiscalDay', JSON.stringify(newFiscalDay));
          }
          resolve(true);
        } else {
          resolve(false);
        }
      }, 500);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const startFiscalDay = async (): Promise<boolean> => {
    // In a real app, this would call an API
    return new Promise((resolve) => {
      setTimeout(() => {
        const newFiscalDay: FiscalDay = {
          isOpen: true,
          date: new Date().toISOString().split('T')[0],
          openedAt: new Date().toISOString(),
          closedAt: null,
          totalSales: 0,
          totalTax: 0,
          receiptCount: 0,
        };
        setFiscalDay(newFiscalDay);
        localStorage.setItem('fiscalDay', JSON.stringify(newFiscalDay));
        resolve(true);
      }, 1000);
    });
  };

  const closeFiscalDay = async (): Promise<boolean> => {
    // In a real app, this would call an API
    return new Promise((resolve) => {
      if (!fiscalDay) return resolve(false);
      
      setTimeout(() => {
        const closedFiscalDay: FiscalDay = {
          ...fiscalDay,
          isOpen: false,
          closedAt: new Date().toISOString(),
        };
        setFiscalDay(closedFiscalDay);
        localStorage.setItem('fiscalDay', JSON.stringify(closedFiscalDay));
        resolve(true);
      }, 1000);
    });
  };

  const generateKeys = async (): Promise<boolean> => {
    // In a real app, this would generate actual cryptographic keys
    return new Promise((resolve) => {
      setTimeout(() => {
        const newStatus: DeviceStatus = {
          isConfigured: true,
          deviceId: `DEV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          serialNo: `SN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          csrStatus: 'Generated',
          certificate: null,
        };
        setDeviceStatus(newStatus);
        localStorage.setItem('deviceStatus', JSON.stringify(newStatus));
        resolve(true);
      }, 1500);
    });
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    fiscalDay,
    deviceStatus,
    startFiscalDay,
    closeFiscalDay,
    generateKeys,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
