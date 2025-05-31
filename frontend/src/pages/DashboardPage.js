import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Clock, CheckCircle, X, Eye, MessageCircle, MapPin, Calendar } from 'lucide-react';
import { UserContext } from '../App';
import { itemsAPI } from '../services/api';

const DashboardPage = () => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('my-posts');
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimRequests, setClaimRequests] = useState([]);

  // Fetch user's items on component mount
  useEffect(() => {
    const fetchUserItems = async () => {
      try {
        setLoading(true);
        // Fetch all items and filter by current user
        const response = await itemsAPI.getItems();
        const allItems = response.items || [];
        
        // Filter items posted by current user
        const myItems = allItems.filter(item => 
          item.owner_email === user?.email || 
          item.user_id === user?.id
        );
        
        setUserItems(myItems);
      } catch (error) {
        console.error('Error fetching user items:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserItems();
    }
  }, [user]);

  // Filter user's items by type
  const userLostItems = userItems.filter(item => item.type === 'lost');
  const userFoundItems = userItems.filter(item => item.type === 'found');

  const stats = [
    { label: 'Items Posted', value: userItems.length, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Items Recovered', value: 3, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Helping Others', value: userFoundItems.length, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Success Rate', value: '85%', color: 'text-orange-600', bg: 'bg-orange-100' }
  ];

  const getStatusBadge = (status) => {
    const styles = {
      active: 'status-active',
      claimed: 'status-claimed',
      resolved: 'status-resolved'
    };
    return styles[status] || 'status-active';
  };

  const getUrgencyBadge = (urgency) => {
    const styles = {
      high: 'urgency-high',
      medium: 'urgency-medium',
      low: 'urgency-low'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[urgency] || styles.medium}`;
  };

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Welcome back, {user?.first_name || user?.name}!
              </h1>
              <p className="text-gray-600">Manage your lost and found items</p>
            </div>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Link
                to="/post-lost"
                className="btn-secondary flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Post Lost</span>
              </Link>
              <Link
                to="/post-found"
                className="btn-primary flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Post Found</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading your items...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {stats.map((stat, index) => (
                <div key={stat.label} className="card p-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 ${stat.bg} rounded-xl mb-4`}>
                    <span className={`${stat.color} font-bold text-lg`}>
                      {typeof stat.value === 'number' ? stat.value : stat.value}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Tabs */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="card p-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('my-posts')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === 'my-posts'
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    My Posts ({userItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === 'requests'
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Claim Requests ({claimRequests.length})
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Tab Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {activeTab === 'my-posts' && (
                <div className="space-y-6">
                  {/* Lost Items */}
                  {userLostItems.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        Lost Items ({userLostItems.length})
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userLostItems.map((item) => (
                          <div key={item.id} className="card p-6">
                            <div className="flex items-start justify-between mb-4">
                              <span className={getStatusBadge(item.status)}>
                                {item.status}
                              </span>
                              <span className={getUrgencyBadge(item.urgency)}>
                                {item.urgency}
                              </span>
                            </div>
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-32 object-cover rounded-lg mb-4"
                            />
                            <h4 className="font-semibold text-gray-800 mb-2">{item.title}</h4>
                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                              <div className="flex items-center space-x-2">
                                <MapPin size={14} />
                                <span>{item.location}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar size={14} />
                                <span>{item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'Date not specified'}</span>
                              </div>
                              {item.reward > 0 && (
                                <div className="text-green-600 font-medium">
                                  Reward: ${item.reward}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Link
                                to={`/item/${item.id}`}
                                className="btn-ghost flex items-center space-x-1 text-xs flex-1"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </Link>
                              <button className="btn-ghost text-xs">Edit</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Found Items */}
                  {userFoundItems.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        Found Items ({userFoundItems.length})
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userFoundItems.map((item) => (
                          <div key={item.id} className="card p-6">
                            <div className="flex items-start justify-between mb-4">
                              <span className={getStatusBadge(item.status)}>
                                {item.status}
                              </span>
                              <div className="text-xs text-gray-500">
                                Claims: 2
                              </div>
                            </div>
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-32 object-cover rounded-lg mb-4"
                            />
                            <h4 className="font-semibold text-gray-800 mb-2">{item.title}</h4>
                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                              <div className="flex items-center space-x-2">
                                <MapPin size={14} />
                                <span>{item.location}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar size={14} />
                                <span>{item.date_lost ? new Date(item.date_lost).toLocaleDateString() : 'Date not specified'}</span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Link
                                to={`/item/${item.id}`}
                                className="btn-ghost flex items-center space-x-1 text-xs flex-1"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </Link>
                              <button className="btn-ghost text-xs">Edit</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {userItems.length === 0 && (
                    <div className="card p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="text-gray-400" size={32} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No items posted yet</h3>
                      <p className="text-gray-600 mb-6">Start by posting a lost or found item</p>
                      <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <Link
                          to="/post-lost"
                          className="btn-secondary flex items-center space-x-2"
                        >
                          <Plus size={16} />
                          <span>Post Lost Item</span>
                        </Link>
                        <Link
                          to="/post-found"
                          className="btn-primary flex items-center space-x-2"
                        >
                          <Plus size={16} />
                          <span>Post Found Item</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="space-y-6">
                  {claimRequests.length > 0 ? (
                    claimRequests.map((request) => {
                      const item = userItems.find(i => i.id === request.itemId);
                      return (
                        <div key={request.id} className="card p-6">
                          <div className="flex items-start space-x-4">
                            <img
                              src={item?.image}
                              alt={item?.title}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-800">{item?.title}</h4>
                                <span className="status-claimed">Pending</span>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">
                                <strong>{request.claimerName}</strong> ({request.claimerEmail}) wants to claim this item
                              </p>
                              <p className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded-lg">
                                "{request.message}"
                              </p>
                              <div className="flex items-center space-x-4">
                                <button className="btn-primary flex items-center space-x-2">
                                  <CheckCircle size={16} />
                                  <span>Approve</span>
                                </button>
                                <button className="btn-secondary flex items-center space-x-2">
                                  <X size={16} />
                                  <span>Decline</span>
                                </button>
                                <button className="btn-ghost flex items-center space-x-2">
                                  <MessageCircle size={16} />
                                  <span>Message</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="card p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="text-gray-400" size={32} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No claim requests</h3>
                      <p className="text-gray-600">
                        When someone wants to claim your found items, requests will appear here
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;