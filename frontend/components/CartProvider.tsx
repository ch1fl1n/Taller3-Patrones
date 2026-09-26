'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Carrito local (estado de React + localStorage): no toca el backend hasta el checkout,
// que es cuando se ejecuta la mutation createOrder (planning.md, fase 5).

export interface CartItem {
  medicationId: string;
  commercialName: string;
  presentation: string;
  price: number;
  requiresPrescription: boolean;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  requiresPrescription: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  updateQuantity: (medicationId: string, quantity: number) => void;
  removeItem: (medicationId: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'afirmative-pill-cart';

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Restaurar el carrito guardado (solo en el navegador)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // localStorage no disponible: el carrito funciona igual, sin persistir
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignorar: persistir el carrito es solo una comodidad
    }
  }, [items, loaded]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity: number) => {
    setItems(current => {
      const existing = current.find(i => i.medicationId === item.medicationId);
      if (existing) {
        return current.map(i =>
          i.medicationId === item.medicationId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...current, { ...item, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((medicationId: string, quantity: number) => {
    setItems(current =>
      current.map(i => (i.medicationId === medicationId ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  }, []);

  const removeItem = useCallback((medicationId: string) => {
    setItems(current => current.filter(i => i.medicationId !== medicationId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      requiresPrescription: items.some(i => i.requiresPrescription),
      addItem,
      updateQuantity,
      removeItem,
      clear,
    }),
    [items, addItem, updateQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return context;
}
