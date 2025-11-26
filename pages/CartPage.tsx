
import React, { useState } from 'react';
import { Trash2, Plus, Minus, CreditCard, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CartPage: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [address, setAddress] = useState('');
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const handleUpdateQuantity = (id: string, newQty: number) => {
      setAnimatingId(id);
      updateQuantity(id, newQty);
      setTimeout(() => setAnimatingId(null), 500); // Increased duration for visibility
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    
    setIsCheckingOut(true);
    
    try {
        if (isSupabaseConfigured()) {
             // 1. Create Order
             const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{ 
                    user_id: user.id, 
                    total_amount: total, 
                    status: 'processing',
                    shipping_address: address
                }])
                .select()
                .single();
            
            if (orderError) throw orderError;
            
            if (orderData) {
                // 2. Create Order Items
                const orderItems = cart.map(item => ({
                    order_id: orderData.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    price_at_purchase: item.price
                }));
                
                const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
                if (itemsError) throw itemsError;

                // 3. Update Product Stock (Real update for Admin Dashboard Real-time)
                for (const item of cart) {
                    const { data: productData } = await supabase.from('products').select('stock').eq('id', item.id).single();
                    if (productData) {
                        const newStock = Math.max(0, productData.stock - item.quantity);
                        await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                    }
                }
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate Stripe processing time
        
        clearCart();
        alert('Payment Successful! Order placed.');
        navigate('/profile');
    } catch (error: any) {
        console.error("Checkout error", error);
        alert(`Failed to place order: ${error.message}`);
    } finally {
        setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your cart is empty</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Looks like you haven't added anything yet.</p>
        <Link
          to="/shop"
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen dark:bg-gray-900 transition-colors">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Shopping Cart</h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {cart.map((item) => (
                <li key={item.id} className={`p-6 flex flex-col sm:flex-row sm:items-center transition-all duration-300 ${animatingId === item.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                  <div className="flex-shrink-0">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-24 h-24 rounded-lg object-cover bg-gray-100 border border-gray-100 dark:border-gray-600"
                    />
                  </div>
                  <div className="ml-0 sm:ml-6 flex-1 mt-4 sm:mt-0">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        <Link to={`/products/${item.id}`} className="hover:text-blue-600 transition-colors">{item.name}</Link>
                      </h3>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.category}</p>
                    <div className="mt-4 flex items-center justify-between">
                      {/* Refined Quantity Buttons */}
                      <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="px-4 py-1.5 font-bold text-gray-900 dark:text-white min-w-[2.5rem] text-center bg-white dark:bg-gray-800">
                            {item.quantity}
                        </div>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Summary</h2>
            <div className="flow-root">
              <dl className="-my-4 divide-y divide-gray-100 dark:divide-gray-700">
                <div className="py-4 flex items-center justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Subtotal</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">${total.toFixed(2)}</dd>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Shipping</dt>
                  <dd className="font-medium text-green-600 dark:text-green-400">Free</dd>
                </div>
                <div className="py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <dt className="text-base font-bold text-gray-900 dark:text-white">Order Total</dt>
                  <dd className="text-xl font-bold text-gray-900 dark:text-white">${total.toFixed(2)}</dd>
                </div>
              </dl>
            </div>

            <form onSubmit={handleCheckout} className="mt-6">
               <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shipping Address</label>
                   <textarea 
                        required 
                        value={address} 
                        onChange={e => setAddress(e.target.value)}
                        className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm border p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                        placeholder="123 Main St, New York, NY"
                        rows={2}
                   />
               </div>

              <button
                type="submit"
                disabled={isCheckingOut}
                className="w-full bg-blue-600 text-white rounded-xl px-4 py-4 font-bold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center transition-all disabled:opacity-75 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {isCheckingOut ? (
                    <span className="flex items-center"><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2"></div> Processing...</span>
                ) : (
                    <>
                        Pay with Card <CreditCard className="ml-2 w-5 h-5" />
                    </>
                )}
              </button>
              <div className="mt-4 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                <Lock className="w-3 h-3 mr-1" /> Secure checkout powered by Stripe
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
