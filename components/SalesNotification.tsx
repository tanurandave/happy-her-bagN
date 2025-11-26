
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ShoppingBag, X } from 'lucide-react';

const SalesNotification: React.FC = () => {
  const [notification, setNotification] = useState<{ message: string, visible: boolean } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Listen for new orders globally
    const channel = supabase
      .channel('global_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
         // In a real app with strict RLS, customers can't see other orders.
         // This listener works best for Admins. 
         // For the public site, we trigger a generic "Someone just bought something" 
         // or we use Supabase Broadcast if we implemented that backend logic.
         
         // For this demo, we assume the user might see it or we simulate activity
         triggerNotification("Someone just placed a new order!");
      })
      .subscribe();

    // SIMULATION: Because RLS usually blocks reading other users' orders, 
    // we simulate "Social Proof" traffic for the demo experience.
    const interval = setInterval(() => {
        const cities = ['New York', 'London', 'Tokyo', 'Paris', 'Berlin', 'Austin'];
        const items = ['Headphones', 'Smart Watch', 'Office Chair', 'Coffee Set'];
        
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        const randomItem = items[Math.floor(Math.random() * items.length)];
        
        // 10% chance every 30 seconds to show a fake sale for social proof
        if (Math.random() > 0.9) {
            triggerNotification(`A customer in ${randomCity} purchased ${randomItem}`);
        }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const triggerNotification = (msg: string) => {
      setNotification({ message: msg, visible: true });
      setTimeout(() => {
          setNotification(prev => prev ? { ...prev, visible: false } : null);
      }, 5000); // Hide after 5 seconds
  };

  if (!notification || !notification.visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-fade-in-up">
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-lg p-4 flex items-center space-x-4 max-w-sm">
        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
            <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Live Activity</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{notification.message}</p>
        </div>
        <button 
            onClick={() => setNotification({ ...notification, visible: false })}
            className="text-gray-400 hover:text-gray-500"
        >
            <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SalesNotification;
