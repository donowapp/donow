/**
 * TypeScript type definitions for Donow application
 * All data models and interfaces
 */

export interface User {
  uid: string;
  email: string;
  phone: string;
  name: string;
  profileImage?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bio?: string;
  isVerified: boolean;
  donationCount: number;
  receivedCount: number;
  rating: number;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  createdAt: Date;
  updatedAt: Date;
}

export interface Donation {
  id: string;
  userId: string;
  title: string;
  description: string;
  category:
    | 'medical'
    | 'medicines'
    | 'clothes'
    | 'books'
    | 'furniture'
    | 'electronics'
    | 'toys'
    | 'food'
    | 'emergency'
    | 'other';
  condition: 'new' | 'good' | 'fair' | 'worn';
  images: string[];
  location: {
    address: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  status: 'active' | 'completed' | 'rejected';
  viewCount: number;
  interestedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  donationId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Fundraiser {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetAmount: number;
  collectedAmount: number;
  medicalProof: string;
  status: 'active' | 'verified' | 'completed' | 'rejected';
  donors: Array<{ userId: string; amount: number; date: Date }>;
  createdAt: Date;
  updatedAt: Date;
}