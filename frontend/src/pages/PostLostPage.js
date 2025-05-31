import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Upload, MapPin, Calendar, Clock, DollarSign, AlertCircle, AlertTriangle } from 'lucide-react';
import { UserContext } from '../App';
import { itemsAPI, uploadAPI } from '../services/api';

const PostLostPage = () => {
  const { addItem } = useContext(UserContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    date: '',
    time: '',
    location: '',
    images: [],
    imageFiles: [], // Store actual files for upload
    reward: '',
    urgency: 'medium',
    contactPreference: 'email'
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
    'Main Library',
    'Student Cafeteria',
    'Computer Science Building',
    'Engineering Building',
    'Business Building',
    'Art Building',
    'Main Gymnasium',
    'Student Center',
    'Parking Lot A',
    'Parking Lot B',
    'Dormitory Area',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Validate file types and sizes
    const validFiles = [];
    const invalidFiles = [];
    
    files.forEach(file => {
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
      if (!validTypes.includes(file.type)) {
        invalidFiles.push(`${file.name}: Unsupported format`);
        return;
      }
      
      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        invalidFiles.push(`${file.name}: File too large (max 10MB)`);
        return;
      }
      
      validFiles.push(file);
    });
    
    if (invalidFiles.length > 0) {
      setError(`Some files were rejected: ${invalidFiles.join(', ')}`);
    }
    
    if (validFiles.length === 0) return;
    
    setUploadingImages(true);
    setError('');
    
    try {
      // Upload each file and get URLs
      const uploadResults = [];
      
      for (const file of validFiles) {
        try {
          console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);
          
          const response = await uploadAPI.uploadImage(file);
          console.log('Upload response:', response);
          
          uploadResults.push({
            url: response.public_url || response.url,
            preview: URL.createObjectURL(file), // For immediate preview
            file: file,
            name: file.name
          });
          
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          
          // Extract meaningful error message
          let errorMessage = `Failed to upload ${file.name}`;
          if (error.response?.data?.detail) {
            errorMessage += `: ${error.response.data.detail}`;
          } else if (error.message) {
            errorMessage += `: ${error.message}`;
          }
          
          setError(prev => prev ? `${prev}; ${errorMessage}` : errorMessage);
        }
      }
      
      if (uploadResults.length > 0) {
        // Add uploaded images to form data
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadResults.map(result => result.url)],
          imageFiles: [...prev.imageFiles, ...uploadResults]
        }));
        
        // Clear any previous errors if at least one upload succeeded
        if (uploadResults.length === validFiles.length) {
          setError('');
        }
      }
      
    } catch (error) {
      console.error('Error uploading images:', error);
      setError(`Failed to upload images: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    const newImageFiles = formData.imageFiles.filter((_, i) => i !== index);
    
    // Clean up blob URL if it exists
    if (formData.imageFiles[index]?.preview) {
      URL.revokeObjectURL(formData.imageFiles[index].preview);
    }
    
    setFormData({ 
      ...formData, 
      images: newImages,
      imageFiles: newImageFiles
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const itemData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        images: formData.images,
        reward: parseInt(formData.reward) || 0,
        urgency: formData.urgency,
        type: 'lost',
        date_lost: formData.date,
        time_lost: formData.time,
        contact_preference: formData.contactPreference
      };
      
      const response = await itemsAPI.createItem(itemData);
      addItem(response); // Update local state if needed
      
      // Clean up blob URLs
      formData.imageFiles.forEach(imageFile => {
        if (imageFile.preview) {
          URL.revokeObjectURL(imageFile.preview);
        }
      });
      
      // Show success message
      setError(''); // Clear any previous errors
      alert('✅ Your lost item has been posted successfully! We will notify you if someone finds it.');
      
      navigate(`/item/${response.id}`);
    } catch (err) {
      console.error('Error creating item:', err);
      
      // Handle different types of errors
      let errorMessage = 'Failed to create item. Please try again.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Handle Pydantic validation errors
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(error => 
            `${error.loc?.join(' → ') || 'Field'}: ${error.msg}`
          ).join(', ');
        } 
        // Handle string error messages
        else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
        // Handle object errors
        else if (typeof errorData === 'object') {
          errorMessage = JSON.stringify(errorData.detail);
        }
        // Handle direct error messages
        else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.title && formData.category;
      case 2:
        return formData.description && formData.date && formData.location;
      case 3:
        return true; // Images are optional
      case 4:
        return true; // Contact preferences are optional
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h3>
              
              {/* Item Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What did you lose?
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Blue iPhone 14 Pro, Black Leather Wallet"
                  className="form-input"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: category.id })}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        formData.category === category.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{category.icon}</div>
                      <div className="text-sm font-medium text-gray-800">{category.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Details</h3>
              
              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your lost item in detail (color, size, distinguishing features, etc.)"
                  rows={4}
                  className="form-textarea"
                  required
                />
              </div>

              {/* Date and Time */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Lost
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="form-input pl-12"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approximate Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="form-input pl-12"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Known Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="form-select pl-12"
                    required
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Photos (Optional)</h3>
              
              {/* Image Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload photos of your item
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors duration-200 relative">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">JPEG, PNG, GIF, WebP, BMP up to 10MB each</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImages}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {uploadingImages && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-blue-600 font-medium">Uploading images...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Preview */}
              {formData.imageFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Uploaded Images ({formData.imageFiles.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.imageFiles.map((imageFile, index) => (
                      <div key={index} className="relative">
                        <img
                          src={imageFile.preview || imageFile.url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                          onError={(e) => {
                            // Fallback to URL if preview fails
                            if (imageFile.url && e.target.src !== imageFile.url) {
                              e.target.src = imageFile.url;
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          ×
                        </button>
                        {/* Show upload status */}
                        {imageFile.url && (
                          <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center">
                            <span className="text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ✓ All images uploaded successfully and ready to post
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Additional Options</h3>
              
              {/* Reward */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reward (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    name="reward"
                    value={formData.reward}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className="form-input pl-12"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Offering a reward may increase chances of recovery
                </p>
              </div>

              {/* Urgency */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'low', label: 'Low', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                    { value: 'medium', label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
                    { value: 'high', label: 'High', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        formData.urgency === option.value
                          ? option.bg
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`font-medium ${option.color}`}>
                        {option.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'email', label: 'Email notifications' },
                    { value: 'message', label: 'In-app messaging only' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="contactPreference"
                        value={option.value}
                        checked={formData.contactPreference === option.value}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Report Lost Item</h1>
            <p className="text-gray-600">Help us help you find your lost item</p>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-center justify-center">
              {[1, 2, 3, 4].map((i) => (
                <React.Fragment key={i}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {i}
                  </div>
                  {i < 4 && (
                    <div className={`w-12 h-1 mx-2 ${step > i ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Basic Info</span>
              <span>Details</span>
              <span>Photos</span>
              <span>Options</span>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            className="card p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <form onSubmit={handleSubmit}>
              {renderStep()}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-6">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => step > 1 ? setStep(step - 1) : navigate('/dashboard')}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <ArrowLeft size={16} />
                  <span>{step > 1 ? 'Back' : 'Cancel'}</span>
                </button>
                <button
                  type="submit"
                  disabled={!isStepValid() || loading}
                  className="btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{step === 4 ? 'Post Item' : 'Continue'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Help Text */}
          <motion.div
            className="mt-6 p-4 bg-blue-50 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="text-blue-600 mt-0.5" size={20} />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Tips for better results:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Be as specific as possible in your description</li>
                  <li>• Include distinctive features or markings</li>
                  <li>• Upload clear photos from multiple angles</li>
                  <li>• Check back regularly for matches</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PostLostPage;