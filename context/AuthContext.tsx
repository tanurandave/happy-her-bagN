import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  loginAsDemoAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Mock User for demo if no backend
      setLoading(false);
      return;
    }

    const fetchProfile = async (session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data && !error) {
        setUser(data as UserProfile);
      } else {
        // Fallback if profile trigger failed or first run
        setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: 'customer'
        });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginAsDemoAdmin = async () => {
    setUser({
        id: 'demo-admin-' + Math.random().toString(36).substr(2, 9),
        email: 'admin@happyherbag.com',
        role: 'admin',
        full_name: 'Demo Admin'
    });
  };

  const signUp = async (email: string, password: string, fullName: string) => {
      if(!isSupabaseConfigured()) {
          alert("Supabase not configured. Mock registration successful.");
          return;
      }
      // 1. Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: { full_name: fullName }
          }
      });
      if (error) throw error;

      // 2. Create Profile manually (if no SQL trigger)
      if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert([{
              id: data.user.id,
              email: email,
              full_name: fullName,
              role: 'customer'
          }]);
          // Ignore duplicate key error if trigger already exists
          if (profileError && profileError.code !== '23505') { 
              console.error("Profile creation failed:", profileError);
          }
      }
  };

  const signIn = async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (trimmedEmail === 'admin@happyherbag.com' && !isSupabaseConfigured()) {
        await loginAsDemoAdmin();
        return;
    }

    if(!isSupabaseConfigured()) {
        alert("Supabase not configured. Using mock login.");
        setUser({
            id: 'mock-user-' + Math.random().toString(36).substr(2, 9),
            email: trimmedEmail,
            role: trimmedEmail.includes('admin') ? 'admin' : 'customer',
            full_name: trimmedEmail.split('@')[0]
        });
        return;
    }

    const { error } = await supabase.auth.signInWithPassword({ 
        email: trimmedEmail,
        password 
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
      if(!isSupabaseConfigured()) {
          alert("Supabase not configured. Mock reset link sent.");
          return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
  };

  const signOut = async () => {
    if(isSupabaseConfigured()) await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        signIn,
        signUp,
        resetPassword,
        signOut, 
        isAdmin: user?.role === 'admin',
        loginAsDemoAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};