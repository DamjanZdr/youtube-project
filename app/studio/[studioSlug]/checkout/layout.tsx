/**
 * Checkout Layout
 * 
 * This layout allows checkout pages to work for pending studios
 * since paying is how they become active.
 */

interface CheckoutLayoutProps {
  children: React.ReactNode;
}

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  // Simple pass-through - checkout pages handle their own auth/validation
  return <>{children}</>;
}
