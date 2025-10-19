# ARUS Production Deployment - BLOCKERS

**Date:** October 19, 2025  
**Status:** 🚫 NOT READY FOR PRODUCTION  
**Blocker Count:** 2 Critical

---

## CRITICAL BLOCKERS

### 1. Development Authentication Bypass (SECURITY CRITICAL)

**File:** `server/security.ts`  
**Issue:** Auto-authentication active in production code path

**Current Code:**
```typescript
export function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Development mode bypass - PRODUCTION BLOCKER
  if (process.env.NODE_ENV === 'development') {
    (req as any).user = {
      id: 'dev-admin-user',
      orgId: 'default-org-id',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true
    };
    next();
    return;
  }
  
  // ... rest of auth logic
}
```

**Security Impact:**
- ANY request gains admin access if NODE_ENV=development
- Multi-tenant isolation bypassed via fake org context
- RLS protection ineffective with auto-injected org_id
- **CANNOT DEPLOY TO PRODUCTION WITH THIS CODE**

**Required Fix:**
1. Remove development auto-auth fallback completely
2. Implement JWT-based authentication OR OAuth (Google/Microsoft)
3. Add session management (express-session + secure cookies)
4. Environment-specific configuration (separate dev/prod)
5. Comprehensive authentication testing

**Estimated Effort:** 40-60 hours

---

### 2. No Production Authentication System

**Issue:** Authentication infrastructure incomplete

**Missing Components:**
- [ ] JWT token generation and validation
- [ ] User login/register endpoints
- [ ] Password hashing (bcrypt/argon2)
- [ ] Session management
- [ ] Token refresh logic
- [ ] OAuth provider integration (optional)
- [ ] Password reset flow
- [ ] Email verification (optional)

**Recommendation:**
Implement JWT-based authentication with the following:

```typescript
// Proposed architecture
POST /api/auth/login
  → Validate credentials
  → Generate JWT with { userId, orgId, role }
  → Return token + refresh token

GET /api/protected-route
  → requireAuthentication checks JWT
  → Extracts user info from token
  → Sets req.user = { id, orgId, ... }
  → Continues to requireOrgId → withDatabaseContext
```

**Estimated Effort:** 40-60 hours

---

## HIGH-PRIORITY IMPROVEMENTS

### 3. Relationship Table Protection

**Status:** Currently protected via parent table joins

**Tables:**
- crew_skill, crew_cert, crew_leave (via crew table)
- crew_assignment (via crew + vessel)
- maintenance_checklist_items (via maintenance_schedules)
- stock, suppliers, purchase_orders (via parts_inventory)

**Current Approach:**
These tables don't have direct org_id column, so they inherit organization context through foreign key relationships. For example:

```sql
-- Accessing crew skills is protected because crew table has RLS
SELECT cs.* 
FROM crew_skill cs
JOIN crew c ON cs.crew_id = c.id
WHERE c.org_id = current_setting('app.current_org_id');
```

**Risk:** Medium - Storage layer must always join through parent tables

**Recommended Action:**
Add org_id columns to these tables and apply direct RLS (eliminates join dependency).

**Estimated Effort:** 8-16 hours

---

### 4. Storage Layer Refactoring

**File:** `server/storage.ts` (15,013 lines)

**Issue:** Monolithic storage interface with optional orgId

**Current Pattern:**
```typescript
async getVessels(orgId?: string) {
  // orgId is OPTIONAL - can return all vessels!
}
```

**Recommended Pattern:**
```typescript
async getVessels(orgId: string) {
  // orgId is REQUIRED - compile-time enforcement
}
```

**Action Items:**
1. Extract domain-specific repositories (VesselRepository, EquipmentRepository, etc.)
2. Make orgId parameter required (not optional) in all methods
3. Apply TypeScript strict mode to enforce non-null orgId
4. Refactor 15K lines → 8-10 domain repositories

**Estimated Effort:** 80-120 hours

