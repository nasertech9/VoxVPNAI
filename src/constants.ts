import { Server } from './types';

export const SERVERS: Server[] = [
  { id: '1', name: 'Bahamas', country: 'Bahamas', flag: '🇧🇸', ip: '104.238.100.1', ping: 45, isPremium: false },
  { id: '2', name: 'Chile', country: 'Chile', flag: '🇨🇱', ip: '190.160.0.1', ping: 82, isPremium: false },
  { id: '3', name: 'Turkey', country: 'Turkey', flag: '🇹🇷', ip: '176.232.0.1', ping: 32, isPremium: false },
  { id: '4', name: 'Luxembourg', country: 'Luxembourg', flag: '🇱🇺', ip: '194.154.0.1', ping: 12, isPremium: true },
  { id: '5', name: 'Puerto Rico', country: 'Puerto Rico', flag: '🇵🇷', ip: '196.12.160.1', ping: 65, isPremium: true },
  { id: '6', name: 'United States', country: 'USA', flag: '🇺🇸', ip: '45.33.32.1', ping: 25, isPremium: false },
  { id: '7', name: 'United Kingdom', country: 'UK', flag: '🇬🇧', ip: '81.2.199.1', ping: 18, isPremium: false },
  { id: '8', name: 'Japan', country: 'Japan', flag: '🇯🇵', ip: '103.1.0.1', ping: 120, isPremium: true },
  { id: '9', name: 'Germany', country: 'Germany', flag: '🇩🇪', ip: '80.156.0.1', ping: 15, isPremium: false },
  { id: '10', name: 'Singapore', country: 'Singapore', flag: '🇸🇬', ip: '111.65.0.1', ping: 95, isPremium: true },
];

export const PRICING_TIERS = [
  { id: 'monthly', name: 'Monthly', price: '$9.99', period: '/mo', description: 'Best for short term' },
  { id: 'yearly', name: 'Yearly', price: '$79.99', period: '/yr', description: 'Save 33% annually', popular: true },
  { id: 'lifetime', name: 'Lifetime', price: '$199', period: '', description: 'One time payment' },
];
