
import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, X, Sparkles, Loader, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { MOCK_PRODUCTS } from '../services/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { performSemanticSearch } from '../services/geminiService';

const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Price Slider State
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const minLimit = 0;
  const maxLimit = 1000;

  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      if(isSupabaseConfigured()) {
          const { data, error } = await supabase.from('products').select('*');
          if(!error && data) {
              setProducts(data as Product[]);
          } else {
             setProducts(MOCK_PRODUCTS);
          }
      } else {
          // Simulate network delay for demo to show off the skeleton loader
          setTimeout(() => {
            setProducts(MOCK_PRODUCTS);
          }, 800);
      }
      setLoading(false);
    };

    fetchProducts();

    // Real-time Stock Updates
    let subscription: any;
    if (isSupabaseConfigured()) {
        subscription = supabase
        .channel('public:products')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
            const updatedProduct = payload.new as Product;
            setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        })
        .subscribe();
    }

    return () => {
        if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    if (!aiLoading) {
        applyLocalFilters();
    }
  }, [selectedCategories, search, products, minPrice, maxPrice, sortBy, aiLoading]);

  const applyLocalFilters = () => {
    let result = [...products];

    // Filter by Search (Simple Text)
    if (search && !aiLoading) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by Category (Multi-select)
    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }

    // Filter by Price
    result = result.filter(p => p.price >= minPrice && p.price <= maxPrice);

    // Sort
    if (sortBy === 'priceLow') {
        result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'priceHigh') {
        result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortBy === 'name') {
        result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'rating') {
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    setFilteredProducts(result);
  };

  const handleAiSearch = async () => {
      if (!search.trim()) return;
      setAiLoading(true);
      
      const matchedIds = await performSemanticSearch(search, products);
      
      if (matchedIds.length > 0) {
          const matchedProducts = products.filter(p => matchedIds.includes(p.id));
          setFilteredProducts(matchedProducts);
      } else {
          setFilteredProducts([]);
      }
      
      setCurrentPage(1);
      setAiLoading(false);
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const categories = Array.from(new Set(products.map((p) => p.category)));
  
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
        setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
        setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const clearFilters = () => {
      setSearch('');
      setSelectedCategories([]);
      setMinPrice(0);
      setMaxPrice(1000);
      setSortBy('featured');
      applyLocalFilters(); 
  };

  // Price Slider Helpers
  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.min(Number(e.target.value), maxPrice - 10);
      setMinPrice(val);
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(Number(e.target.value), minPrice + 10);
      setMaxPrice(val);
  };

  // Enhanced Loading Skeleton
  const ProductSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="aspect-w-1 aspect-h-1 w-full relative overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ transform: 'skewX(-20deg)' }}></div>
        </div>
        <div className="p-5 space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
            <div className="flex justify-between items-center pt-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shop</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Explore our latest arrivals</p>
        </div>
        
        <button 
            className="md:hidden flex items-center justify-center w-full py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
            onClick={() => setShowFilters(!showFilters)}
        >
            <Filter className="w-4 h-4 mr-2" /> Filters
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className={`w-full md:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm sticky top-24 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
                  
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center"><Filter className="w-4 h-4 mr-2"/> Filters</h3>
                    <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">Reset</button>
                  </div>

                  {/* Search */}
                  <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <Sparkles className="w-3 h-3 text-blue-500 mr-1" /> AI Search
                      </h4>
                      <div className="relative group">
                          <input
                            type="text"
                            placeholder="Search for products like 'summer dresses under $50'"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                            className="pl-3 pr-10 py-3 w-full border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all shadow-sm focus:shadow-md"
                          />
                          <button 
                            onClick={handleAiSearch}
                            disabled={aiLoading}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                             {aiLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          </button>
                      </div>
                  </div>

                  {/* Categories */}
                  <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Categories</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {categories.map(c => (
                              <label key={c} className="flex items-center cursor-pointer group">
                                  <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedCategories.includes(c)} 
                                        onChange={() => toggleCategory(c)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                                    />
                                  </div>
                                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c}</span>
                              </label>
                          ))}
                      </div>
                  </div>

                  {/* Price Range Slider */}
                  <div className="mb-8">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Price Range</h4>
                      
                      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
                          <div 
                              className="absolute h-full bg-blue-600 rounded-full" 
                              style={{ 
                                  left: `${(minPrice / maxLimit) * 100}%`, 
                                  right: `${100 - (maxPrice / maxLimit) * 100}%` 
                              }} 
                          />
                          <input 
                              type="range" 
                              min={minLimit} 
                              max={maxLimit} 
                              value={minPrice} 
                              onChange={handleMinPriceChange}
                              className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                          />
                          <input 
                              type="range" 
                              min={minLimit} 
                              max={maxLimit} 
                              value={maxPrice} 
                              onChange={handleMaxPriceChange}
                              className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                          />
                          
                          <div 
                            className="absolute w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow top-1/2 transform -translate-y-1/2 -ml-2 pointer-events-none z-10"
                            style={{ left: `${(minPrice / maxLimit) * 100}%` }}
                          ></div>
                          <div 
                            className="absolute w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow top-1/2 transform -translate-y-1/2 -ml-2 pointer-events-none z-10"
                            style={{ left: `${(maxPrice / maxLimit) * 100}%` }}
                          ></div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                          <div className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-300">
                              ${minPrice}
                          </div>
                          <div className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-300">
                              ${maxPrice}
                          </div>
                      </div>
                  </div>

                  {/* Sort By */}
                   <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sort By</h4>
                      <div className="relative">
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 px-3 pr-8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                            <option value="featured">Featured</option>
                            <option value="newest">Newest Arrivals</option>
                            <option value="rating">Rating (High to Low)</option>
                            <option value="priceLow">Price: Low to High</option>
                            <option value="priceHigh">Price: High to Low</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4 pointer-events-none" />
                      </div>
                  </div>
              </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 relative">
            {/* AI Loading Overlay */}
            {aiLoading && (
                <div className="absolute inset-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl h-96">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-spin border-t-blue-600"></div>
                        <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 w-6 h-6 animate-pulse" />
                    </div>
                    <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-200 animate-pulse">Consulting AI...</p>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => (
                        <ProductSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <>
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <SlidersHorizontal className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-xl text-gray-500 dark:text-gray-400">No products match your criteria.</p>
                            <button 
                                onClick={clearFilters}
                                className="mt-4 text-blue-600 hover:text-blue-500 font-medium"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length} results</span>
                                {search && <span className="hidden sm:inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">Search: "{search}"</span>}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {currentItems.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-center space-x-2">
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                currentPage === page 
                                                ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
          </div>
      </div>
    </div>
  );
};

export default ShopPage;
