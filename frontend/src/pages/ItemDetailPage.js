import React, { useContext, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MapPin, Calendar, Clock, DollarSign, Share2, Flag, 
  MessageCircle, CheckCircle, X, User, Mail, Phone, AlertTriangle
} from 'lucide-react';
import { UserContext } from '../App';
import { itemsAPI } from '../services/api';
import ImageWithFallback from '../components/ImageWithFallback';

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimData, setClaimData] = useState({
    message: '',
    contactMethod: 'email',
    phoneNumber: ''
  });
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Fetch item data from API
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await itemsAPI.getItem(id);
        console.log('Fetched item data:', response); // Debug log
        console.log('Current user:', user); // Debug log
        setItem(response);
      } catch (err) {
        console.error('Error fetching item:', err);
        setError('Item not found or failed to load');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchItem();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Item not found</h1>
          <p className="text-gray-600 mb-6">{error || "The item you're looking for doesn't exist."}</p>
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Improved ownership check - check multiple possible fields
  const isOwner = user && item && (
    user.email === item.owner_email || 
    user.id === item.user_id ||
    user.email === item.contact_info
  );
  
  console.log('Ownership check:', {
    userEmail: user?.email,
    userId: user?.id,
    itemOwnerEmail: item?.owner_email,
    itemUserId: item?.user_id,
    itemContactInfo: item?.contact_info,
    isOwner
  }); // Debug log
  
  const isLostItem = item.type === 'lost';

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send the claim request to the server
    alert('Claim request sent! The owner will be notified.');
    setShowClaimForm(false);
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Found this ${item.type} item: ${item.title}`;
    
    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        break;
      case 'email':
        window.open(`mailto:?subject=${text}&body=${url}`);
        break;
      case 'sms':
        window.open(`sms:?body=${text} ${url}`);
        break;
    }
    setShowShareMenu(false);
  };

  const getUrgencyBadge = (urgency) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return `px-3 py-1 rounded-full text-sm font-medium ${styles[urgency] || styles.medium}`;
  };

  const getConditionBadge = (condition) => {
    const styles = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800'
    };
    return `px-3 py-1 rounded-full text-sm font-medium ${styles[condition] || styles.good}`;
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container-custom">
        {/* Back Button */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <ImageWithFallback
                src={item.image}
                alt={item.title}
                className="w-full h-96 object-cover rounded-2xl shadow-lg"
              />
            </motion.div>

            {/* Item Info */}
            <motion.div
              className="card p-8 mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{item.title}</h1>
                  <div className="flex items-center space-x-3">
                    <span className={`status-${item.status}`}>
                      {item.status}
                    </span>
                    {isLostItem && (
                      <span className={getUrgencyBadge(item.urgency)}>
                        {item.urgency} priority
                      </span>
                    )}
                    {!isLostItem && item.condition && (
                      <span className={getConditionBadge(item.condition)}>
                        {item.condition} condition
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="btn-ghost p-3"
                    >
                      <Share2 size={20} />
                    </button>
                    {showShareMenu && (
                      <div className="absolute right-0 mt-2 w-48 glass-strong rounded-xl shadow-lg z-10">
                        <button
                          onClick={() => handleShare('copy')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-white/10 rounded-t-xl"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleShare('email')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-white/10"
                        >
                          Share via Email
                        </button>
                        <button
                          onClick={() => handleShare('sms')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-white/10 rounded-b-xl"
                        >
                          Share via SMS
                        </button>
                      </div>
                    )}
                  </div>
                  <button className="btn-ghost p-3">
                    <Flag size={20} />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="text-gray-400" size={20} />
                    <div>
                      <div className="text-sm text-gray-500">
                        {isLostItem ? 'Last seen at' : 'Found at'}
                      </div>
                      <div className="font-medium text-gray-800">{item.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="text-gray-400" size={20} />
                    <div>
                      <div className="text-sm text-gray-500">
                        {isLostItem ? 'Date lost' : 'Date found'}
                      </div>
                      <div className="font-medium text-gray-800">
                        {item.date_lost ? new Date(item.date_lost).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Not specified'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {item.time_lost && (
                    <div className="flex items-center space-x-3">
                      <Clock className="text-gray-400" size={20} />
                      <div>
                        <div className="text-sm text-gray-500">Approximate time</div>
                        <div className="font-medium text-gray-800">{item.time_lost}</div>
                      </div>
                    </div>
                  )}
                  {isLostItem && item.reward > 0 && (
                    <div className="flex items-center space-x-3">
                      <DollarSign className="text-green-600" size={20} />
                      <div>
                        <div className="text-sm text-gray-500">Reward offered</div>
                        <div className="font-medium text-green-600">${item.reward}</div>
                      </div>
                    </div>
                  )}
                  {!isLostItem && item.storageLocation && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="text-blue-600" size={20} />
                      <div>
                        <div className="text-sm text-gray-500">Current location</div>
                        <div className="font-medium text-gray-800">{item.storageLocation}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              className="card p-6 sticky top-24"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* Contact Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {isLostItem ? 'Found this item?' : 'Is this yours?'}
                </h3>
                
                {isOwner ? (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 text-blue-700 mb-2">
                      <User size={16} />
                      <span className="text-sm font-medium">This is your item</span>
                    </div>
                    <p className="text-sm text-blue-600 mb-4">
                      You posted this item. You can manage it from your dashboard.
                    </p>
                    <Link
                      to="/dashboard"
                      className="btn-primary w-full"
                    >
                      Go to Dashboard
                    </Link>
                  </div>
                ) : user ? (
                  <div className="space-y-4">
                    {/* Show item owner info */}
                    <div className="p-3 bg-gray-50 rounded-lg mb-4">
                      <div className="text-sm text-gray-600 mb-1">Posted by:</div>
                      <div className="font-medium text-gray-800">
                        {item.owner_name || 'Anonymous User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Action buttons for non-owners */}
                    {isLostItem ? (
                      <button
                        onClick={() => setShowClaimForm(true)}
                        className="btn-primary w-full flex items-center justify-center space-x-2"
                      >
                        <CheckCircle size={16} />
                        <span>I Found This Item</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowClaimForm(true)}
                        className="btn-primary w-full flex items-center justify-center space-x-2"
                      >
                        <CheckCircle size={16} />
                        <span>This is Mine</span>
                      </button>
                    )}
                    
                    <button className="btn-secondary w-full flex items-center justify-center space-x-2">
                      <MessageCircle size={16} />
                      <span>Contact Owner</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    {/* Show item owner info for non-logged in users */}
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Posted by:</div>
                      <div className="font-medium text-gray-800">
                        {item.owner_name || 'Anonymous User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      Sign in to contact the {isLostItem ? 'owner' : 'finder'} or claim this item.
                    </p>
                    <Link
                      to="/login"
                      className="btn-primary w-full"
                    >
                      Sign In to Contact
                    </Link>
                  </div>
                )}
              </div>

              {/* Safety Tips */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-700 mb-2">
                  <AlertTriangle size={16} />
                  <span className="text-sm font-medium">Safety Tips</span>
                </div>
                <ul className="text-xs text-yellow-600 space-y-1">
                  <li>• Meet in public places on campus</li>
                  <li>• Verify item details before meeting</li>
                  <li>• Bring ID for verification</li>
                  <li>• Report suspicious behavior</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Claim Form Modal */}
        {showClaimForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              className="card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  {isLostItem ? 'Report Found Item' : 'Claim Item'}
                </h3>
                <button
                  onClick={() => setShowClaimForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isLostItem ? 'Describe how you found it' : 'Prove this is yours'}
                  </label>
                  <textarea
                    value={claimData.message}
                    onChange={(e) => setClaimData({ ...claimData, message: e.target.value })}
                    placeholder={isLostItem 
                      ? "Where and when did you find this item? Any additional details..."
                      : "Describe unique features, when you lost it, or provide additional proof..."
                    }
                    rows={4}
                    className="form-textarea"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred contact method
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="contactMethod"
                        value="email"
                        checked={claimData.contactMethod === 'email'}
                        onChange={(e) => setClaimData({ ...claimData, contactMethod: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Email ({user?.email})</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="contactMethod"
                        value="phone"
                        checked={claimData.contactMethod === 'phone'}
                        onChange={(e) => setClaimData({ ...claimData, contactMethod: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Phone number</span>
                    </label>
                  </div>
                  {claimData.contactMethod === 'phone' && (
                    <input
                      type="tel"
                      value={claimData.phoneNumber}
                      onChange={(e) => setClaimData({ ...claimData, phoneNumber: e.target.value })}
                      placeholder="Your phone number"
                      className="form-input mt-2"
                      required
                    />
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowClaimForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    Send Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailPage;