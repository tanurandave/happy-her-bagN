import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Heart } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  const toggleWishlist = (e: React.MouseEvent) => {
      e.preventDefault();
      // Supports both Guest (LocalStorage) and User (Supabase) wishlist
      if (isWishlisted) {
          removeFromWishlist(product.id);
      } else {
          addToWishlist(product);
      }
  };

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl dark:hover:shadow-black/50 transition-all duration-300 flex flex-col h-full overflow-hidden transform hover:-translate-y-1">
        {/* Image Container */}
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-64 w-full object-cover object-center group-hover:scale-110 transition-transform duration-500 ease-out"
        />
        {/* Wishlist Button - Always visible on top right */}
        <button
            onClick={toggleWishlist}
            className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white dark:hover:bg-gray-700 transition-colors z-20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
        >
            <Heart className={`w-5 h-5 transition-colors duration-300 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-300 hover:text-red-500'}`} />
        </button>

        {/* Hover Overlay with Action Buttons */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px] z-10">
            <Link 
                to={`/products/${product.id}`} 
                className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75 w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full text-gray-900 dark:text-white hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 shadow-xl"
                title="View Details"
            >
                <Eye className="w-5 h-5" />
            </Link>
             <button 
                onClick={(e) => {
                    e.preventDefault();
                    addToCart(product);
                }}
                className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100 w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full text-gray-900 dark:text-white hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 shadow-xl"
                title="Add to Cart"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">{product.category}</p>
        <Link to={`/products/${product.id}`}>
             <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{product.name}</h3>
        </Link>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">{product.description}</p>
        <div className="flex items-center justify-between mt-auto border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xl font-bold text-gray-900 dark:text-white">${product.price.toFixed(2)}</p>
          <button
            onClick={() => addToCart(product)}
            className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;