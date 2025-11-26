import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Package, Shield, Truck, Star, Plus, Minus, Heart, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import ProductReviews from '../components/ProductReviews';
import LiveViewerCount from '../components/LiveViewerCount';
import { MOCK_PRODUCTS } from '../services/mockData';

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProduct();
    fetchRatingStats();

    const subscription = supabase
      .channel(`product-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${id}` }, (payload) => {
        setProduct(payload.new as Product);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setProduct(data as Product);
    } else {
        const mock = MOCK_PRODUCTS.find(p => p.id === id);
        if (mock) setProduct(mock);
    }
    setLoading(false);
  };

  const fetchRatingStats = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', id);
      
      if (data && data.length > 0) {
          const total = data.reduce((acc, curr) => acc + curr.rating, 0);
          setAvgRating(total / data.length);
          setReviewCount(data.length);
      } else {
          // Fallback to mock rating if available
          const mock = MOCK_PRODUCTS.find(p => p.id === id);
          if (mock?.rating) {
              setAvgRating(mock.rating);
              setReviewCount(Math.floor(Math.random() * 50) + 5);
          }
      }
  };

  const handleQuantityChange = (delta: number) => {
      setQuantity(prev => Math.max(1, Math.min(prev + delta, product?.stock || 10)));
  };

  const toggleWishlist = () => {
      if (!product) return;
      // Works for both Guest and User
      if (isInWishlist(product.id)) {
          removeFromWishlist(product.id);
      } else {
          addToWishlist(product);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center dark:bg-gray-900 dark:text-white">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <Link to="/shop" className="text-blue-600 hover:text-blue-500">Back to Shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen dark:bg-gray-900 transition-colors">
      <Link to="/shop" className="inline-flex items-center text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="aspect-w-1 aspect-h-1 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 relative group">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute top-4 right-4">
                <button className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-700 transition-colors">
                    <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <LiveViewerCount productId={product.id} />
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">{product.name}</h1>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center text-yellow-400">
                <span className="font-bold text-gray-900 dark:text-white mr-2 text-lg">{avgRating.toFixed(1)}</span>
                {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < Math.round(avgRating) ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                ))}
            </div>
            <span className="text-gray-400 dark:text-gray-500">|</span>
            <span className="text-gray-500 dark:text-gray-400">{reviewCount} Reviews</span>
            <span className="text-gray-400 dark:text-gray-500">|</span>
            <span className="text-green-600 dark:text-green-400 font-medium">{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
          </div>

          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            ${product.price.toFixed(2)}
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            {product.description}
          </p>

          <div className="border-t border-b border-gray-100 dark:border-gray-700 py-6 mb-8 space-y-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Truck className="w-5 h-5 mr-3 text-blue-500" />
                  <span>Free shipping on orders over $100</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Shield className="w-5 h-5 mr-3 text-blue-500" />
                  <span>2 Year Extended Warranty</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Package className="w-5 h-5 mr-3 text-blue-500" />
                  <span>30 Day Return Policy</span>
              </div>
          </div>

          <div className="mt-auto">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                {/* Quantity Selector */}
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 w-fit">
                    <button 
                        onClick={() => handleQuantityChange(-1)}
                        className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-xl transition-colors"
                        disabled={quantity <= 1}
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <div className="w-12 text-center font-bold text-gray-900 dark:text-white">{quantity}</div>
                    <button 
                        onClick={() => handleQuantityChange(1)}
                        className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-xl transition-colors"
                        disabled={quantity >= product.stock}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Buttons */}
                <button
                    onClick={() => addToCart(product, quantity)}
                    disabled={product.stock === 0}
                    className="flex-1 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg hover:shadow-xl hover:shadow-blue-600/20 transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
                </button>
                
                <button 
                    onClick={toggleWishlist}
                    className={`px-4 py-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center ${
                        isInWishlist(product.id)
                        ? 'border-red-500 bg-red-50 text-red-500 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                >
                    <Heart className={`w-6 h-6 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />
    </div>
  );
};

export default ProductDetailsPage;