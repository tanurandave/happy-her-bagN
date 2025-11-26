
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Users, Eye } from 'lucide-react';

interface LiveViewerCountProps {
  productId: string;
}

const LiveViewerCount: React.FC<LiveViewerCountProps> = ({ productId }) => {
  const [viewers, setViewers] = useState<number>(1);
  
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Generate a random user ID for anonymous presence tracking
    const userId = Math.random().toString(36).substring(7);

    const channel = supabase.channel(`product-${productId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Calculate total unique presence keys
        const count = Object.keys(state).length;
        setViewers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [productId]);

  // Don't show if it's just the current user (1 viewer)
  if (viewers <= 1) return null;

  return (
    <div className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full w-fit mb-4 animate-pulse">
      <Eye className="w-4 h-4" />
      <span className="text-sm font-semibold">
        {viewers} people are viewing this right now
      </span>
    </div>
  );
};

export default LiveViewerCount;
