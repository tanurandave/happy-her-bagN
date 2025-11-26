import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Shield, UserCircle, Sun, Moon, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useWishlist } from '../context/WishlistContext';

const Navbar: React.FC = () => {
  const { itemCount } = useCart();
  const { user, signOut, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { wishlist } = useWishlist();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Logic: Transparent only if on Home, at the top, and NOT hovered.
  // In all other cases (scrolled, hovered, or other pages), use the solid/glass look.
  const isTransparent = isHome && !isScrolled && !isHovered;

  const navClasses = isTransparent
    ? 'bg-transparent shadow-none py-4'
    : 'bg-white/80 dark:bg-gray-900/90 backdrop-blur-md shadow-sm py-2';

  // Text color needs to be white on transparent background (assuming dark hero image),
  // otherwise standard gray/black based on theme.
  const textColorClass = isTransparent
    ? 'text-white hover:text-blue-200'
    : 'text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400';

  const logoTextClass = isTransparent
    ? 'text-white'
    : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent';

  const iconClass = isTransparent
    ? 'text-white hover:text-blue-200'
    : 'text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400';

  return (
    <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${navClasses}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          {/* Logo */}
          <div className="flex items-center group cursor-pointer" onClick={() => navigate('/')}>
            <div className={`flex-shrink-0 flex items-center gap-2 transition-transform duration-300 ${isHovered ? 'scale-105' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-all duration-300 ${isTransparent ? 'bg-white/20 backdrop-blur-sm' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                    <span className={`font-bold text-lg ${isTransparent ? 'text-white' : 'text-white'}`}>H</span>
                </div>
                <span className={`text-2xl font-bold transition-colors ${logoTextClass}`}>
                    Happy Her Bag
                </span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden sm:flex sm:items-center sm:space-x-1">
            <Link to="/" className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${textColorClass} ${!isTransparent && location.pathname === '/' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}>
              Home
            </Link>
            <Link to="/shop" className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${textColorClass} ${location.pathname === '/shop' ? (isTransparent ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600') : ''}`}>
              Shop
            </Link>
            
            {isAdmin && (
               <Link to="/admin" className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${textColorClass}`}>
                 <Shield className="w-4 h-4 mr-1" /> Admin
               </Link>
            )}

            <div className={`flex items-center space-x-2 ml-4 pl-4 border-l ${isTransparent ? 'border-white/30' : 'border-gray-200 dark:border-gray-700'}`}>
               {/* Theme Toggle */}
               <button 
                  onClick={toggleTheme} 
                  className={`p-2 rounded-full transition-colors ${iconClass} ${isTransparent ? 'hover:bg-white/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  aria-label="Toggle Dark Mode"
               >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
               </button>

               {/* Wishlist */}
               <Link to="/wishlist" className={`relative p-2 rounded-full transition-colors ${iconClass} ${isTransparent ? 'hover:bg-white/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  <Heart className="h-5 w-5" />
                  {user && wishlist.length > 0 && (
                      <span className="absolute top-1 right-1 inline-flex items-center justify-center w-2 h-2 text-xs font-bold leading-none text-white bg-red-500 rounded-full"></span>
                  )}
               </Link>

               {/* Cart */}
               <Link to="/cart" className={`relative p-2 rounded-full transition-colors ${iconClass} ${isTransparent ? 'hover:bg-white/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-blue-600 rounded-full">
                    {itemCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative group ml-2">
                    <button className={`flex items-center p-1 rounded-full border-2 transition-all ${isTransparent ? 'border-white/50 hover:border-white' : 'border-transparent hover:border-blue-100 dark:hover:border-gray-700'}`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                            {user.full_name ? user.full_name[0] : user.email[0].toUpperCase()}
                        </div>
                    </button>
                    {/* Dropdown - Adjusted margin to prevent gap issues on hover */}
                    <div className="absolute right-0 w-56 pt-2 origin-top-right opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 translate-y-2">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 rounded-xl shadow-xl overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Signed in as</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                            </div>
                            <div className="py-1">
                                <Link to="/profile" className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <UserCircle className="w-4 h-4 mr-2" /> My Profile
                                </Link>
                                <button onClick={handleSignOut} className="flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
              ) : (
                <Link to="/login" className={`ml-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 shadow-lg hover:scale-105 ${isTransparent ? 'bg-white text-blue-900 hover:bg-gray-100' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'}`}>
                    Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md focus:outline-none transition-colors ${iconClass}`}
            >
              {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`sm:hidden fixed inset-x-0 top-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out transform origin-top shadow-xl ${isMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 overflow-hidden'}`}>
          <div className="pt-2 pb-6 space-y-1 px-4 max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100 dark:border-gray-800 mb-2">
                 <span className="text-base font-medium text-gray-900 dark:text-white">Appearance</span>
                 <button onClick={toggleTheme} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
                     {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                 </button>
             </div>
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Home</Link>
            <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Shop</Link>
            <Link to="/wishlist" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Wishlist</Link>
            <Link to="/cart" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Cart ({itemCount})</Link>
            {isAdmin && (
                <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 rounded-lg text-base font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">Admin Dashboard</Link>
            )}
            <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                {user ? (
                    <>
                    <div className="px-3 mb-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                            {user.full_name ? user.full_name[0] : user.email[0]}
                        </div>
                        <div className="overflow-hidden">
                            <div className="font-medium text-gray-900 dark:text-white truncate">{user.full_name}</div>
                            <div className="text-sm text-gray-500 truncate">{user.email}</div>
                        </div>
                    </div>
                    <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">My Profile</Link>
                    <button onClick={() => { handleSignOut(); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-3 rounded-lg text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Sign Out</button>
                    </>
                ) : (
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block w-full text-center px-3 py-3 rounded-lg text-base font-bold bg-blue-600 text-white shadow-lg">Sign In</Link>
                )}
            </div>
          </div>
      </div>
    </nav>
  );
};

export default Navbar;