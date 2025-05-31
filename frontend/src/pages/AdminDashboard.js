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
  Activity
} from 'lucide-react';
import { UserContext } from '../App';

const AdminDashboard = () => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
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

  // Enhanced admin data with dispute management
  const adminStats = {
    totalUsers: 1247,
    activeItems: 89,
    resolvedItems: 234,
    pendingClaims: 15,
    pendingDisputes: 3,
    flaggedItems: 8,
    totalClaims: 178,
    successRate: 87.5,
    dailyRegistrations: 12,
    weeklyItems: 45,
    averageResponseTime: '2.3 hours'
  };

  // Enhanced mock data with dispute scenarios
  const recentItems = [
    {
      id: 1,
      title: 'Blue iPhone 14 Pro',
      type: 'lost',
      user: 'John Doe',
      email: 'john.doe@umt.edu',
      status: 'active',
      urgency: 'high',
      created_at: '2025-01-20T10:30:00Z',
      location: 'Main Library',
      flagged: false,
      views: 145,
      claims_count: 2,
      verified: true
    },
    {
      id: 2,
      title: 'Red Backpack',
      type: 'found',
      user: 'Jane Smith',
      email: 'jane.smith@umt.edu',
      status: 'disputed',
      urgency: 'medium',
      created_at: '2025-01-20T09:15:00Z',
      location: 'Student Center',
      flagged: true,
      flagReason: 'Multiple conflicting claims',
      views: 89,
      claims_count: 3,
      verified: false
    },
    {
      id: 3,
      title: 'Suspicious Electronics Bundle',
      type: 'found',
      user: 'Unknown User',
      email: 'suspicious@temp.com',
      status: 'under_review',
      urgency: 'high',
      created_at: '2025-01-20T08:00:00Z',
      location: 'Parking Lot',
      flagged: true,
      flagReason: 'Potential stolen goods',
      views: 23,
      claims_count: 0,
      verified: false
    }
  ];

  const pendingClaims = [
    {
      id: 1,
      itemTitle: 'Blue iPhone 14 Pro',
      claimer: 'Alice Johnson',
      claimerEmail: 'alice.j@umt.edu',
      owner: 'John Doe',
      ownerEmail: 'john.doe@umt.edu',
      message: 'This is my phone! I can provide the IMEI number and purchase receipt.',
      evidence: ['receipt.pdf', 'imei_screenshot.jpg'],
      created_at: '2025-01-20T11:00:00Z',
      status: 'pending',
      priority: 'high',
      responseTime: '2 hours ago'
    },
    {
      id: 2,
      itemTitle: 'Red Backpack',
      claimer: 'Bob Wilson',
      claimerEmail: 'bob.w@umt.edu',
      owner: 'Jane Smith',
      ownerEmail: 'jane.smith@umt.edu',
      message: 'This looks like my backpack that I lost yesterday.',
      evidence: [],
      created_at: '2025-01-20T10:30:00Z',
      status: 'disputed',
      priority: 'medium',
      responseTime: '3 hours ago',
      disputeReason: 'Owner claims this is not the same backpack'
    }
  ];

  const mockDisputes = [
    {
      id: 1,
      itemTitle: 'Red Backpack',
      itemId: 2,
      type: 'ownership_dispute',
      claimants: [
        { name: 'Bob Wilson', email: 'bob.w@umt.edu', evidence: 'Photo showing similar backpack' },
        { name: 'Carol Davis', email: 'carol.d@umt.edu', evidence: 'Purchase receipt from last month' }
      ],
      owner: 'Jane Smith',
      ownerEmail: 'jane.smith@umt.edu',
      description: 'Multiple students claiming the same backpack with conflicting evidence.',
      status: 'investigating',
      priority: 'high',
      created_at: '2025-01-20T09:00:00Z',
      lastActivity: '1 hour ago',
      assignedTo: 'Admin Team'
    },
    {
      id: 2,
      itemTitle: 'MacBook Pro',
      itemId: 7,
      type: 'false_claim',
      claimants: [
        { name: 'Dave Brown', email: 'dave.b@umt.edu', evidence: 'Claims serial number matches' }
      ],
      owner: 'Emma Taylor',
      ownerEmail: 'emma.t@umt.edu',
      description: 'Owner disputes claim, says serial number provided is incorrect.',
      status: 'pending_review',
      priority: 'medium',
      created_at: '2025-01-19T15:30:00Z',
      lastActivity: '6 hours ago',
      assignedTo: 'Tech Verification Team'
    }
  ];

  const flaggedContent = [
    {
      id: 1,
      type: 'item',
      title: 'Suspicious Electronics Bundle',
      user: 'Unknown User',
      reason: 'Potential stolen goods - multiple high-value items found together',
      flaggedBy: 'Auto-moderation + User reports',
      created_at: '2025-01-20T08:45:00Z',
      severity: 'high',
      actionRequired: true,
      reportCount: 5
    },
    {
      id: 2,
      type: 'claim',
      title: 'False identity claim',
      user: 'Suspicious Claimer',
      reason: 'Using fake email domain',
      flaggedBy: 'Email verification system',
      created_at: '2025-01-20T07:30:00Z',
      severity: 'medium',
      actionRequired: true,
      reportCount: 1
    }
  ];

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

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[priority] || styles.medium}`;
  };

  const handleItemAction = async (itemId, action, note = '') => {
    console.log(`${action} item ${itemId}`, note ? `Note: ${note}` : '');
    // Here you would make API calls to the backend
    // Example: await api.updateItemStatus(itemId, action, note);
    
    // For demo, update local state
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status: action === 'approve' ? 'active' : action === 'reject' ? 'archived' : action }
        : item
    ));
    
    // Close any modals
    setSelectedItem(null);
    setModerationNote('');
  };

  const handleClaimAction = async (claimId, action, note = '') => {
    console.log(`${action} claim ${claimId}`, note ? `Note: ${note}` : '');
    // API call would go here
    
    // Update local state for demo
    setClaims(prev => prev.map(claim =>
      claim.id === claimId
        ? { ...claim, status: action }
        : claim
    ));
  };

  const handleDisputeAction = async (disputeId, action, note = '') => {
    console.log(`${action} dispute ${disputeId}`, note ? `Note: ${note}` : '');
    // API call would go here
    
    // Update local state for demo
    setDisputes(prev => prev.map(dispute =>
      dispute.id === disputeId
        ? { ...dispute, status: action, lastActivity: 'Just now' }
        : dispute
    ));
  };

  const exportData = (type) => {
    console.log(`Exporting ${type} data`);
    // Implement data export functionality
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue", subtitle }) => (
    <div className="card p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp size={14} className="text-green-500 mr-1" />
              <span className="text-sm text-green-600">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-xl`}>
          <Icon size={24} className={`text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const ItemRow = ({ item }) => (
    <tr className="hover:bg-gray-50 border-l-4 border-l-transparent hover:border-l-blue-500 transition-all">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {item.flagged && (
            <Flag size={16} className="text-red-500 mr-2" title="Flagged for review" />
          )}
          {!item.verified && (
            <AlertCircle size={16} className="text-yellow-500 mr-2" title="Unverified" />
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
          <div className="text-sm font-medium text-gray-900">{item.user}</div>
          <div className="text-sm text-gray-500">{item.email}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getStatusBadge(item.status)}>{item.status.replace('_', ' ')}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getUrgencyBadge(item.urgency)}>{item.urgency}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div>{new Date(item.created_at).toLocaleDateString()}</div>
        <div className="text-xs">
          {item.views} views • {item.claims_count} claims
        </div>
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
        </div>
      </td>
    </tr>
  );

  const ClaimRow = ({ claim }) => (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{claim.itemTitle}</div>
        {claim.evidence && claim.evidence.length > 0 && (
          <div className="text-xs text-blue-600 mt-1">
            📎 {claim.evidence.length} attachment(s)
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{claim.claimer}</div>
          <div className="text-sm text-gray-500">{claim.claimerEmail}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{claim.owner}</div>
          <div className="text-sm text-gray-500">{claim.ownerEmail}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 max-w-xs">
          <div className="truncate">{claim.message}</div>
          {claim.disputeReason && (
            <div className="text-xs text-red-600 mt-1">⚠ {claim.disputeReason}</div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getPriorityBadge(claim.priority)}>{claim.priority}</span>
        <div className="text-xs text-gray-500 mt-1">{claim.responseTime}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => handleClaimAction(claim.id, 'approved')}
            className="btn-ghost text-green-600 text-xs"
          >
            <CheckCircle size={14} className="mr-1" />
            Approve
          </button>
          <button
            onClick={() => handleClaimAction(claim.id, 'rejected')}
            className="btn-ghost text-red-600 text-xs"
          >
            <XCircle size={14} className="mr-1" />
            Reject
          </button>
          {claim.status === 'disputed' && (
            <button
              onClick={() => handleClaimAction(claim.id, 'investigate')}
              className="btn-ghost text-yellow-600 text-xs"
            >
              <AlertTriangle size={14} className="mr-1" />
              Investigate
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const DisputeCard = ({ dispute }) => (
    <div className="card p-6 border-l-4 border-l-yellow-500">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">{dispute.itemTitle}</h4>
          <p className="text-sm text-gray-600">{dispute.type.replace('_', ' ')}</p>
          <span className={getPriorityBadge(dispute.priority)}>{dispute.priority} priority</span>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>{dispute.lastActivity}</div>
          <div className="text-xs">Assigned to: {dispute.assignedTo}</div>
        </div>
      </div>
      
      <p className="text-sm text-gray-700 mb-4">{dispute.description}</p>
      
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Involved Parties:</div>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Owner:</span> {dispute.owner} ({dispute.ownerEmail})
          </div>
          {dispute.claimants.map((claimant, index) => (
            <div key={index} className="text-sm">
              <span className="font-medium">Claimant {index + 1}:</span> {claimant.name} ({claimant.email})
              <div className="text-xs text-gray-600 ml-4">Evidence: {claimant.evidence}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => handleDisputeAction(dispute.id, 'resolve')}
          className="btn-primary text-sm"
        >
          Resolve Dispute
        </button>
        <button
          onClick={() => handleDisputeAction(dispute.id, 'escalate')}
          className="btn-secondary text-sm"
        >
          Escalate
        </button>
        <button className="btn-ghost text-sm">
          <MessageSquare size={14} className="mr-1" />
          Contact Parties
        </button>
      </div>
    </div>
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
              <p className="capitalize">{item.status.replace('_', ' ')}</p>
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
            <label className="text-sm font-medium text-gray-600">User</label>
            <p>{item.user} ({item.email})</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600">Stats</label>
            <p>{item.views} views • {item.claims_count} claims • Posted {new Date(item.created_at).toLocaleDateString()}</p>
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
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-20 pb-12 bg-gray-50 min-h-screen">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <Shield className="text-blue-600" size={32} />
                <div>
                  <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
                  <p className="text-gray-600">Monitor submissions and resolve disputes</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => exportData('all')}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download size={16} />
                <span>Export Data</span>
              </button>
              <button className="btn-primary flex items-center space-x-2">
                <Mail size={16} />
                <span>Send Notifications</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Overview */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <StatCard
            title="Total Users"
            value={adminStats.totalUsers.toLocaleString()}
            icon={Users}
            trend="+12 today"
            color="blue"
          />
          <StatCard
            title="Pending Reviews"
            value={adminStats.pendingClaims + adminStats.flaggedItems}
            icon={Clock}
            subtitle="Claims + Flagged items"
            color="yellow"
          />
          <StatCard
            title="Active Disputes"
            value={adminStats.pendingDisputes}
            icon={AlertTriangle}
            subtitle={`Avg response: ${adminStats.averageResponseTime}`}
            color="red"
          />
          <StatCard
            title="Platform Health"
            value={`${adminStats.successRate}%`}
            icon={Activity}
            trend="+2.3%"
            color="green"
          />
        </motion.div>

        {/* Enhanced Tabs */}
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
                { id: 'submissions', label: 'Monitor Submissions', badge: adminStats.flaggedItems },
                { id: 'claims', label: 'Review Claims', badge: adminStats.pendingClaims },
                { id: 'disputes', label: 'Resolve Disputes', badge: adminStats.pendingDisputes },
                { id: 'users', label: 'User Management', badge: null },
                { id: 'flagged', label: 'Flagged Content', badge: adminStats.flaggedItems }
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
                    {recentItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {item.flagged && <Flag size={16} className="text-red-500" />}
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-gray-600">{item.user} • {item.location}</p>
                          </div>
                        </div>
                        <span className={getStatusBadge(item.status)}>{item.status.replace('_', ' ')}</span>
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
                          {adminStats.flaggedItems} pending
                        </span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('disputes')}
                      className="w-full text-left p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="text-red-600" size={20} />
                          <span className="font-medium">Resolve Active Disputes</span>
                        </div>
                        <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs">
                          {adminStats.pendingDisputes} active
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
                          {adminStats.pendingClaims} pending
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monitor Submissions Tab */}
          {activeTab === 'submissions' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Monitor Submissions</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search submissions..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.flaggedOnly}
                        onChange={(e) => setFilters(prev => ({ ...prev, flaggedOnly: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Flagged only</span>
                    </label>
                  </div>
                  <button className="btn-ghost flex items-center space-x-2">
                    <Filter size={16} />
                    <span>Filter</span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentItems
                      .filter(item => !filters.flaggedOnly || item.flagged)
                      .map((item) => (
                        <ItemRow key={item.id} item={item} />
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Claims Review Tab */}
          {activeTab === 'claims' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Review Claim Requests</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search claims..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Claims</option>
                    <option value="pending">Pending</option>
                    <option value="disputed">Disputed</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claimer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingClaims.map((claim) => (
                      <ClaimRow key={claim.id} claim={claim} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Disputes Resolution Tab */}
          {activeTab === 'disputes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">Resolve Disputes</h3>
                <div className="flex items-center space-x-4">
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Disputes</option>
                    <option value="investigating">Investigating</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="escalated">Escalated</option>
                  </select>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Priorities</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>
              
              {mockDisputes.length === 0 ? (
                <div className="card p-12 text-center">
                  <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Disputes</h4>
                  <p className="text-gray-600">All disputes have been resolved. Great job maintaining platform trust!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockDisputes.map((dispute) => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Existing tabs remain the same but can be enhanced with similar patterns */}
          {activeTab === 'users' && (
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">User Management</h3>
              <p className="text-gray-600 mb-4">Manage user accounts, roles, and permissions.</p>
              {/* Add user management interface */}
            </div>
          )}

          {activeTab === 'flagged' && (
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Flagged Content</h3>
              <div className="space-y-4">
                {flaggedContent.map((item) => (
                  <div key={item.id} className={`border rounded-lg p-4 ${
                    item.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Flag className={item.severity === 'high' ? 'text-red-600' : 'text-yellow-600'} size={16} />
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.severity === 'high' 
                              ? 'bg-red-200 text-red-800' 
                              : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            {item.severity} risk
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{item.reason}</p>
                        <div className="text-xs text-gray-500">
                          Reported by {item.flaggedBy} • {item.reportCount} reports • {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button className="btn-ghost text-green-600 text-sm">
                          <CheckCircle size={14} className="mr-1" />
                          Approve
                        </button>
                        <button className="btn-ghost text-red-600 text-sm">
                          <Ban size={14} className="mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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