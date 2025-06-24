import React, { useState } from 'react';
import { Button, Input } from '../ui';
import type { Book } from '../../types';

export interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (book: Omit<Book, 'id'>) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    status: 'want-to-read' as Book['status'],
    progress: 0,
    startDate: '',
    finishDate: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      title: '',
      author: '',
      status: 'want-to-read',
      progress: 0,
      startDate: '',
      finishDate: '',
      notes: ''
    });
    onClose();
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New Book</h2>
          <button 
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Book Title"
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              required
            />
            <Input
              label="Author"
              value={formData.author}
              onChange={e => handleChange('author', e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Reading Status
              </label>
              <select 
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="want-to-read">Want to Read</option>
                <option value="reading">Currently Reading</option>
                <option value="finished">Finished</option>
              </select>
            </div>
            <Input
              label="Progress (%)"
              type="number"
              value={formData.progress}
              onChange={e => handleChange('progress', parseInt(e.target.value) || 0)}
              min={0}
              max={100}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={e => handleChange('startDate', e.target.value)}
            />
            <Input
              label="Finish Date"
              type="date"
              value={formData.finishDate}
              onChange={e => handleChange('finishDate', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea 
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Your thoughts about this book..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-20 resize-vertical"
            />
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full md:w-auto">
              Add Book
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};