# Claude Chat Export
**Generated: 2025-12-29 16:05:44**

---

👤 **USER:**
> Explore the frontend codebase structure to understand:
1. Current navigation/routing implementation
2. How admin-only pages/components are implemented (if any)
3. Current auth/role checking implementation
4. Page/view structure and patterns used

Focus on finding:
- Routing configuration files
- Admin or role-based components
- Authentication/authorization context or hooks
- Main layout/navigation components

I'll explore the frontend codebase to understand the current navigation, routing, and authentication/authorization implementation. Let me start by examining the structure and key files.

Now let me examine the key routing and auth files:

Now let me examine the auth store, protected route, and admin pages:

Now let me examine the auth types and look at the directory structure:

Let me look at the main.tsx and main routes configuration:

Let me look at the full page structure to understand the patterns:

Let me get more information about the profile page and look at the overall frontend structure:

Perfect! Let me create a comprehensive summary document. Let me gather just a bit more information about the API client and auth service:

Perfect! Now let me create a comprehensive exploration report of the frontend codebase structure.

## Frontend Codebase Structure Exploration Report

I've thoroughly explored the photo restoration frontend application. Here's a comprehensive analysis of the navigation, routing, and authentication/authorization implementation:

### 1. CURRENT NAVIGATION/ROUTING IMPLEMENTATION

**Route Configuration Location:** `/Users/mike/src/photo-restoration-webpage/frontend/src/app/App.tsx`

**Current Routes:**
- `POST /login` - LoginPage (public, no layout)
- `POST /change-password` - ForcePasswordChangePage (special protected route)
- `GET /` - RestorationPage (protected)
- `GET /history` - HistoryPage (protected)
- `GET /profile` - ProfilePage (protected)
- `GET /admin/users` - AdminUsersPage (admin-only)
- `*` - Wildcard redirect to home

**Routing Structure:**
- React Router v6 (BrowserRouter)
- Routes organized by protection level (public → protected → admin)
- Protected routes wrapped with Layout component
- Two route wrapper patterns: `ProtectedRoute` and `AdminRoute`

### 2. ADMIN-ONLY PAGES/COMPONENTS IMPLEMENTATION

**Admin Route Protection:** `/Users/mike/src/photo-restoration-webpage/frontend/src/components/AdminRoute.tsx`

```tsx
- Checks isAuthenticated status
- Validates user.role === 'admin'
- Redirects non-admin users to home (/)
- Redirects unauthenticated to /login
```

**Admin Pages/Features:**
- **Main Admin Page:** `/Users/mike/src/photo-restoration-webpage/frontend/src/features/admin/pages/AdminUsersPage.tsx`
  - User management dashboard
  - Create/Edit/Delete users
  - Reset password functionality
  - Paginated user list with filtering
  - Multiple dialogs for operations

**Admin Components:**
- `/features/admin/components/UserList.tsx`
- `/features/admin/components/CreateUserDialog.tsx`
- `/features/admin/components/EditUserDialog.tsx`
- `/features/admin/components/DeleteUserDialog.tsx`
- `/features/admin/components/ResetPasswordDialog.tsx`

**Admin Navigation Integration:** `/Users/mike/src/photo-restoration-webpage/frontend/src/components/Layout.tsx`
- Admin link only shows when `user?.role === 'admin'` (line 85)
- Nav link to `/admin/users` with active state tracking

### 3. AUTH/ROLE CHECKING IMPLEMENTATION

**Authentication Store:** `/Users/mike/src/photo-restoration-webpage/frontend/src/services/authStore.ts`
- **Library:** Zustand with persist middleware
- **State Management:**
  - `isAuthenticated: boolean`
  - `user: User | null` (contains username, role, password_must_change)
  - `token: string | null` (JWT token)
  - `expiresAt: number | null` (token expiration timestamp)
  - `loginTime: string | null`
  - `hasHydrated: boolean` (rehydration tracking)

**Key Auth Features:**
- Automatic localStorage persistence
- Token expiry checking (every 60 seconds via setupTokenExpiryCheck)
- Auto-logout on expired token
- Rehydration from localStorage on app start
- Manual and automatic token validation

**Auth Hook:** `/Users/mike/src/photo-restoration-webpage/frontend/src/features/auth/hooks/useAuth.ts`
- `useAuth()` hook for login/logout
- JWT token decoding (extracts sub, role, password_must_change)
- Error/loading state management
- Automatic redirect after login (or to /change-password if required)

**Protected Route Component:** `/Users/mike/src/photo-restoration-webpage/frontend/src/app/ProtectedRoute.tsx`
- Waits for Zustand rehydration (hasHydrated check)
- Redirects unauthenticated users to /login
- Redirects users with password_must_change flag to /change-password
- Performs token expiry check on every render

**Special Routes:**
- **RequirePasswordChangeRoute:** `/Users/mike/src/photo-restoration-webpage/frontend/src/components/RequirePasswordChangeRoute.tsx`
  - Only allows access when password_must_change is true
  - Redirects to home if password already changed

### 4. PAGE/VIEW STRUCTURE AND PATTERNS

