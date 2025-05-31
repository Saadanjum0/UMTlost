import React, { useContext, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, MapPin, Calendar, DollarSign, Grid, List, ArrowRight } from 'lucide-react';
import { UserContext } from '../App';
import { itemsAPI } from '../services/api';

const BrowseLostPage = () => {
  const { user } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [lostItems, setLostItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    urgency: '',
    hasReward: false,
    dateRange: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch lost items
  useEffect(() => {
    const fetchLostItems = async () => {
      try {
        setLoading(true);
        const response = await itemsAPI.getItems({ type: 'lost' });
        setLostItems(response.items || []);
      } catch (error) {
        console.error('Error fetching lost items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLostItems();
  }, []);

  // Apply filters
  const filteredItems = lostItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesLocation = !filters.location || item.location === filters.location;
    const matchesUrgency = !filters.urgency || item.urgency === filters.urgency;
    const matchesReward = !filters.hasReward || (item.reward && item.reward > 0);

    return matchesSearch && matchesCategory && matchesLocation && matchesUrgency && matchesReward;
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

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(searchQuery ? { search: searchQuery } : {});
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      location: '',
      urgency: '',
      hasReward: false,
      dateRange: ''
    });
  };

  const getUrgencyBadge = (urgency) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[urgency] || styles.medium}`;
  };

  const ItemCard = ({ item }) => (
    <motion.div
      className="card card-hover p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className={getUrgencyBadge(item.urgency)}>
          {item.urgency} priority
        </span>
        {item.reward > 0 && (
          <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
            <DollarSign size={14} />
            <span>${item.reward}</span>
          </div>
        )}
      </div>
      
      <img
        src={item.image}
        alt={item.title}
        className="w-full h-48 object-cover rounded-xl mb-4"
      />
      
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h3>
      <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
      
      <div className="space-y-2 text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-2">
          <MapPin size={14} />
          <span>{item.location}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar size={14} />
          <span>Lost on {item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'Date not specified'}</span>
        </div>
      </div>
      
      <Link
        to={`/item/${item.id}`}
        className="btn-primary w-full flex items-center justify-center space-x-2"
      >
        <span>View Details</span>
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
        <img
          src={item.image}
          alt={item.title}
          className="w-24 h-24 object-cover rounded-xl"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-semibold text-gray-800">{item.title}</h3>
            <div className="flex items-center space-x-3">
              <span className={getUrgencyBadge(item.urgency)}>
                {item.urgency}
              </span>
              {item.reward > 0 && (
                <div className="flex items-center space-x-1 text-green-600 font-medium">
                  <DollarSign size={14} />
                  <span>${item.reward}</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-600 mb-3 line-clamp-2">{item.description}</p>
          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
            <div className="flex items-center space-x-1">
              <MapPin size={14} />
              <span>{item.location}</span>
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
            <span>View Details</span>
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Lost Items</h1>
          <p className="text-gray-600">Help your fellow students find their lost belongings</p>
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
                  placeholder="Search lost items..."
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

              {/* Urgency Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                <select
                  value={filters.urgency}
                  onChange={(e) => handleFilterChange('urgency', e.target.value)}
                  className="form-select"
                >
                  <option value="">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              {/* Reward Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reward</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.hasReward}
                    onChange={(e) => handleFilterChange('hasReward', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Has reward offered</span>
                </label>
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
              Showing {filteredItems.length} of {lostItems.length} lost items
            </p>
            <select className="form-select text-sm">
              <option>Most Recent</option>
              <option>Oldest First</option>
              <option>Highest Reward</option>
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
      </div>
    </div>
  );
};

export default BrowseLostPage;