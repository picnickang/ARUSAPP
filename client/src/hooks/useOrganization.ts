import { useState, useEffect } from 'react';

export interface OrganizationContext {
  orgId: string;
  organizationName?: string;
  isLoading: boolean;
  error?: string;
}

export interface StoredUser {
  orgId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  organizationName?: string;
}

/**
 * Parse JWT token to extract claims (basic implementation)
 */
function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.warn('Failed to parse JWT token:', error);
    return null;
  }
}

/**
 * Hook to get the current user's organization context.
 * Reads from localStorage currentUser and authToken.
 */
export function useOrganization(): OrganizationContext {
  const [orgContext, setOrgContext] = useState<OrganizationContext>({
    orgId: "default-org-id",
    organizationName: "Default Organization",
    isLoading: true
  });

  useEffect(() => {
    const loadOrganizationContext = () => {
      try {
        // First, try to get org from stored currentUser
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
          const currentUser: StoredUser = JSON.parse(currentUserStr);
          if (currentUser.orgId) {
            setOrgContext({
              orgId: currentUser.orgId,
              organizationName: currentUser.organizationName || "Your Organization",
              isLoading: false
            });
            return;
          }
        }

        // Second, try to parse JWT token for org claims  
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          const claims = parseJWT(authToken);
          if (claims?.orgId) {
            setOrgContext({
              orgId: claims.orgId,
              organizationName: claims.organizationName || "Your Organization",
              isLoading: false
            });
            return;
          }
        }

        // Fallback: Use default organization (for development)
        console.warn('No authentication data found, using default organization');
        setOrgContext({
          orgId: "default-org-id",
          organizationName: "Default Organization",
          isLoading: false
        });

      } catch (error) {
        console.error('Error loading organization context:', error);
        setOrgContext({
          orgId: "default-org-id", 
          organizationName: "Default Organization",
          isLoading: false,
          error: 'Failed to load organization context'
        });
      }
    };

    loadOrganizationContext();

    // Listen for localStorage changes (user login/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser' || e.key === 'authToken') {
        loadOrganizationContext();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return orgContext;
}

/**
 * Get the current organization ID synchronously.
 * Use this in forms and API calls where you need immediate access.
 */
export function getCurrentOrgId(): string {
  try {
    // First priority: Check localStorage for current user
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      const currentUser: StoredUser = JSON.parse(currentUserStr);
      if (currentUser.orgId) {
        return currentUser.orgId;
      }
    }

    // Second priority: Parse JWT token for org claims
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      const claims = parseJWT(authToken);
      if (claims?.orgId) {
        return claims.orgId;
      }
    }

    // Development fallback: Log warning and use default
    console.warn('getCurrentOrgId(): No authentication data found, using default org');
    return "default-org-id";

  } catch (error) {
    console.error('Error getting current org ID:', error);
    return "default-org-id";
  }
}