/**
 * Role-Based Access Control Middleware
 * 
 * Roles:
 * - Admin: vidiman (full access - read, write, delete)
 * - User: all other authenticated users (read-only)
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
 * Role-based readonly middleware
 * Allows all operations for admin, blocks write operations for regular users
 */
export async function roleBasedMiddleware(c: AppContext, next: () => Promise<void>) {
  // Check if this is a write operation (POST, PUT, DELETE)
  const method = c.req.method.toUpperCase();
  const isWriteOperation = ['POST', 'PUT', 'DELETE'].includes(method);
  
  // If it's a read operation (GET, HEAD), allow for all users
  if (!isWriteOperation) {
    await next();
    return;
  }
  
  // For write operations, check if user is admin
  if (!isAdminUser(c)) {
    return c.json(
      { 
        success: false, 
        error: 'Permission denied. Only admin users can modify or delete files.' 
      }, 
      403
    );
  }
  
  // User is admin, allow the operation
  await next();
}
