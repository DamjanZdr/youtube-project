/**
 * Organization hook
 * Access current organization data
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/lib/stores/ui-store';
import type { Organization } from '@/types';

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
  const activeOrganizationId = useUIStore((state) => state.activeOrganizationId);
  const setActiveOrganizationId = useUIStore((state) => state.setActiveOrganizationId);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true);
      
      // Fetch user's organizations
      // TODO: Implement this query based on your schema
      // const { data, error } = await supabase
      //   .from('organization_members')
      //   .select('organization:organizations(*)')
      //   .eq('user_id', userId);

      // For now, set empty state
      setOrganizations([]);
      setLoading(false);
    };

    fetchOrganizations();
  }, [supabase]);

  useEffect(() => {
    // Set active organization when it changes
    if (activeOrganizationId) {
      const org = organizations.find((o) => o.id === activeOrganizationId);
      setOrganization(org ?? null);
    } else if (organizations.length > 0) {
      // Default to first organization
      setOrganization(organizations[0]);
      setActiveOrganizationId(organizations[0].id);
    }
  }, [activeOrganizationId, organizations, setActiveOrganizationId]);

  const switchOrganization = (orgId: string) => {
    setActiveOrganizationId(orgId);
  };

  return {
    organization,
    organizations,
    loading,
    switchOrganization,
  };
}
