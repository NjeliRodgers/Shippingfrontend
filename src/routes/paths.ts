/** Single source of truth for URL <-> navigation tab ids used by Navbar/Footer/pages. */
export const TAB_PATHS: Record<string, string> = {
  TRACK: '/',
  BOOKING: '/booking',
  MAP: '/map',
  PORTAL: '/portal',
  ADMIN: '/admin',
  ANALYTICS: '/admin/analytics',
  NOTIFICATIONS: '/admin/notifications',
  SECURITY: '/admin/security',
};

export function tabFromPath(pathname: string): string {
  if (pathname.startsWith('/admin/analytics')) return 'ANALYTICS';
  if (pathname.startsWith('/admin/notifications')) return 'NOTIFICATIONS';
  if (pathname.startsWith('/admin/security')) return 'SECURITY';
  if (pathname.startsWith('/admin')) return 'ADMIN';
  if (pathname.startsWith('/booking')) return 'BOOKING';
  if (pathname.startsWith('/map')) return 'MAP';
  if (pathname.startsWith('/portal')) return 'PORTAL';
  return 'TRACK';
}
