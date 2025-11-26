
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Product, Order, UserProfile } from '../types';
import { Trash2, Package, ShoppingBag, DollarSign, Upload, Activity, RefreshCw, Users, Grid, Bell, X, Star, CheckSquare, Square, ChevronDown, ChevronUp, Calendar, Search, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Filter, Image as ImageIcon, Loader, MoreHorizontal, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PRODUCTS } from '../services/mockData';

const AdminDashboard: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'customers'>('overview');
  const ordersTableRef = useRef<HTMLDivElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  
  // Map to store calculated ratings: productId -> { average, count }
  const [productRatings, setProductRatings] = useState<Record<string, { average: number, count: number }>>({});

  const [loading, setLoading] = useState(true);
  
  // Products State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    stock: 0,
    image_url: ''
  });

  // Orders State
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderDateStart, setOrderDateStart] = useState('');
  const [orderDateEnd, setOrderDateEnd] = useState('');
  const [orderSort, setOrderSort] = useState<{ key: keyof Order | 'created_at', direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [filterCustomerId, setFilterCustomerId] = useState<string | null>(null);

  // Customers State
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Real-time Notification State
  const [newOrderToast, setNewOrderToast] = useState<{id: string, amount: number, customer?: string} | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    actionType: 'delete' | 'update';
  } | null>(null);

  useEffect(() => {
    // Redirect if not admin
    if (!loading && !isAdmin) {
       navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    // Auto-scroll to orders table when tab changes to orders
    if (activeTab === 'orders' && ordersTableRef.current) {
        setTimeout(() => {
            ordersTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();

    if (!isSupabaseConfigured()) return;

    // Real-time Order Notifications
    const orderSub = supabase.channel('admin_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const newOrder = payload.new as Order;
        
        // Fetch customer name for notification if possible
        let customerName = 'Customer';
        if (newOrder.user_id) {
            const { data } = await supabase.from('profiles').select('full_name').eq('id', newOrder.user_id).single();
            if (data?.full_name) customerName = data.full_name;
        }

        setNewOrderToast({ id: newOrder.id, amount: newOrder.total_amount, customer: customerName });
        
        // Refresh data to show new order in table immediately
        fetchData(); 
        
        // Play notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play failed", e));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();

    // Real-time Product Stock Updates
    const productSub = supabase.channel('admin_products')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
        setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
      })
      .subscribe();
      
    // Real-time Review Updates (to update ratings live)
    const reviewSub = supabase.channel('admin_reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
          fetchRatings(); // Re-calculate ratings on any review change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderSub);
      supabase.removeChannel(productSub);
      supabase.removeChannel(reviewSub);
    };
  }, []);

  const fetchRatings = async () => {
      if (!isSupabaseConfigured()) return;
      const { data: reviews } = await supabase.from('reviews').select('product_id, rating');
      
      if (reviews) {
          const stats: Record<string, { total: number, count: number }> = {};
          reviews.forEach((r: any) => {
              if (!stats[r.product_id]) stats[r.product_id] = { total: 0, count: 0 };
              stats[r.product_id].total += r.rating;
              stats[r.product_id].count += 1;
          });
          
          const computed: Record<string, { average: number, count: number }> = {};
          Object.keys(stats).forEach(pid => {
              computed[pid] = {
                  average: stats[pid].total / stats[pid].count,
                  count: stats[pid].count
              };
          });
          setProductRatings(computed);
      }
  };

  const fetchData = async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
        const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        
        // Fetch orders with nested items and products for images
        const { data: ordData } = await supabase
            .from('orders')
            .select(`
                *, 
                items:order_items(
                    *, 
                    product:products(name, image_url)
                )
            `)
            .order('created_at', { ascending: false });

        const { data: custData } = await supabase.from('profiles').select('*');
        
        if (prodData) setProducts(prodData as Product[]);
        if (ordData) setOrders(ordData as unknown as Order[]);
        if (custData) setCustomers(custData as UserProfile[]);

        // Fetch Ratings
        await fetchRatings();

    } else {
        setProducts(MOCK_PRODUCTS);
        // Mock Orders with items
        setOrders([
            { 
                id: 'ord_123', 
                user_id: 'user_1', 
                total_amount: 129.99, 
                status: 'processing', 
                created_at: new Date().toISOString(),
                items: [
                    { id: 'item_1', order_id: 'ord_123', product_id: '1', quantity: 1, price_at_purchase: 129.99, product: MOCK_PRODUCTS[0] }
                ]
            },
            { 
                id: 'ord_124', 
                user_id: 'user_2', 
                total_amount: 45.50, 
                status: 'shipped', 
                created_at: new Date(Date.now() - 86400000).toISOString(),
                 items: [
                    { id: 'item_2', order_id: 'ord_124', product_id: '2', quantity: 1, price_at_purchase: 45.50, product: MOCK_PRODUCTS[1] }
                ]
            },
        ]);
        // Mock Customers
        setCustomers([
            { id: 'user_1', email: 'alice@example.com', full_name: 'Alice Johnson', role: 'customer' },
            { id: 'user_2', email: 'bob@example.com', full_name: 'Bob Smith', role: 'customer' }
        ]);
    }
    setLoading(false);
  };

  // --- Confirmation Handlers ---
  const handleConfirmAction = () => {
    if (confirmModal) {
      confirmModal.onConfirm();
      setConfirmModal(null);
    }
  };

  // --- Product Handlers ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
        setUploadingImage(true);
        if (!e.target.files || e.target.files.length === 0) {
            throw new Error('You must select an image to upload.');
        }
        const file = e.target.files[0];
        
        if (isSupabaseConfigured()) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('products').getPublicUrl(filePath);
            setNewProduct({ ...newProduct, image_url: data.publicUrl });
        } else {
            // Mock upload for demo
            setTimeout(() => {
                const mockUrl = URL.createObjectURL(file);
                setNewProduct({ ...newProduct, image_url: mockUrl });
                setUploadingImage(false);
            }, 1000);
            return;
        }
    } catch (error: any) {
        alert('Error uploading image: ' + error.message);
    } finally {
        if(isSupabaseConfigured()) setUploadingImage(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSupabaseConfigured()) {
          const { data, error } = await supabase.from('products').insert([newProduct]).select();
          if (!error && data) {
              setProducts([data[0] as Product, ...products]);
              setShowAddModal(false);
              setNewProduct({ name: '', description: '', price: 0, category: '', stock: 0, image_url: '' });
          } else {
              alert("Error creating product: " + error?.message);
          }
      } else {
          const mockId = Math.random().toString(36).substr(2, 9);
          setProducts([{ ...newProduct, id: mockId } as Product, ...products]);
          setShowAddModal(false);
          setNewProduct({ name: '', description: '', price: 0, category: '', stock: 0, image_url: '' });
      }
  };

  const confirmDeleteProduct = (id: string) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Product',
        message: 'Are you sure you want to delete this product? This action cannot be undone.',
        actionType: 'delete',
        onConfirm: () => deleteProduct(id)
    });
  };

  const deleteProduct = async (id: string) => {
      if (isSupabaseConfigured()) {
          await supabase.from('products').delete().eq('id', id);
          setProducts(prev => prev.filter(p => p.id !== id));
      } else {
          setProducts(prev => prev.filter(p => p.id !== id));
      }
  };

  const toggleProductSelection = (id: string) => {
      const newSelection = new Set(selectedProductIds);
      if (newSelection.has(id)) {
          newSelection.delete(id);
      } else {
          newSelection.add(id);
      }
      setSelectedProductIds(newSelection);
  };

  const toggleSelectAllProducts = () => {
      if (selectedProductIds.size === products.length) {
          setSelectedProductIds(new Set());
      } else {
          setSelectedProductIds(new Set(products.map(p => p.id)));
      }
  };

  const confirmBulkDelete = () => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Multiple Products',
        message: `Are you sure you want to delete ${selectedProductIds.size} products? This action cannot be undone.`,
        actionType: 'delete',
        onConfirm: bulkDelete
    });
  };

  const bulkDelete = async () => {
      const idsToDelete = Array.from(selectedProductIds);
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('products').delete().in('id', idsToDelete);
          if (error) {
              alert("Error deleting products");
              return;
          }
      }
      setProducts(prev => prev.filter(p => !selectedProductIds.has(p.id)));
      setSelectedProductIds(new Set());
  };

  // --- Order Handlers ---
  const confirmUpdateOrderStatus = (orderId: string, newStatus: string) => {
      setConfirmModal({
          isOpen: true,
          title: 'Update Order Status',
          message: `Are you sure you want to change the status of order #${orderId.slice(0,8)} to "${newStatus}"?`,
          actionType: 'update',
          onConfirm: () => updateOrderStatus(orderId, newStatus)
      });
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
          if (error) {
              alert("Failed to update status");
          } else {
              setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
          }
      } else {
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
  };

  const getFilteredAndSortedOrders = () => {
      let filtered = orders.filter(order => {
          // Date Filters
          if (orderDateStart) {
              const startDate = new Date(orderDateStart);
              startDate.setHours(0,0,0,0);
              if (new Date(order.created_at) < startDate) return false;
          }
          if (orderDateEnd) {
              const endDate = new Date(orderDateEnd);
              endDate.setHours(23,59,59,999);
              if (new Date(order.created_at) > endDate) return false;
          }
          // Customer Filter
          if (filterCustomerId && order.user_id !== filterCustomerId) return false;
          
          return true;
      });

      // Sort
      return filtered.sort((a, b) => {
          let valA = a[orderSort.key as keyof Order];
          let valB = b[orderSort.key as keyof Order];
          
          // Handle specific types if needed
          if (orderSort.key === 'total_amount') {
             valA = Number(valA);
             valB = Number(valB);
          }
          if (orderSort.key === 'created_at') {
             valA = new Date(valA as string).getTime();
             valB = new Date(valB as string).getTime();
          }

          if (valA < valB) return orderSort.direction === 'asc' ? -1 : 1;
          if (valA > valB) return orderSort.direction === 'asc' ? 1 : -1;
          return 0;
      });
  };

  const handleOrderSort = (key: keyof Order | 'created_at') => {
      setOrderSort(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Order | 'created_at' }) => {
      if (orderSort.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-gray-400 ml-1 inline" />;
      return orderSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500 ml-1 inline" /> : <ArrowDown className="w-3 h-3 text-blue-500 ml-1 inline" />;
  };

  const TableSkeleton = () => (
      <div className="animate-pulse space-y-4">
          {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
          ))}
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
           <div className="p-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Admin Panel</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage your store</p>
           </div>
           
           <nav className="flex-1 px-4 space-y-2">
               <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
               >
                   <Activity className="w-5 h-5 mr-3" /> Overview
               </button>
               <button 
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
               >
                   <Package className="w-5 h-5 mr-3" /> Products
               </button>
               <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
               >
                   <ShoppingBag className="w-5 h-5 mr-3" /> Orders
               </button>
               <button 
                onClick={() => setActiveTab('customers')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'customers' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
               >
                   <Users className="w-5 h-5 mr-3" /> Customers
               </button>
           </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <header className="flex justify-between items-center mb-8">
                <div className="md:hidden">
                    {/* Mobile Menu Trigger would go here */}
                    <span className="font-bold text-lg dark:text-white">Admin</span>
                </div>
                <div className="flex items-center space-x-4 ml-auto">
                    <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400">Back to Store</button>
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                        {user?.email?.[0].toUpperCase()}
                    </div>
                </div>
            </header>

            {/* TAB CONTENT */}
            
            {/* 1. OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Revenue</h3>
                                <DollarSign className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                ${orders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Orders</h3>
                                <ShoppingBag className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Products</h3>
                                <Package className="w-5 h-5 text-purple-500" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{products.length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Customers</h3>
                                <Users className="w-5 h-5 text-orange-500" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{customers.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. PRODUCTS */}
            {activeTab === 'products' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Products</h2>
                            {selectedProductIds.size > 0 && (
                                <button 
                                    onClick={confirmBulkDelete}
                                    className="flex items-center text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" /> Delete ({selectedProductIds.size})
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                            <Upload className="w-4 h-4 mr-2" /> Add Product
                        </button>
                    </div>
                    
                    {loading ? (
                        <div className="p-6"><TableSkeleton /></div>
                    ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <button onClick={toggleSelectAllProducts} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                            {selectedProductIds.size === products.length && products.length > 0 ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Stock</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <button onClick={() => toggleProductSelection(product.id)} className="text-gray-400 hover:text-blue-600">
                                                {selectedProductIds.has(product.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover bg-gray-100 mr-3" />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                                                    {productRatings[product.id] && (
                                                        <div className="flex items-center mt-1">
                                                            <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded text-[10px] text-yellow-700 dark:text-yellow-400 font-bold">
                                                                <Star className="w-3 h-3 mr-1 fill-current" />
                                                                {productRatings[product.id].average.toFixed(1)}
                                                            </div>
                                                            <span className="text-xs text-gray-400 ml-1">({productRatings[product.id].count})</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{product.category}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">${product.price.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.stock < 10 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                                                {product.stock} left
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => confirmDeleteProduct(product.id)} className="text-gray-400 hover:text-red-600 transition-colors p-2">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}
                </div>
            )}

            {/* 3. ORDERS */}
            {activeTab === 'orders' && (
                <div ref={ordersTableRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                            Orders 
                            {filterCustomerId && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                                    Filtered <button onClick={() => setFilterCustomerId(null)} className="ml-1 hover:text-blue-900"><X className="w-3 h-3"/></button>
                                </span>
                            )}
                        </h2>
                        <div className="flex space-x-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input 
                                    type="date" 
                                    className="pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={orderDateStart}
                                    onChange={(e) => setOrderDateStart(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input 
                                    type="date" 
                                    className="pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={orderDateEnd}
                                    onChange={(e) => setOrderDateEnd(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="p-6"><TableSkeleton /></div>
                    ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4">Order ID</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => handleOrderSort('created_at')}>
                                        Date <SortIcon columnKey="created_at" />
                                    </th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => handleOrderSort('total_amount')}>
                                        Total <SortIcon columnKey="total_amount" />
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => handleOrderSort('status')}>
                                        Status <SortIcon columnKey="status" />
                                    </th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {getFilteredAndSortedOrders().map((order) => (
                                    <React.Fragment key={order.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}...</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {order.user_id ? 'Registered User' : 'Guest'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                                                ${order.total_amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4">
                                                 <select 
                                                    value={order.status}
                                                    onChange={(e) => confirmUpdateOrderStatus(order.id, e.target.value)}
                                                    className={`text-xs font-bold uppercase tracking-wide border-none rounded-full px-3 py-1 cursor-pointer focus:ring-2 focus:ring-blue-500 ${
                                                        order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 
                                                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                                        order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                                    }`}
                                                 >
                                                     <option value="processing">Processing</option>
                                                     <option value="shipped">Shipped</option>
                                                     <option value="delivered">Delivered</option>
                                                     <option value="cancelled">Cancelled</option>
                                                 </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                                    className="text-gray-400 hover:text-blue-600 p-2"
                                                >
                                                    {expandedOrderId === order.id ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedOrderId === order.id && (
                                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <p className="font-bold mb-2 dark:text-white">Order Details:</p>
                                                        <ul className="space-y-2 mb-4">
                                                            {order.items?.map((item, idx) => (
                                                                <li key={idx} className="flex items-center text-gray-600 dark:text-gray-300">
                                                                    <img src={item.product?.image_url || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded mr-3 object-cover" alt="" />
                                                                    <span>{item.quantity}x {item.product?.name || 'Unknown Item'}</span>
                                                                    <span className="ml-auto font-medium">${item.price_at_purchase}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-xs text-gray-500">Shipping to: <span className="text-gray-700 dark:text-gray-300">{order.shipping_address || 'N/A'}</span></p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}
                </div>
            )}

            {/* 4. CUSTOMERS */}
            {activeTab === 'customers' && (
                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customers</h2>
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Search customers..."
                                className="pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {loading ? (
                         <div className="p-6"><TableSkeleton /></div>
                    ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {customers.filter(c => c.email.toLowerCase().includes(customerSearch.toLowerCase()) || (c.full_name && c.full_name.toLowerCase().includes(customerSearch.toLowerCase()))).map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs mr-3">
                                                    {customer.full_name ? customer.full_name[0] : customer.email[0].toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white text-sm">{customer.full_name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{customer.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                {customer.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                             <button 
                                                onClick={() => {
                                                    setFilterCustomerId(customer.id);
                                                    setActiveTab('orders');
                                                }}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                             >
                                                 View Orders
                                             </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}
                 </div>
            )}
        </main>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                      Add New Product
                    </h3>
                    <div className="mt-4 space-y-4">
                        <input
                            type="text"
                            placeholder="Product Name"
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        />
                        <textarea
                            placeholder="Description"
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="number"
                                placeholder="Price"
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={newProduct.price}
                                onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                            />
                            <input
                                type="number"
                                placeholder="Stock"
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={newProduct.stock}
                                onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Category"
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={newProduct.category}
                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        />
                        
                        {/* Image Upload */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Image</label>
                            <div className="flex items-center space-x-4">
                                {newProduct.image_url && (
                                    <img src={newProduct.image_url} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                                )}
                                <label className="cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center">
                                    <Upload className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">
                                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                                    </span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/png, image/jpeg, image/svg+xml"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                    />
                                </label>
                            </div>
                        </div>

                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleAddProduct}
                  type="button"
                  disabled={uploadingImage}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Add Product
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${confirmModal.actionType === 'delete' ? 'bg-red-100 sm:mx-0 sm:h-10 sm:w-10' : 'bg-blue-100 sm:mx-0 sm:h-10 sm:w-10'}`}>
                                {confirmModal.actionType === 'delete' ? (
                                    <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                                ) : (
                                    <CheckCircle className="h-6 w-6 text-blue-600" aria-hidden="true" />
                                )}
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                    {confirmModal.title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {confirmModal.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm ${confirmModal.actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            onClick={handleConfirmAction}
                        >
                            Confirm
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={() => setConfirmModal(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Real-time Order Toast */}
      {newOrderToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border-l-4 border-green-500 p-4 flex items-start max-w-sm">
                  <div className="flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                          New Order Received!
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {newOrderToast.customer} placed an order for ${newOrderToast.amount.toFixed(2)}.
                      </p>
                      <div className="mt-3 flex space-x-7">
                          <button
                              onClick={() => {
                                  setNewOrderToast(null);
                                  setActiveTab('orders');
                              }}
                              className="bg-white dark:bg-transparent rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                              View Order
                          </button>
                          <button
                              onClick={() => setNewOrderToast(null)}
                              className="bg-white dark:bg-transparent rounded-md text-sm font-medium text-gray-700 dark:text-gray-400 hover:text-gray-500 focus:outline-none"
                          >
                              Dismiss
                          </button>
                      </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                      <button
                          className="bg-white dark:bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                          onClick={() => setNewOrderToast(null)}
                      >
                          <span className="sr-only">Close</span>
                          <X className="h-5 w-5" />
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
