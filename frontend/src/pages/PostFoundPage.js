import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Upload, MapPin, Calendar, Clock, AlertCircle } from 'lucide-react';
import { UserContext } from '../App';
import { itemsAPI, uploadAPI } from '../services/api';

const PostFoundPage = () => {
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
    condition: '',
    date: '',
    time: '',
    location: '',
    storageLocation: '',
    images: [],
    imageFiles: [], // Store actual files for upload
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

  const conditions = [
    { value: 'excellent', label: 'Excellent', description: 'Like new, no damage' },
    { value: 'good', label: 'Good', description: 'Minor wear, fully functional' },
    { value: 'fair', label: 'Fair', description: 'Some wear or minor damage' },
    { value: 'poor', label: 'Poor', description: 'Significant damage or wear' }
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
      const uploadPromises = validFiles.map(async (file) => {
        try {
          const response = await uploadAPI.uploadImage(file);
          return {
            url: response.public_url,
            preview: URL.createObjectURL(file), // For immediate preview
            file: file
          };
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw new Error(`Failed to upload ${file.name}`);
        }
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      
      // Add uploaded images to form data
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadResults.map(result => result.url)],
        imageFiles: [...prev.imageFiles, ...uploadResults]
      }));
      
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
        images: formData.images, // Use uploaded URLs
        reward: 0,
        urgency: 'medium',
        type: 'found',
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
      alert('✅ Your found item has been posted successfully! Other users can now see it and contact you if it belongs to them.');
      
      // Navigate to the item page or back to home
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
        return formData.description && formData.condition && formData.date && formData.location;
      case 3:
        return true;
      case 4:
        return formData.storageLocation;
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
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What did you find?
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Red Backpack, Black Wallet, Silver iPhone"
                  className="form-input"
                  required
                />
              </div>

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
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the found item in detail (color, size, brand, any distinctive features)"
                  rows={4}
                  className="form-textarea"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition
                </label>
                <div className="space-y-2">
                  {conditions.map((condition) => (
                    <label key={condition.value} className="flex items-start">
                      <input
                        type="radio"
                        name="condition"
                        value={condition.value}
                        checked={formData.condition === condition.value}
                        onChange={handleInputChange}
                        className="mt-1 mr-3"
                        required
                      />
                      <div>
                        <div className="font-medium text-gray-800">{condition.label}</div>
                        <div className="text-sm text-gray-600">{condition.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Found
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Where did you find it?
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
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Photos</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload photos of the found item
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
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Storage & Contact</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Where is the item currently stored?
                </label>
                <textarea
                  name="storageLocation"
                  value={formData.storageLocation}
                  onChange={handleInputChange}
                  placeholder="e.g., Security office in Student Center, My dorm room (Building A, Room 205), etc."
                  rows={3}
                  className="form-textarea"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  This helps the owner know where to collect the item
                </p>
              </div>

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
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Report Found Item</h1>
            <p className="text-gray-600">Help reunite someone with their lost item</p>
          </motion.div>

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
              <span>Storage</span>
            </div>
          </motion.div>

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

          <motion.div
            className="mt-6 p-4 bg-green-50 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="text-green-600 mt-0.5" size={20} />
              <div className="text-sm text-green-700">
                <p className="font-medium mb-1">Thank you for being helpful!</p>
                <ul className="space-y-1 text-xs">
                  <li>• Your good deed helps build a stronger campus community</li>
                  <li>• Be sure to verify ownership before handing over items</li>
                  <li>• Consider storing valuable items in security office</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PostFoundPage;