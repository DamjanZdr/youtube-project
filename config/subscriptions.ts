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
      { name: 'One project', included: true },
      { name: 'Up to 3 wiki documents', included: true },
      { name: 'Email support', included: false },
      { name: 'Collaboration', included: false },
      { name: 'Feature suggestions', included: false },
    ],
    limits: {
      projects: 1,
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
      monthly: process.env.NEXT_PUBLIC_STRIPE_CREATOR_MONTHLY_PRICE_ID || 'price_creator_monthly',
      yearly: process.env.NEXT_PUBLIC_STRIPE_CREATOR_YEARLY_PRICE_ID || 'price_creator_yearly',
    },
    features: [
      { name: 'Unlimited projects', included: true },
      { name: 'Unlimited wiki documents', included: true },
      { name: 'Email support', included: true },
      { name: 'Collaboration', included: false },
      { name: 'Feature suggestions', included: false },
    ],
    limits: {
      projects: -1, // unlimited
      channels: 3,
      teamMembers: 1,
      storageGb: 25,
    },
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For small teams and collaboration',
    price: {
      monthly: 29,
      yearly: 290, // 2 months free
    },
    stripePriceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly',
      yearly: process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID || 'price_team_yearly',
    },
    features: [
      { name: 'Unlimited projects', included: true },
      { name: 'Unlimited wiki documents', included: true },
      { name: 'Priority email support', included: true },
      { name: 'Collaboration (4 members)', included: true },
      { name: 'Feature suggestions', included: true },
    ],
    limits: {
      projects: -1,
      channels: -1,
      teamMembers: 4,
      storageGb: 50,
    },    popular: true,  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large teams with advanced needs',
    price: {
      monthly: 99,
      yearly: 990, // 2 months free
    },
    stripePriceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
      yearly: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly',
    },
    features: [
      { name: 'Unlimited projects', included: true },
      { name: 'Unlimited wiki documents', included: true },
      { name: 'Instant email support', included: true },
      { name: 'Collaboration (unlimited)', included: true },
      { name: 'Feature suggestions priority', included: true },
    ],
    limits: {
      projects: -1,
      channels: -1,
      teamMembers: -1, // unlimited
      storageGb: -1, // unlimited
    },
  },
];

export const getPlanById = (id: SubscriptionPlan): Plan | undefined => {
  return plans.find((plan) => plan.id === id);
};

export const getFreePlan = (): Plan => {
  return plans.find((plan) => plan.id === 'free')!;
};
