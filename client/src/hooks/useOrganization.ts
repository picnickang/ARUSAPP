import { useState, useEffect } from 'react';

export interface OrganizationContext {
  orgId: string;
  organizationName?: string;
}

/**
 * Hook to get the current user's organization context.
 * 
 * Currently returns a default organization ID, but can be easily
 * upgraded to read from JWT token/localStorage when authentication
 * is fully implemented.
 * 
 * Future implementation should:
 * 1. Check localStorage for currentUser.orgId
 * 2. Parse JWT token for organization claims
 * 3. Handle organization switching for multi-tenant users
 */
export function useOrganization(): OrganizationContext {
  const [orgContext, setOrgContext] = useState<OrganizationContext>({
    orgId: "default-org-id",
    organizationName: "Default Organization"
  });

  useEffect(() => {
    // Future: Check localStorage for current user
    // const currentUser = localStorage.getItem('currentUser');
    // if (currentUser) {
    //   const user = JSON.parse(currentUser);
    //   setOrgContext({
    //     orgId: user.orgId,
    //     organizationName: user.organizationName
    //   });
    // }

    // Future: Parse JWT token
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   const claims = parseJWT(token);
    //   setOrgContext({
    //     orgId: claims.orgId,
    //     organizationName: claims.organizationName
    //   });
    // }
  }, []);

  return orgContext;
}

/**
 * Get the current organization ID synchronously.
 * Use this in forms and API calls where you need immediate access.
 */
export function getCurrentOrgId(): string {
  // Future: Check localStorage first
  // const currentUser = localStorage.getItem('currentUser');
  // if (currentUser) {
  //   const user = JSON.parse(currentUser);
  //   return user.orgId;
  // }

  // Future: Parse JWT token
  // const token = localStorage.getItem('authToken');
  // if (token) {
  //   const claims = parseJWT(token);
  //   return claims.orgId;
  // }

  // Fallback to default organization
  return "default-org-id";
}