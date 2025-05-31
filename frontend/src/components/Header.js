import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Menu, X, User, Plus, List, Home, Shield, MessageCircle } from 'lucide-react';
import { UserContext } from '../App';
import { authAPI } from '../services/api';

const Header = () => {
  const { user, setUser } = useContext(UserContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/lost-items?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <motion.header 
      className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/20"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">L&F</span>
            </div>
            <span className="text-xl font-bold text-gray-800 hidden sm:block">
              Lost & Found
            </span>
          </Link>

          {/* Desktop Navigation and Search */}
          <div className="hidden lg:flex flex-1 items-center justify-between ml-8">
            {user ? (
              <>
                {/* Navigation Links */}
                <nav className="flex items-center space-x-6">
                  <Link 
                    to="/lost-items" 
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200"
                  >
                    Lost Items
                  </Link>
                  <Link 
                    to="/found-items" 
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200"
                  >
                    Found Items
                  </Link>
                </nav>

                {/* Search Bar */}
                <div className="flex-1 max-w-2xl mx-6">
                  <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search items..."
                      className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-white/30 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </form>
                </div>

                {/* User Menu */}
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <button className="flex items-center space-x-2 p-2 rounded-full hover:bg-white/10 transition-all duration-200">
                      <img
                        src={user.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E"}
                        alt={user.full_name || user.name || 'User'}
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">{user.full_name || user.name}</span>
                      {user.is_admin && (
                        <Shield size={14} className="text-blue-600" title="Admin" />
                      )}
                    </button>
                    <div className="absolute right-0 mt-2 w-48 glass-strong rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-white/10"
                      >
                        Dashboard
                      </Link>
                      {!user.is_admin && (
                        <Link
                          to="/messages"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-white/10 flex items-center space-x-2"
                        >
                          <MessageCircle size={14} />
                          <span>Messages</span>
                        </Link>
                      )}
                      {user.is_admin && (
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                        >
                          <Shield size={14} />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-white/10 rounded-b-xl"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3 ml-auto">
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            className="lg:hidden absolute top-full left-0 right-0 glass-strong border-t border-white/20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="p-4 space-y-4">
              {/* Search Bar Mobile */}
              {user && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-white/30 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-2">
                {user && (
                  <>
                    <Link
                      to="/lost-items"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-gray-700 hover:text-blue-600"
                    >
                      Lost Items
                    </Link>
                    <Link
                      to="/found-items"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-gray-700 hover:text-blue-600"
                    >
                      Found Items
                    </Link>
                    {!user.is_admin && (
                      <>
                        <Link
                          to="/messages"
                          onClick={() => setIsMenuOpen(false)}
                          className="block py-2 text-gray-700 hover:text-blue-600 flex items-center space-x-2"
                        >
                          <MessageCircle size={16} />
                          <span>Messages</span>
                        </Link>
                        <Link
                          to="/post-lost"
                          onClick={() => setIsMenuOpen(false)}
                          className="block py-2 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                        >
                          Post Lost Item
                        </Link>
                        <Link
                          to="/post-found"
                          onClick={() => setIsMenuOpen(false)}
                          className="block py-2 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                        >
                          Post Found Item
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* User Actions */}
              <div className="border-t border-white/20 pt-4">
                {user ? (
                  <div className="space-y-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-gray-700 hover:text-blue-600"
                    >
                      Dashboard
                    </Link>
                    {user.is_admin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2 text-blue-600 hover:text-blue-700 flex items-center space-x-2"
                      >
                        <Shield size={16} />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 text-gray-700 hover:text-blue-600"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full py-2 text-center text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full py-2 text-center text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;