---

### 5. Comprehensive Testing

**Current State:**
- 5 integration tests for multi-tenant security
- No E2E tests for authentication flow
- No performance tests for RLS queries
- Limited coverage for business logic

**Required Tests:**
```typescript
// Security tests
describe('Multi-tenant isolation', () => {
  it('blocks cross-org vessel access via API');
  it('blocks cross-org equipment queries');
  it('allows access to own org data only');
  it('handles NULL org context correctly');
});

// Authentication tests
describe('Authentication flow', () => {
  it('requires valid JWT for protected routes');
  it('rejects expired tokens');
  it('validates org membership on every request');
  it('logs failed auth attempts');
});

// E2E tests
describe('Work order flow', () => {
  it('creates work order → assigns crew → completes with parts');
  it('generates cost savings report');
  it('enforces org boundaries throughout flow');
});
```

**Estimated Effort:** 40-60 hours

---

## DEPLOYMENT CHECKLIST

### Pre-Production (Must Complete)

- [ ] **Remove development auto-auth** from server/security.ts
- [ ] **Implement production authentication** (JWT or OAuth)
- [ ] **Add comprehensive auth tests** (unit + integration + E2E)
- [ ] **Security audit** of authentication flow
- [ ] **Penetration testing** for cross-tenant isolation
- [ ] **Load testing** with RLS policies enabled
- [ ] **Document authentication API** (OpenAPI/Swagger)

### Production Configuration

- [ ] **Environment variables** properly configured
  - [ ] NODE_ENV=production
  - [ ] JWT_SECRET (strong random key)
  - [ ] DATABASE_URL (production database)
  - [ ] ADMIN_TOKEN removed or rotated
- [ ] **HTTPS/TLS** enabled and enforced
- [ ] **Rate limiting** configured per organization
- [ ] **Monitoring/alerting** for failed auth attempts
- [ ] **Database backups** configured and tested
- [ ] **Disaster recovery** plan documented

### Nice-to-Have (Post-Launch)

- [ ] OAuth providers (Google, Microsoft, etc.)
- [ ] Two-factor authentication (2FA)
- [ ] API documentation (Swagger UI)
- [ ] Admin dashboard for monitoring
- [ ] Automated deployment pipeline (CI/CD)
- [ ] Performance monitoring (APM)

---

## RISK ASSESSMENT

### If Deployed Without Fixing Blockers:

**Scenario 1: Development Mode in Production**
- If NODE_ENV=development, all requests auto-authenticate
- Attackers gain instant admin access
- Complete multi-tenant isolation bypass
- **Risk Level: CRITICAL - Data breach imminent**

**Scenario 2: Production Mode Without Auth**
- No authentication endpoint exists
- Application returns 401 for all requests
- **Risk Level: HIGH - Application unusable**

**Scenario 3: Weak Authentication Implementation**
- Rushed implementation with security flaws
- JWT secret leaked or hardcoded
- No rate limiting on login attempts
- **Risk Level: HIGH - Unauthorized access likely**

---

## TIMELINE ESTIMATE

**Total Effort:** 120-180 hours (3-4 weeks for 1 developer)

**Week 1: Authentication Foundation**
- Remove dev auto-auth
- Implement JWT authentication
- Add login/register endpoints
- Basic testing

**Week 2: Security Hardening**
- Session management
- Rate limiting
- Comprehensive auth tests
- Security audit

**Week 3: Storage Refactoring**
- Extract domain repositories
- Make orgId required
- Refactor storage layer

**Week 4: Testing & Documentation**
- E2E test suite
- API documentation
- Deployment guide
- Production configuration

---

## CONTACT

**Security Questions:** Engineering Security Team  
**Production Deployment:** DevOps Team  
**Architecture Review:** Engineering Leadership

---

**Document Classification:** Internal - Critical  
**Review Cycle:** Weekly until blockers resolved  
**Next Review:** October 26, 2025
