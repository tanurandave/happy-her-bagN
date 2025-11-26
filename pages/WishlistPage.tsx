import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

const WishlistPage: React.FC = () => {
  const { wishlist, loading } = useWishlist();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen dark:bg-gray-900 transition-colors duration-200">
      <div className="flex items-center mb-8">
        <Heart className="w-8 h-8 text-red-500 mr-3 fill-current" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Wishlist</h1>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Save items you love to revisit later.</p>
          <Link
            to="/shop"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {wishlist.map((item) => (
             item.product ? (
                <ProductCard key={item.id} product={item.product} />
             ) : null
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
