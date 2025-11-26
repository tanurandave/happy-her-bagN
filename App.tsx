import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AiAssistant from './components/AiAssistant';
import SalesNotification from './components/SalesNotification';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import CartPage from './pages/CartPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import ProfilePage from './pages/ProfilePage';
import WishlistPage from './pages/WishlistPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';

// Footer Component
const Footer = () => (
  <footer className="bg-gray-900 dark:bg-black text-gray-300 py-12 mt-auto border-t border-gray-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <h3 className="text-white text-lg font-bold mb-4">Happy Her Bag</h3>
        <p className="text-sm text-gray-400">Defining the future of e-commerce with AI and real-time speed.</p>
      </div>
      <div>
        <h4 className="text-white font-medium mb-4">Shop</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li><a href="#" className="hover:text-white">New Arrivals</a></li>
          <li><a href="#" className="hover:text-white">Electronics</a></li>
          <li><a href="#" className="hover:text-white">Fashion</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-medium mb-4">Support</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li><a href="#" className="hover:text-white">Contact Us</a></li>
          <li><a href="#" className="hover:text-white">FAQ</a></li>
          <li><a href="#" className="hover:text-white">Returns</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-medium mb-4">Newsletter</h4>
        <div className="flex">
          <input type="email" placeholder="Your email" className="bg-gray-800 border-none rounded-l-md px-4 py-2 text-sm w-full focus:ring-1 focus:ring-blue-500 text-white" />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 text-sm">Subscribe</button>
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
      &copy; {new Date().getFullYear()} Happy Her Bag. All rights reserved.
    </div>
  </footer>
);

// Layout wrapper to handle fixed navbar spacing
const MainLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  // Home page starts at top (under transparent navbar)
  // Other pages need padding to prevent content from being hidden behind fixed navbar
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <main className={`flex-grow ${isHome ? '' : 'pt-20'}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/products/:id" element={<ProductDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SalesNotification />
      <AiAssistant />
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <MainLayout />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;