/**
 * Stripe configuration
 */

export const stripeConfig = {
  // API version to use
  apiVersion: '2025-12-15.clover' as const,
  
  // Webhook events to listen for
  webhookEvents: [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
    'customer.created',
    'customer.updated',
  ] as const,
  
  // Success and cancel URLs for Checkout
  getCheckoutUrls: (baseUrl: string) => ({
    successUrl: `${baseUrl}/dashboard/billing?success=true`,
    cancelUrl: `${baseUrl}/dashboard/billing?canceled=true`,
  }),
  
  // Customer portal return URL
  getPortalReturnUrl: (baseUrl: string) => `${baseUrl}/dashboard/billing`,
};
