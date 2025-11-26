import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Product, WishlistItem } from '../types';

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Load wishlist on mount or user change
  useEffect(() => {
    if (user) {
      if (isSupabaseConfigured()) {
        fetchWishlist();
      } else {
        // Fallback for demo/mock auth users (simulate empty or mock wishlist)
        setWishlist([]);
      }
    } else {
      // Guest Mode: Load from LocalStorage
      const savedGuestWishlist = localStorage.getItem('guest_wishlist');
      if (savedGuestWishlist) {
        try {
          setWishlist(JSON.parse(savedGuestWishlist));
        } catch (e) {
          console.error("Failed to parse guest wishlist", e);
          setWishlist([]);
        }
      } else {
        setWishlist([]);
      }
    }
  }, [user]);

  const fetchWishlist = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('wishlist')
      .select('*, product:products(*)')
      .eq('user_id', user.id);

    if (!error && data) {
      setWishlist(data as WishlistItem[]);
    }
    setLoading(false);
  };

  const addToWishlist = async (product: Product) => {
    // 1. GUEST MODE
    if (!user) {
        const guestItem: WishlistItem = {
            id: Math.random().toString(36).substr(2, 9),
            user_id: 'guest',
            product_id: product.id,
            created_at: new Date().toISOString(),
            product: product
        };
        const updatedWishlist = [...wishlist, guestItem];
        setWishlist(updatedWishlist);
        localStorage.setItem('guest_wishlist', JSON.stringify(updatedWishlist));
        return;
    }

    // 2. AUTHENTICATED MODE
    // Optimistic Update
    const tempId = Math.random().toString();
    const newItem: WishlistItem = {
        id: tempId,
        user_id: user.id,
        product_id: product.id,
        created_at: new Date().toISOString(),
        product: product
    };
    setWishlist(prev => [...prev, newItem]);

    if(isSupabaseConfigured()) {
        const { data, error } = await supabase
        .from('wishlist')
        .insert([{ user_id: user.id, product_id: product.id }])
        .select('*, product:products(*)')
        .single();

        if (error) {
            console.error("Error adding to wishlist", error);
            // Revert on error
            setWishlist(prev => prev.filter(item => item.id !== tempId)); 
        } else if (data) {
             // Replace temp item with real DB item
             setWishlist(prev => prev.map(item => item.id === tempId ? (data as WishlistItem) : item));
        }
    }
  };

  const removeFromWishlist = async (productId: string) => {
    // 1. GUEST MODE
    if (!user) {
        const updatedWishlist = wishlist.filter(item => item.product_id !== productId);
        setWishlist(updatedWishlist);
        localStorage.setItem('guest_wishlist', JSON.stringify(updatedWishlist));
        return;
    }

    // 2. AUTHENTICATED MODE
    const previousWishlist = [...wishlist];
    setWishlist(prev => prev.filter(item => item.product_id !== productId));

    if(isSupabaseConfigured()) {
        const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

        if (error) {
            console.error("Error removing from wishlist", error);
            setWishlist(previousWishlist); // Revert
        }
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.product_id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
};