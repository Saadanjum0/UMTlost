import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Search, 
  Clock, 
  ChevronRight,
  User,
  Package,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { UserContext } from '../App';
import { messagesAPI } from '../services/api';
import ImageWithFallback from '../components/ImageWithFallback';

const MessagesPage = () => {
  const { user } = useContext(UserContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, pending, approved

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await messagesAPI.getConversations();
      setConversations(response.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.item_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.other_participant.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'unread' && conv.unread_count > 0) ||
      (filter === 'pending' && conv.status === 'pending') ||
      (filter === 'approved' && conv.status === 'approved');

    return matchesSearch && matchesFilter;
  });

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Messages</h1>
          <p className="text-gray-600">
            Chat with other users about claimed items
          </p>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          className="card p-6 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            
            <div className="flex space-x-2">
              {['all', 'unread', 'pending', 'approved'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === filterOption
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Conversations List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {error && (
            <div className="card p-6 mb-6 border-red-200 bg-red-50">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {filteredConversations.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="text-gray-400" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchTerm || filter !== 'all' ? 'No conversations found' : 'No conversations yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start by claiming an item or posting one for others to claim'
                }
              </p>
              <Link
                to="/"
                className="btn-primary"
              >
                Browse Items
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConversations.map((conversation) => (
                <Link
                  key={conversation.claim_request_id}
                  to={`/messages/${conversation.claim_request_id}`}
                  className="block"
                >
                  <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start space-x-4">
                      {/* Item Image */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="text-gray-400" size={24} />
                      </div>

                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800 truncate">
                              {conversation.item_title}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <User size={14} />
                              <span>{conversation.other_participant.name}</span>
                              <span className={getStatusBadge(conversation.status)}>
                                {conversation.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {conversation.unread_count > 0 && (
                              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {conversation.unread_count}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatTime(conversation.latest_message.timestamp)}
                            </span>
                            <ChevronRight size={16} className="text-gray-400" />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              conversation.item_type === 'lost' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {conversation.item_type}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 truncate">
                          {conversation.latest_message.is_from_me && (
                            <span className="text-blue-600 font-medium">You: </span>
                          )}
                          {conversation.latest_message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MessagesPage; 