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
  savedDonations?: string[];
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
  featured?: boolean;
  flagged?: boolean;
  flagReason?: string;
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

export interface Review {
  id: string;
  donationId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'interest' | 'review';
  title: string;
  body: string;
  isRead: boolean;
  donationId?: string;
  conversationId?: string;
  createdAt: Date;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'user' | 'donation' | 'settings';
  targetId: string;
  details: string;
  createdAt: Date;
}

export interface PlatformSettings {
  platformName: string;
  tagline: string;
  supportEmail: string;
  heroImageUrl: string;
  messagingEnabled: boolean;
  requireVerificationForPosting: boolean;
  maxDonationsPerDay: number;
  ratingsEnabled: boolean;
  savedDonationsEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  // Branding
  logoUrl: string;
  ogImageUrl: string;
  // Dynamic homepage content
  trustBadges: Array<{ icon: string; label: string; enabled: boolean }>;
  heroStats: Array<{ icon: string; label: string; val: string; sub: string }>;
  // App links
  androidApkUrl: string;
  iosAppUrl: string;
  // Contact & social
  contactPhone: string;
  instagramUrl: string;
  twitterUrl: string;
  whatsappNumber: string;
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