/**
 * Subscription plans configuration
 * Update STRIPE_PRICE_IDs with your actual Stripe price IDs
 */

import type { SubscriptionPlan } from '@/types';

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number | string;
}

export interface Plan {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  stripePriceId: {
    monthly: string;
    yearly: string;
  };
  features: PlanFeature[];
  limits: {
    projects: number;
    channels: number;
    teamMembers: number;
    storageGb: number;
  };
  popular?: boolean;
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    price: {
      monthly: 0,
      yearly: 0,
    },
    stripePriceId: {
      monthly: '', // Free tier - no Stripe price
      yearly: '',
    },
    features: [
      { name: 'Up to 3 projects', included: true },
      { name: '1 channel', included: true },
      { name: 'Basic script editor', included: true },
      { name: 'Kanban workflow', included: true },
      { name: '1GB storage', included: true },
      { name: 'Team collaboration', included: false },
      { name: 'Advanced analytics', included: false },
      { name: 'Priority support', included: false },
    ],
    limits: {
      projects: 3,
      channels: 1,
      teamMembers: 1,
      storageGb: 1,
    },
  },
  {
    id: 'creator',
    name: 'Creator',
    description: 'For individual creators who want more',
    price: {
      monthly: 12,
      yearly: 120, // 2 months free
    },
    stripePriceId: {
      monthly: process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID || 'price_creator_monthly',
      yearly: process.env.STRIPE_CREATOR_YEARLY_PRICE_ID || 'price_creator_yearly',
    },
    features: [
      { name: 'Unlimited projects', included: true },
      { name: 'Up to 3 channels', included: true },
      { name: 'Advanced script editor', included: true },
      { name: 'Kanban workflow', included: true },
      { name: '25GB storage', included: true },
      { name: 'Channel branding preview', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Email support', included: true },
    ],
    limits: {
      projects: -1, // unlimited
      channels: 3,
      teamMembers: 1,
      storageGb: 25,
    },
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'For teams and multi-channel creators',
    price: {
      monthly: 39,
      yearly: 390, // 2 months free
    },
    stripePriceId: {
      monthly: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID || 'price_studio_monthly',
      yearly: process.env.STRIPE_STUDIO_YEARLY_PRICE_ID || 'price_studio_yearly',
    },
    features: [
      { name: 'Unlimited projects', included: true },
      { name: 'Unlimited channels', included: true },
      { name: 'Advanced script editor', included: true },
      { name: 'Kanban workflow', included: true },
      { name: '100GB storage', included: true },
      { name: 'Channel branding preview', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Team collaboration (up to 10)', included: true },
      { name: 'Role-based permissions', included: true },
      { name: 'Priority support', included: true },
      { name: 'API access', included: true },
    ],
    limits: {
      projects: -1,
      channels: -1,
      teamMembers: 10,
      storageGb: 100,
    },
  },
];

export const getPlanById = (id: SubscriptionPlan): Plan | undefined => {
  return plans.find((plan) => plan.id === id);
};

export const getFreePlan = (): Plan => {
  return plans.find((plan) => plan.id === 'free')!;
};
