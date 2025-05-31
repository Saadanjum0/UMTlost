import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, MapPin, Calendar, Grid, List, ArrowRight, CheckCircle, SlidersHorizontal, X } from 'lucide-react';
import { UserContext } from '../App';
import { itemsAPI } from '../services/api';
import ImageWithFallback from '../components/ImageWithFallback';

const BrowseFoundPage = () => {
  const { user } = useContext(UserContext);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    condition: '',
    dateRange: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch found items
  useEffect(() => {
    const fetchFoundItems = async () => {
      try {
        setLoading(true);
        const response = await itemsAPI.getItems({ type: 'found' });
        setFoundItems(response.items || []);
      } catch (error) {
        console.error('Error fetching found items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFoundItems();
  }, []);

  // Apply filters
  const filteredItems = foundItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesLocation = !filters.location || item.location === filters.location;
    const matchesCondition = !filters.condition || item.condition === filters.condition;

    return matchesSearch && matchesCategory && matchesLocation && matchesCondition;
  });

  const categories = [
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'bags', name: 'Bags & Backpacks', icon: '🎒' },
    { id: 'jewelry', name: 'Jewelry', icon: '💍' },
    { id: 'clothing', name: 'Clothing', icon: '👕' },
    { id: 'personal', name: 'Personal Items', icon: '🔑' },
    { id: 'books', name: 'Books & Stationery', icon: '📚' },
    { id: 'sports', name: 'Sports Equipment', icon: '⚽' },
    { id: 'other', name: 'Other', icon: '📦' }
  ];

  const locations = [
    'Main Library', 'Student Cafeteria', 'Computer Science Building',
    'Engineering Building', 'Business Building', 'Art Building',
    'Main Gymnasium', 'Student Center', 'Parking Lot A', 'Parking Lot B',
    'Dormitory Area', 'Other'
  ];

  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      location: '',
      condition: '',
      dateRange: ''
    });
  };

  const getConditionBadge = (condition) => {
    const styles = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[condition] || styles.good}`;
  };

  const ItemCard = ({ item }) => (
    <motion.div
      className="card card-hover p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="status-active">Available</span>
        {item.condition && (
          <span className={getConditionBadge(item.condition)}>
            {item.condition}
          </span>
        )}
      </div>
      
      <ImageWithFallback
        src={item.image}
        alt={item.title}
        className="w-full h-48 object-cover rounded-xl mb-4"
      />
      
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h3>
      <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
      
      <div className="space-y-2 text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-2">
          <MapPin size={14} />
          <span>Found at {item.location}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar size={14} />
          <span>Found on {item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'Date not specified'}</span>
        </div>
      </div>
      
      <Link
        to={`/item/${item.id}`}
        className="btn-primary w-full flex items-center justify-center space-x-2"
      >
        <span>Claim Item</span>
        <ArrowRight size={16} />
      </Link>
    </motion.div>
  );

  const ItemListRow = ({ item }) => (
    <motion.div
      className="card p-6 mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start space-x-6">
        <ImageWithFallback
          src={item.image}
          alt={item.title}
          className="w-24 h-24 object-cover rounded-xl"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-semibold text-gray-800">{item.title}</h3>
            <div className="flex items-center space-x-3">
              <span className="status-active">Available</span>
              {item.condition && (
                <span className={getConditionBadge(item.condition)}>
                  {item.condition}
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-600 mb-3 line-clamp-2">{item.description}</p>
          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
            <div className="flex items-center space-x-1">
              <MapPin size={14} />
              <span>Found at {item.location}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar size={14} />
              <span>{item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'Date not specified'}</span>
            </div>
          </div>
          <Link
            to={`/item/${item.id}`}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <span>Claim Item</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="pt-20 pb-12">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Found Items</h1>
          <p className="text-gray-600">Browse items found by fellow students - yours might be here!</p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search found items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-12 pr-4 w-full"
                />
              </div>
            </form>

            {/* View Mode and Filter Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List size={20} />
                </button>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Filter size={16} />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            className="card p-6 mb-8"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="form-select"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="form-select"
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Condition Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <select
                  value={filters.condition}
                  onChange={(e) => handleFilterChange('condition', e.target.value)}
                  className="form-select"
                >
                  <option value="">All Conditions</option>
                  {conditions.map(cond => (
                    <option key={cond.value} value={cond.value}>{cond.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Found</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="form-select"
                >
                  <option value="">Any Date</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="btn-ghost text-sm"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Showing {filteredItems.length} of {foundItems.length} found items
            </p>
            <select className="form-select text-sm">
              <option>Most Recent</option>
              <option>Oldest First</option>
              <option>Best Condition</option>
              <option>Nearest Location</option>
            </select>
          </div>

          {filteredItems.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div>
                  {filteredItems.map((item) => (
                    <ItemListRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-400" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No items found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria or clear the filters
              </p>
              <button
                onClick={clearFilters}
                className="btn-primary"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </motion.div>

        {/* Success Stories */}
        <motion.div
          className="mt-16 p-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Success Stories</h3>
            <p className="text-gray-600 mb-6">
              Over 1,200 items have been successfully returned to their owners through our platform
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-600 mb-1">85%</div>
                <div className="text-sm text-gray-600">Recovery Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-1">2.3</div>
                <div className="text-sm text-gray-600">Days Average</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-1">98%</div>
                <div className="text-sm text-gray-600">User Satisfaction</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BrowseFoundPage;