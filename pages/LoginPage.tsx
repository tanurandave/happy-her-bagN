import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Mail, Lock } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, loginAsDemoAdmin, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate('/profile');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
          await signIn(email, password);
          // Navigation happens in useEffect when user state changes
      } else {
          await signUp(email, password, fullName);
          alert('Registration successful! Please check your email to verify your account before logging in.');
          setIsLogin(true); // Switch to login view
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
            <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${isLogin ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
                Login
            </button>
            <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
                Register
            </button>
        </div>

        <div className="p-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    {isLogin ? 'Welcome Back!' : 'Create Account'}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {isLogin ? 'Sign in to access your orders & wishlist' : 'Join us to track orders and save favorites'}
                </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
            
            {!isLogin && (
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        required={!isLogin}
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow sm:text-sm"
                    />
                </div>
            )}

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow sm:text-sm"
                />
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow sm:text-sm"
                />
            </div>

            {isLogin && (
                <div className="flex items-center justify-end">
                    <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                        Forgot password?
                    </Link>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
            >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
                </div>
            </div>

            <button
                type="button"
                onClick={loginAsDemoAdmin}
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors"
            >
                <ShieldCheck className="w-4 h-4 mr-2 text-purple-600" /> Demo Admin Login
            </button>

            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;