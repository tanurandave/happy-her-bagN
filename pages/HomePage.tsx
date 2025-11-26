import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { MOCK_PRODUCTS } from '../services/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getCuratedRecommendations } from '../services/geminiService';

const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<Product[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
        let allProducts: Product[] = MOCK_PRODUCTS;

        if(isSupabaseConfigured()) {
            const { data } = await supabase.from('products').select('*');
            if(data && data.length > 0) {
                allProducts = data as Product[];
            }
        }
        
        // Set basic featured
        setFeaturedProducts(allProducts.slice(0, 4));

        // Get AI Recommendations
        setLoadingAi(true);
        const recommendedIds = await getCuratedRecommendations(allProducts);
        if (recommendedIds.length > 0) {
            const recs = allProducts.filter(p => recommendedIds.includes(p.id));
            setAiRecommendations(recs);
        } else {
             // Fallback if AI fails or no key
            setAiRecommendations(allProducts.slice(0, 4).reverse());
        }
        setLoadingAi(false);
    };
    loadProducts();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            className="w-full h-full object-cover opacity-30"
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Hero background"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Discover Future Tech <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Today.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-gray-300 mb-8">
            Experience the next generation of shopping with Lumina. Real-time updates, AI-powered recommendations, and premium quality.
          </p>
          <div className="flex gap-4">
            <Link
              to="/shop"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-gray-900 bg-white hover:bg-gray-50 transition-colors shadow-lg"
            >
              Shop Now <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Banner */}
      <section className="bg-white dark:bg-gray-900 py-12 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Trending Items</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Updated hourly based on sales</p>
                </div>
            </div>
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Star className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Premium Quality</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Verified authentic brands</p>
                </div>
            </div>
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="p-3 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Secure Payment</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">100% secure checkout via Stripe</p>
                </div>
            </div>
        </div>
      </section>

       {/* AI Picks */}
       <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900/50 rounded-3xl my-10">
        <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Gemini's Curated Picks</h2>
            </div>
            <Link to="/shop" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium flex items-center">
                View all <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
        </div>
        
        {loadingAi ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1,2,3,4].map(i => <div key={i} className="h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>)}
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {aiRecommendations.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
            </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Latest Arrivals</h2>
            <Link to="/shop" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium flex items-center">
                View all <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;