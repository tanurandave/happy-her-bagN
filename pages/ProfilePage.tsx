
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Order, OrderItem } from '../types';
import { Package, MapPin, Clock, CheckCircle, Truck, ClipboardList, XCircle, ChevronDown, ChevronUp, Heart, Settings, LifeBuoy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { wishlist } = useWishlist();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            items:order_items (
                *,
                product:products (name, image_url)
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as unknown as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();
    
    // Realtime listener for order status updates
    const subscription = supabase
      .channel('profile_orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
      })
      .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    }
  }, [user, navigate]);

  const toggleExpand = (orderId: string) => {
      setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getOrderStatusStep = (status: string) => {
      const s = status.toLowerCase();
      if (s === 'delivered') return 3;
      if (s === 'shipped') return 2;
      return 1; // Default to processing/pending
  };

  const OrderProgressBar: React.FC<{status: string}> = ({ status }) => {
      if (status.toLowerCase() === 'cancelled') {
        return (
            <div className="w-full py-4 flex items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg animate-fade-in">
                <XCircle className="w-6 h-6 mr-2" />
                <span className="font-bold text-lg">Order Cancelled</span>
            </div>
        );
      }

      const currentStep = getOrderStatusStep(status);
      const steps = [
          { label: 'Processing', icon: ClipboardList },
          { label: 'Shipped', icon: Truck },
          { label: 'Delivered', icon: CheckCircle }
      ];

      return (
          <div className="w-full py-8 px-4">
              <div className="relative flex items-center justify-between w-full">
                  {/* Background Line */}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full"></div>
                  
                  {/* Active Line */}
                  <div 
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700 ease-out -z-0 rounded-full"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                  ></div>
                  
                  {steps.map((step, index) => {
                      const isCompleted = index + 1 <= currentStep;
                      const Icon = step.icon;
                      return (
                          <div key={step.label} className="flex flex-col items-center relative z-10 group">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                                  isCompleted 
                                  ? 'bg-green-500 border-green-200 dark:border-green-900 text-white shadow-lg scale-110' 
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400'
                              }`}>
                                  <Icon className={`w-5 h-5 ${isCompleted ? 'animate-pulse-slow' : ''}`} />
                              </div>
                              <span className={`text-xs mt-3 font-bold uppercase tracking-wider transition-colors duration-300 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                  {step.label}
                              </span>
                          </div>
                      )
                  })}
              </div>
          </div>
      );
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
        <div className="flex items-center space-x-6">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-blue-50 dark:ring-blue-900/30">
                {user.full_name ? user.full_name[0] : user.email[0].toUpperCase()}
            </div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{user.full_name || 'Valued Customer'}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center"><MapPin className="w-4 h-4 mr-1"/> {user.email}</p>
                <div className="flex gap-2 mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                        {user.role}
                    </span>
                    <button className="text-xs text-gray-500 hover:text-blue-600 flex items-center ml-2">
                        <Settings className="w-3 h-3 mr-1" /> Edit Profile
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div onClick={() => navigate('/wishlist')} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all flex items-center justify-between group transform hover:-translate-y-1">
              <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">My Wishlist</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">{wishlist.length} Items</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                  <Heart className="w-6 h-6 fill-current" />
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all flex items-center justify-between group transform hover:-translate-y-1">
              <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Addresses</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">Manage</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                  <MapPin className="w-6 h-6" />
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all flex items-center justify-between group transform hover:-translate-y-1">
              <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Support</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">Help Center</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                  <LifeBuoy className="w-6 h-6" />
              </div>
          </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Package className="w-6 h-6 mr-2 text-blue-600" /> Order History
      </h2>
      
      {loading ? (
          <div className="space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>)}
          </div>
      ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-16 text-center border border-gray-100 dark:border-gray-700">
              <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No orders yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Start shopping to see your orders here.</p>
              <button onClick={() => navigate('/shop')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors">Go to Shop</button>
          </div>
      ) : (
          <div className="space-y-6">
              {orders.map((order) => (
                  <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md group">
                      <div 
                        onClick={() => toggleExpand(order.id)}
                        className="bg-gray-50 dark:bg-gray-700/30 px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:justify-between sm:items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors relative"
                      >
                          <div className="flex flex-col sm:flex-row sm:space-x-12 gap-y-4">
                              <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold mb-1">Order Placed</p>
                                  <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
                                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                      {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                  </div>
                              </div>
                              <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold mb-1">Total Amount</p>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">${order.total_amount.toFixed(2)}</p>
                              </div>
                               <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold mb-1">Status</p>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                                      order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 
                                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                      order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                  }`}>
                                      {order.status}
                                  </span>
                              </div>
                          </div>
                          <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                             <div className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                #{order.id.slice(0, 8)}
                             </div>
                             <div className={`p-2 rounded-full transition-colors ${expandedOrderId === order.id ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                                {expandedOrderId === order.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                             </div>
                          </div>
                      </div>
                      
                      {expandedOrderId === order.id && (
                        <div className="animate-fade-in-down">
                            {/* Visual Progress Bar */}
                            <div className="px-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                <OrderProgressBar status={order.status} />
                            </div>

                            <div className="p-6 bg-white dark:bg-gray-800">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                    <ClipboardList className="w-4 h-4 mr-2 text-blue-500" /> Items in Order
                                </h4>
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {order.items?.map((item) => (
                                        <li key={item.id} className="py-4 flex items-center group/item hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg px-2 -mx-2 transition-colors">
                                            <div className="relative">
                                                {item.product?.image_url ? (
                                                    <img src={item.product.image_url} alt={item.product?.name} className="h-16 w-16 object-cover rounded-lg border border-gray-100 dark:border-gray-700" />
                                                ) : (
                                                    <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                        <Package className="w-6 h-6 text-gray-300" />
                                                    </div>
                                                )}
                                                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                                                    {item.quantity}
                                                </span>
                                            </div>
                                            <div className="flex-1 ml-4">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover/item:text-blue-600 transition-colors">{item.product?.name || 'Unknown Product'}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unit Price: ${item.price_at_purchase.toFixed(2)}</p>
                                            </div>
                                            <div className="font-bold text-gray-900 dark:text-white">
                                                ${(item.quantity * item.price_at_purchase).toFixed(2)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Need help with this order? <button className="text-blue-600 hover:underline">Contact Support</button>
                                    </div>
                                    <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                        Download Invoice
                                    </button>
                                </div>
                            </div>
                        </div>
                      )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default ProfilePage;