**Directory Structure:**
```
frontend/src/
├── app/
│   ├── App.tsx (main routing)
│   └── ProtectedRoute.tsx
├── components/
│   ├── AdminRoute.tsx (role-based protection)
│   ├── RequirePasswordChangeRoute.tsx
│   ├── Layout.tsx (header/footer/nav)
│   ├── Button.tsx, Input.tsx, Loader.tsx, etc.
└── features/
    ├── auth/
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   └── ForcePasswordChangePage.tsx
    │   ├── components/
    │   │   └── LoginForm.tsx
    │   ├── hooks/
    │   │   └── useAuth.ts
    │   ├── services/
    │   │   └── authService.ts
    │   └── types.ts
    ├── restoration/
    │   ├── pages/
    │   │   └── RestorationPage.tsx
    │   ├── components/
    │   │   ├── ImageUploader.tsx
    │   │   ├── ModelSelector.tsx
    │   │   ├── ProcessingStatus.tsx
    │   │   └── ImageComparison.tsx
    │   ├── hooks/
    │   │   └── useImageRestore.ts
    │   └── services/
    │       └── restorationService.ts
    ├── history/
    │   ├── pages/
    │   │   └── HistoryPage.tsx
    │   ├── components/
    │   │   ├── HistoryList.tsx
    │   │   └── HistoryCard.tsx
    │   ├── hooks/
    │   │   └── useHistory.ts
    │   └── services/
    │       └── historyService.ts
    ├── profile/
    │   ├── pages/
    │   │   └── ProfilePage.tsx
    │   ├── components/
    │   │   ├── ProfileView.tsx
    │   │   ├── ChangePasswordForm.tsx
    │   │   └── SessionsList.tsx
    │   ├── hooks/
    │   │   └── useProfile.ts
    │   └── services/
    │       └── profileService.ts
    └── admin/
        ├── pages/
        │   └── AdminUsersPage.tsx
        ├── components/
        │   ├── UserList.tsx
        │   ├── CreateUserDialog.tsx
        │   ├── EditUserDialog.tsx
        │   ├── DeleteUserDialog.tsx
        │   └── ResetPasswordDialog.tsx
        ├── hooks/
        │   └── useAdminUsers.ts
        ├── services/
        │   └── adminService.ts
        └── types.ts
```

**Page Patterns:**
1. **Page Component** (e.g., RestorationPage)
   - Top-level container with container div
   - Page header with title/subtitle
   - Multiple sections for different UI areas
   - Uses feature-specific hooks for logic

2. **Feature Hooks** (e.g., useImageRestore, useHistory, useProfile)
   - Business logic management
   - State handling (loading, error, data)
   - API integration
   - Callbacks for user actions

3. **Feature Services** (e.g., restorationService)
   - API client wrappers
   - Direct fetch calls with error handling

4. **Feature Types** (e.g., types.ts in each feature)
   - TypeScript interfaces for API responses
   - Component prop types

### 5. KEY FILES REFERENCE

| Purpose | File Path |
|---------|-----------|
| App routing config | `/frontend/src/app/App.tsx` |
| Protected route wrapper | `/frontend/src/app/ProtectedRoute.tsx` |
| Admin route wrapper | `/frontend/src/components/AdminRoute.tsx` |
| Password change route wrapper | `/frontend/src/components/RequirePasswordChangeRoute.tsx` |
| Main layout with nav | `/frontend/src/components/Layout.tsx` |
| Auth store (Zustand) | `/frontend/src/services/authStore.ts` |
| Auth hook | `/frontend/src/features/auth/hooks/useAuth.ts` |
| Auth service | `/frontend/src/features/auth/services/authService.ts` |
| Auth types | `/frontend/src/features/auth/types.ts` |
| API client | `/frontend/src/services/apiClient.ts` |

### 6. AUTHENTICATION FLOW

1. **Login Flow:**
   - User submits credentials at `/login`
   - `useAuth().login()` calls `authService.login()`
   - JWT decoded to extract `sub` (username), `role`, `password_must_change`
   - Token stored in auth store (which persists to localStorage)
   - If password_must_change: redirect to `/change-password`
   - Otherwise: redirect to `/`

2. **Protected Access:**
   - Each protected route wrapped with `<ProtectedRoute>`
   - ProtectedRoute checks `isAuthenticated` and `hasHydrated`
   - Redirects to `/login` if not authenticated
   - Checks token expiry every 60 seconds

3. **Admin Access:**
   - Admin routes wrapped with `<AdminRoute>`
   - AdminRoute checks `user.role === 'admin'`
   - Redirects non-admins to `/`

4. **Token Expiry:**
   - `setupTokenExpiryCheck()` runs interval check every minute
   - Auto-logout if token expired
   - API client also checks token expiry before requests

### 7. ROLE SYSTEM

**Two Roles:**
- `user` - Regular user (can access: home, history, profile)
- `admin` - Administrator (can access: all user features + admin users management)

**Role Detection:**
- Extracted from JWT token payload during login
- Stored in auth store as part of User object
- Checked in Layout for navigation visibility
- Checked in AdminRoute for page protection

This architecture provides clear separation between public and protected content, with additional admin-level protection for sensitive user management features.

