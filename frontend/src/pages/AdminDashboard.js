import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Ban, 
  Archive,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Download,
  Mail,
  Shield,
  Clock,
  MessageSquare,
  Flag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
  Activity,
  Trash2,
  X
} from 'lucide-react';
import { UserContext } from '../App';
import { authAPI } from '../services/api';

const AdminDashboard = () => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeItems: 0,
    resolvedItems: 0,
    pendingClaims: 0,
    pendingDisputes: 0,
    flaggedItems: 0,
    totalClaims: 0,
    successRate: 0,
    dailyRegistrations: 0,
    weeklyItems: 0,
    averageResponseTime: '0 hours'
  });
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [moderationNote, setModerationNote] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    urgency: '',
    dateRange: '7d',
    flaggedOnly: false
  });

  // Load data when component mounts or tab changes
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stats
      await loadStats();
      
      // Load data based on active tab
      switch (activeTab) {
        case 'submissions':
          await loadItems();
          break;
        case 'claims':
          await loadClaims();
          break;
        case 'users':
          await loadUsers();
          break;
        default:
          await loadItems(); // Load items for overview
          break;
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await authAPI.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadItems = async () => {
    try {
      const response = await authAPI.get('/admin/items', {
        params: {
          page: 1,
          per_page: 50,
          status: filters.status || undefined,
          flagged_only: filters.flaggedOnly
        }
      });
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    }
  };

  const loadClaims = async () => {
    try {
      const response = await authAPI.get('/admin/claims', {
        params: {
          page: 1,
          per_page: 50,
          status: 'pending'
        }
      });
      setClaims(response.data.claims || []);
    } catch (error) {
      console.error('Error loading claims:', error);
      setClaims([]);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await authAPI.get('/admin/users', {
        params: {
          page: 1,
          per_page: 50
        }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      await authAPI.delete(`/admin/items/${itemId}`);
      
      // Remove item from local state
      setItems(prev => prev.filter(item => item.id !== itemId));
      
      // Close modal if this item was selected
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
      
      // Show success message
      alert('Item deleted successfully');
      
      // Reload stats
      await loadStats();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleItemAction = async (itemId, action, note = '') => {
    try {
      await authAPI.post(`/admin/items/${itemId}/moderate`, {
        action,
        note
      });
      
      // Update local state
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, status: action === 'approve' ? 'active' : action === 'reject' ? 'archived' : action }
          : item
      ));
      
      // Close any modals
      setSelectedItem(null);
      setModerationNote('');
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error moderating item:', error);
      alert('Failed to moderate item. Please try again.');
    }
  };

  const handleClaimAction = async (claimId, action, note = '') => {
    try {
      await authAPI.put(`/admin/claims/${claimId}`, {
        status: action,
        admin_notes: note
      });
      
      // Update local state
      setClaims(prev => prev.map(claim =>
        claim.id === claimId
          ? { ...claim, status: action }
          : claim
      ));
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error updating claim:', error);
      alert('Failed to update claim. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      claimed: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-blue-100 text-blue-800',
      archived: 'bg-gray-100 text-gray-800',
      disputed: 'bg-red-100 text-red-800',
      under_review: 'bg-purple-100 text-purple-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`;
  };

  const getUrgencyBadge = (urgency) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[urgency] || styles.medium}`;
  };

  const ItemRow = ({ item }) => (
    <tr className="hover:bg-gray-50 border-l-4 border-l-transparent hover:border-l-blue-500 transition-all">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {item.flagged && (
            <Flag size={16} className="text-red-500 mr-2" title="Flagged for review" />
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">{item.title}</div>
            <div className="text-sm text-gray-500">{item.location}</div>
            {item.flagReason && (
              <div className="text-xs text-red-600 mt-1">⚠ {item.flagReason}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          item.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {item.type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{item.owner_name || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{item.owner_email || 'Unknown'}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getStatusBadge(item.status)}>{item.status?.replace('_', ' ')}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getUrgencyBadge(item.urgency)}>{item.urgency}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div>{new Date(item.created_at).toLocaleDateString()}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedItem(item)}
            className="text-blue-600 hover:text-blue-900 p-1"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {item.status === 'under_review' && (
            <>
              <button
                onClick={() => handleItemAction(item.id, 'approve')}
                className="text-green-600 hover:text-green-900 p-1"
                title="Approve"
              >
                <CheckCircle2 size={16} />
              </button>
              <button
                onClick={() => handleItemAction(item.id, 'reject')}
                className="text-red-600 hover:text-red-900 p-1"
                title="Reject"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
          <button
            onClick={() => handleItemAction(item.id, 'archive')}
            className="text-gray-600 hover:text-gray-900 p-1"
            title="Archive"
          >
            <Archive size={16} />
          </button>
          <button
            onClick={() => handleDeleteItem(item.id)}
            className="text-red-600 hover:text-red-900 p-1"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  // Item Detail Modal
  const ItemDetailModal = ({ item, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Item Review: {item.title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Type</label>
              <p className="capitalize">{item.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <p className="capitalize">{item.status?.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <p>{item.location}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Urgency</label>
              <p className="capitalize">{item.urgency}</p>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Description</label>
            <p className="mt-1">{item.description}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">User</label>
            <p>{item.owner_name || 'Unknown'} ({item.owner_email || 'Unknown'})</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Posted</label>
            <p>{new Date(item.created_at).toLocaleDateString()}</p>
          </div>
          
          {item.flagged && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">⚠ Flagged Content</h4>
              <p className="text-red-700">{item.flagReason}</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-600">Moderation Notes</label>
            <textarea
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
              className="w-full mt-1 p-3 border border-gray-300 rounded-lg resize-none"
              rows={3}
              placeholder="Add moderation notes..."
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => handleItemAction(item.id, 'approve', moderationNote)}
              className="btn-primary"
            >
              Approve Item
            </button>
            <button
              onClick={() => handleItemAction(item.id, 'reject', moderationNote)}
              className="btn-secondary"
            >
              Reject Item
            </button>
            <button
              onClick={() => handleItemAction(item.id, 'archive', moderationNote)}
              className="btn-ghost"
            >
              Archive
            </button>
            <button
              onClick={() => handleDeleteItem(item.id)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container-custom py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage and monitor the Lost & Found Portal</p>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="text-blue-600" size={24} />
              <span className="text-lg font-medium text-gray-700">Administrator</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Items</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeItems}</p>
              </div>
              <Package className="text-green-600" size={32} />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingClaims}</p>
              </div>
              <Clock className="text-yellow-600" size={32} />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
              </div>
              <TrendingUp className="text-purple-600" size={32} />
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="card p-2">
            <div className="flex space-x-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', badge: null },
                { id: 'submissions', label: 'Monitor Submissions', badge: stats.flaggedItems },
                { id: 'claims', label: 'Review Claims', badge: stats.pendingClaims },
                { id: 'users', label: 'User Management', badge: null }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="card p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Submissions</h3>
                  <div className="space-y-3">
                    {items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {item.flagged && <Flag size={16} className="text-red-500" />}
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-gray-600">{item.owner_name || 'Unknown'} • {item.location}</p>
                          </div>
                        </div>
                        <span className={getStatusBadge(item.status)}>{item.status?.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="card p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('submissions')}
                      className="w-full text-left p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Clock className="text-yellow-600" size={20} />
                          <span className="font-medium">Review Pending Submissions</span>
                        </div>
                        <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs">
                          {stats.flaggedItems} pending
                        </span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('claims')}
                      className="w-full text-left p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="text-blue-600" size={20} />
                          <span className="font-medium">Review Claim Requests</span>
                        </div>
                        <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                          {stats.pendingClaims} pending
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submissions Tab */}
          {activeTab === 'submissions' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Monitor Submissions</h3>
                <button
                  onClick={loadItems}
                  className="btn-ghost flex items-center space-x-2"
                  disabled={loading}
                >
                  <Activity size={16} />
                  <span>Refresh</span>
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <ItemRow key={item.id} item={item} />
                      ))}
                    </tbody>
                  </table>
                  
                  {items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No items found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Claims Tab */}
          {activeTab === 'claims' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Review Claims</h3>
                <button
                  onClick={loadClaims}
                  className="btn-ghost flex items-center space-x-2"
                  disabled={loading}
                >
                  <Activity size={16} />
                  <span>Refresh</span>
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {claims.map((claim) => (
                    <div key={claim.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{claim.item_title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{claim.message}</p>
                          <div className="text-xs text-gray-500 mt-2">
                            Claimed by {claim.claimer_name} • {new Date(claim.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleClaimAction(claim.id, 'approved')}
                            className="btn-ghost text-green-600 text-sm"
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleClaimAction(claim.id, 'rejected')}
                            className="btn-ghost text-red-600 text-sm"
                          >
                            <XCircle size={14} className="mr-1" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {claims.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No pending claims found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">User Management</h3>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.user_type === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.user_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {user.account_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {users.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
};

export default AdminDashboard; 