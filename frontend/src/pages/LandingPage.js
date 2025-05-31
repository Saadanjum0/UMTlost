import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Plus, Users, Clock, CheckCircle, ArrowRight, MapPin, Shield, Smartphone } from 'lucide-react';
import { UserContext } from '../App';
import { itemsAPI } from '../services/api';

const LandingPage = () => {
  const { user } = useContext(UserContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentFoundItems, setRecentFoundItems] = useState([]);
  const navigate = useNavigate();

  // Fetch recent found items
  useEffect(() => {
    const fetchRecentItems = async () => {
      try {
        const response = await itemsAPI.getItems({ type: 'found' });
        const foundItems = response.items || [];
        setRecentFoundItems(foundItems.slice(0, 3)); // Get last 3 found items
      } catch (error) {
        console.error('Error fetching recent items:', error);
      }
    };

    fetchRecentItems();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/lost-items?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Statistics
  const stats = [
    { icon: Users, label: 'Active Users', value: '2,847', color: 'text-blue-600' },
    { icon: CheckCircle, label: 'Items Recovered', value: '1,293', color: 'text-green-600' },
    { icon: Clock, label: 'Avg. Recovery Time', value: '2.3 days', color: 'text-purple-600' },
    { icon: MapPin, label: 'Campus Locations', value: '45+', color: 'text-orange-600' }
  ];

  // Features
  const features = [
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Advanced AI-powered search helps you find items quickly with intelligent matching.'
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'University-verified accounts and secure messaging ensure safe transactions.'
    },
    {
      icon: Smartphone,
      title: 'Mobile First',
      description: 'Optimized for mobile devices with instant notifications and easy posting.'
    }
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 via-purple-900/60 to-blue-900/70"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-20 h-20 bg-blue-400/20 rounded-full float"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-40 right-20 w-16 h-16 bg-purple-400/20 rounded-full float"
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-40 left-20 w-12 h-12 bg-pink-400/20 rounded-full float"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 2 }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 container-custom text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Lost Something?
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
              UMT's premier platform for reuniting students with their lost belongings. 
              Fast, secure, and trusted by thousands.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative glass-strong rounded-2xl p-2">
              <div className="flex items-center">
                <Search className="absolute left-6 text-gray-400" size={24} />
                <input
                  type="text"
                  placeholder="Search for lost items (e.g., iPhone, wallet, keys...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-32 py-4 bg-transparent text-white placeholder-gray-300 focus:outline-none text-lg"
                />
                <button
                  type="submit"
                  className="absolute right-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
                >
                  <span>Search</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.form>

          {/* Quick Actions */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {user ? (
              <>
                <Link
                  to="/post-lost"
                  className="btn-secondary flex items-center space-x-2 text-lg px-8 py-4"
                >
                  <Plus size={20} />
                  <span>Report Lost Item</span>
                </Link>
                <Link
                  to="/post-found"
                  className="btn-primary flex items-center space-x-2 text-lg px-8 py-4"
                >
                  <Plus size={20} />
                  <span>Report Found Item</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="btn-primary flex items-center space-x-2 text-lg px-8 py-4"
                >
                  <Users size={20} />
                  <span>Join Now</span>
                </Link>
                <Link
                  to="/lost-items"
                  className="btn-secondary flex items-center space-x-2 text-lg px-8 py-4"
                >
                  <Search size={20} />
                  <span>Browse Items</span>
                </Link>
              </>
            )}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </motion.div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="container-custom">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 ${stat.color} bg-white/10 rounded-2xl mb-4`}>
                  <stat.icon size={32} />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-2">{stat.value}</h3>
                <p className="text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Recent Found Items */}
      {recentFoundItems.length > 0 && (
        <section className="py-20">
          <div className="container-custom">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Recently Found Items</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Check if your lost item has been found by fellow students
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {recentFoundItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="card card-hover p-6"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-xl mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="flex items-center space-x-1">
                      <MapPin size={14} />
                      <span>{item.location}</span>
                    </span>
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                  <Link
                    to={`/item/${item.id}`}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    <span>View Details</span>
                    <ArrowRight size={16} />
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="text-center mt-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Link
                to="/found-items"
                className="btn-secondary inline-flex items-center space-x-2"
              >
                <span>View All Found Items</span>
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="container-custom">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Why Choose Our Platform?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built specifically for university communities with features that matter most to students
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="card p-8 text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl mb-6">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container-custom">
          <motion.div
            className="card p-12 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Ready to Find Your Lost Items?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of students who have successfully recovered their belongings through our platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              {!user && (
                <Link
                  to="/register"
                  className="btn-primary flex items-center space-x-2 text-lg px-8 py-4"
                >
                  <Users size={20} />
                  <span>Get Started Free</span>
                </Link>
              )}
              <Link
                to="/lost-items"
                className="btn-secondary flex items-center space-x-2 text-lg px-8 py-4"
              >
                <Search size={20} />
                <span>Browse Lost Items</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;