export const commonNavItems = [
  { id: 'profile', label: 'Profile', description: 'Your account details' },
  { id: 'change-password', label: 'Change password', description: 'Update account security' },
]

export const userNavItems = [
  ...commonNavItems,
  { id: 'my-bookings', label: 'My bookings', description: 'Spaces and reservations' },
  { id: 'my-tickets', label: 'My tickets', description: 'Support tickets' },
]

export const adminNavItems = [
  ...commonNavItems,
  { id: 'user-management', label: 'User Management', description: 'Manage user accounts' },
  { id: 'add-resources', label: 'Add resources', description: 'Add new campus facilities' },
  { id: 'manage-resources', label: 'Manage resources', description: 'Manage the facilities catalogue' },
  { id: 'manage-bookings', label: 'Manage bookings', description: 'Review and manage all reservations' },
  { id: 'tickets', label: 'Tickets', description: 'Manage support tickets' },
]
