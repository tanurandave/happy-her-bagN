import React, { useState, useEffect } from 'react';
import { Star, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Review } from '../types';
import { useAuth } from '../context/AuthContext';

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReviews();

    // Real-time subscription for new reviews
    const channel = supabase
      .channel(`reviews:${productId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'reviews', filter: `product_id=eq.${productId}` }, 
        async (payload) => {
            const newReview = payload.new as Review;
            
            // We need to fetch the user profile name because the realtime payload only has the user_id
            const { data: userData } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', newReview.user_id)
                .single();

            const reviewWithUser = {
                ...newReview,
                user: userData ? { full_name: userData.full_name, id: newReview.user_id, email: '' } : { id: newReview.user_id, email: '', full_name: 'Anonymous' }
            };

            setReviews((prev) => {
                // Prevent duplicates if fetchReviews was also triggered
                if (prev.find(r => r.id === newReview.id)) return prev;
                return [reviewWithUser, ...prev];
            });
        }
      )
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [productId]);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles:user_id(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (data) {
        const formattedReviews = data.map((item: any) => ({
            ...item,
            user: item.profiles
        }));
        setReviews(formattedReviews);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login to write a review');
    
    setLoading(true);
    const { error } = await supabase.from('reviews').insert([
      {
        user_id: user.id,
        product_id: productId,
        rating,
        comment
      }
    ]);

    if (error) {
      alert('Error submitting review');
    } else {
      setComment('');
      // We don't strictly need fetchReviews() here because the Realtime subscription will catch our own insert,
      // but keeping it ensures consistency if realtime is disconnected.
      fetchReviews(); 
    }
    setLoading(false);
  };

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Customer Reviews</h3>

      {user && (
        <form onSubmit={handleSubmit} className="mb-10 bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold mb-4 dark:text-white">Write a Review</h4>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rating</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`focus:outline-none ${star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              placeholder="How was the product?"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      <div className="space-y-6">
        {reviews.length === 0 && <p className="text-gray-500 dark:text-gray-400 italic">No reviews yet. Be the first!</p>}
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-6 last:border-0 animate-fade-in-up">
            <div className="flex items-center mb-2">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-2 mr-3">
                <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{review.user?.full_name || 'Anonymous'}</p>
                <div className="flex text-yellow-400 text-xs">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-200 dark:text-gray-600 fill-gray-200 dark:fill-gray-600'}`} />
                  ))}
                </div>
              </div>
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm pl-11">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductReviews;