/**
 * Role-Based Access Control Middleware
 * 
 * Permissions:
 * - Admin (vidiman): Full access - upload, delete, move
 * - All users: Can upload and view - cannot delete or move
 */

import type { AppContext } from "../../types";

/**
 * Check if user is admin (vidiman)
 */
export function isAdminUser(context: AppContext): boolean {
  const userEmail = context.req.header('X-User-Email') || '';
  const userName = context.req.header('X-User-Name') || '';
  
  // Check if user is vidiman (case insensitive)
  const isVidiman = 
    userName.toLowerCase() === 'vidiman' || 
    userEmail.toLowerCase().includes('vidiman');
  
  return isVidiman;
}

/**
 * Role-based access control middleware
 * - All users: Can upload, view, download
 * - Admin only: Can delete and move files
 */
export async function roleBasedMiddleware(c: AppContext, next: () => Promise<void>) {
  const path = c.req.path;
  
  // Check if this is a delete or move operation
  const isDeleteOperation = path.includes('/delete');
  const isMoveOperation = path.includes('/move');
  
  // If it's delete or move, check if user is admin
  if (isDeleteOperation || isMoveOperation) {
    if (!isAdminUser(c)) {
      return c.json(
        { 
          success: false, 
          error: 'Permission denied. Only admin users can delete or move files.' 
        }, 
        403
      );
    }
  }
  
  // All other operations (upload, view, download) are allowed for all authenticated users
  await next();
}
