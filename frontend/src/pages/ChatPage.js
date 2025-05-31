import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Send, 
  User, 
  Package, 
  MapPin, 
  Calendar, 
  Clock,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail
} from 'lucide-react';
import { UserContext } from '../App';
import { messagesAPI } from '../services/api';
import ImageWithFallback from '../components/ImageWithFallback';

const ChatPage = () => {
  const { claimRequestId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversation();
  }, [claimRequestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await messagesAPI.getConversation(claimRequestId);
      setConversation(response);
      setMessages(response.messages || []);
      
      // Mark conversation as read
      messagesAPI.markConversationRead(claimRequestId).catch(console.error);
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await messagesAPI.sendMessage(claimRequestId, newMessage.trim());
      setMessages(prev => [...prev, response]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return `px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.pending}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/messages')}
            className="btn-primary"
          >
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
  const isItemOwner = conversation.item.user_id === user?.id;

  return (
    <div className="min-h-screen pt-20 pb-4">
      <div className="container-custom max-w-4xl">
        {/* Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <button
            onClick={() => navigate('/messages')}
            className="btn-ghost flex items-center space-x-2 mb-4"
          >
            <ArrowLeft size={16} />
            <span>Back to Messages</span>
          </button>

          {/* Conversation Header */}
          <div className="card p-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="text-gray-400" size={24} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">{conversation.item.title}</h1>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        conversation.item.type === 'lost' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {conversation.item.type}
                      </span>
                      <span>•</span>
                      <span>{conversation.item.location}</span>
                    </div>
                  </div>
                  <span className={getStatusBadge(conversation.claim_request.status)}>
                    {conversation.claim_request.status}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User size={14} />
                    <span>
                      Chatting with {otherParticipant?.first_name} {otherParticipant?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>
                      Claim made {new Date(conversation.claim_request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Initial claim message */}
            {conversation.claim_request.message && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Initial Claim Message:</h4>
                <p className="text-blue-800 text-sm">{conversation.claim_request.message}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Messages */}
        <motion.div
          className="card p-0 mb-6 h-96 flex flex-col"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isMyMessage = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isMyMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        isMyMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="form-input flex-1"
                disabled={sending}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="btn-primary flex items-center space-x-2 px-4"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </motion.div>

        {/* Action Cards */}
        <motion.div
          className="grid md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Item Details */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Item Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-gray-400" />
                <span>{conversation.item.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-gray-400" />
                <span>
                  {conversation.item.type === 'lost' ? 'Lost' : 'Found'} on{' '}
                  {new Date(conversation.item.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 mt-3">{conversation.item.description}</p>
            </div>
          </div>

          {/* Contact & Actions */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              {isItemOwner ? 'Claimer Info' : 'Owner Info'}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <User size={16} className="text-gray-400" />
                <span>{otherParticipant?.first_name} {otherParticipant?.last_name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail size={16} className="text-gray-400" />
                <span>{otherParticipant?.email}</span>
              </div>
            </div>

            {/* Status Actions */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-sm font-medium">Claim Status: {conversation.claim_request.status}</span>
              </div>
              
              {isItemOwner && conversation.claim_request.status === 'pending' && (
                <div className="space-y-2">
                  <button className="btn-primary w-full text-sm">
                    Approve Claim
                  </button>
                  <button className="btn-secondary w-full text-sm">
                    Decline Claim
                  </button>
                </div>
              )}
              
              {conversation.claim_request.status === 'approved' && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✓ Claim approved! Please coordinate the handover.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatPage; 