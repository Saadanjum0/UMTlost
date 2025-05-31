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

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/lost-items', label: 'Lost Items', icon: List },
    { path: '/found-items', label: 'Found Items', icon: List },
  ];

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

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <nav className="flex items-center space-x-6">
              <Link to="/lost-items" className="nav-link">
                Lost Items
              </Link>
              <Link to="/found-items" className="nav-link">
                Found Items
              </Link>
              {user && !user.is_admin && (
                <>
                  <Link to="/messages" className="nav-link">
                    Messages
                  </Link>
                  <Link to="/post-lost" className="nav-link">
                    Post Lost
                  </Link>
                  <Link to="/post-found" className="nav-link">
                    Post Found
                  </Link>
                </>
              )}
            </nav>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search items..."
                className="w-64 pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-white/30 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* User Menu */}
            {user ? (
              <>
                {!user.is_admin && (
                  <div className="flex items-center space-x-2">
                    <Link
                      to="/post-lost"
                      className="btn-ghost flex items-center space-x-1"
                    >
                      <Plus size={16} />
                      <span>Post Lost</span>
                    </Link>
                    <Link
                      to="/post-found"
                      className="btn-primary flex items-center space-x-1"
                    >
                      <Plus size={16} />
                      <span>Post Found</span>
                    </Link>
                  </div>
                )}

                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-full hover:bg-white/10 transition-all duration-200">
                    <img
                      src={user.avatar || `https://ui-avatars.io/api/?name=${encodeURIComponent(user.full_name || user.name || 'User')}&background=3B82F6&color=fff`}
                      alt={user.full_name || user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="hidden md:block text-sm font-medium text-gray-700">{user.full_name || user.name}</span>
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
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="btn-ghost">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search items..."
                  className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-white/30 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Navigation Links */}
              <div className="space-y-2">
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
                {user && !user.is_admin && (
                  <>
                    <Link
                      to="/messages"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-gray-700 hover:text-blue-600"
                    >
                      Messages
                    </Link>
                    <Link
                      to="/post-lost"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-gray-700 hover:text-blue-600"
                    >
                      Post Lost Item
                    </Link>
                    <Link
                      to="/post-found"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-gray-700 hover:text-blue-600"
                    >
                      Post Found Item
                    </Link>
                  </>
                )}
              </div>

              {/* User Actions */}
              {user ? (
                <div className="border-t border-white/20 pt-4 space-y-2">
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="btn-ghost w-full"
                  >
                    Dashboard
                  </Link>
                  {user.is_admin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="btn-ghost w-full flex items-center justify-center space-x-1 text-blue-600"
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
                    className="btn-ghost w-full"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="btn-ghost w-full"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="btn-primary w-full"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;