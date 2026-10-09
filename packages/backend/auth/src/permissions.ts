import { ROLE_LEVELS, type Role } from './roles'

/**
 * Every permission is a named function, and a role comparison never appears anywhere else. A
 * check spelled out at a call site is a check that gets copied slightly wrong somewhere, and the
 * copy is what turns into a security bug.
 *
 * These are pure, which is what lets the server enforce them and the interface consult the same
 * functions to decide what to show, with no chance of the two disagreeing.
 */

export function canViewNotes(role: Role): boolean {
  // A guest is a caller with no account, and reading in this project needs one. A project whose
  // content is public moves this line to the guest level; the check stays in one place either way.
  return ROLE_LEVELS[role] >= ROLE_LEVELS.member
}

export function canCreateNote(role: Role): boolean {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.member
}

export function canPublishNote(role: Role): boolean {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.editor
}

export function canDeleteAnyNote(role: Role): boolean {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.admin
}

export function canChangeRole(actor: Role, target: Role): boolean {
  // Strictly greater, so nobody can grant their own level and quietly create a peer.
  return ROLE_LEVELS[actor] > ROLE_LEVELS[target]
}

/**
 * What one person may do to one note. Ownership answers what the role alone cannot: a draft is
 * private to its author, a published note is visible to every role that can view notes, and nobody
 * acts on a note they cannot see.
 */
export interface NotePermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canPublish: boolean
}

export interface NoteOwnership {
  authorId: string
  isPublished: boolean
}

export function notePermissionsFor(
  role: Role,
  note: NoteOwnership,
  viewerId: string
): NotePermissions {
  const isAuthor = note.authorId === viewerId
  const canView = canViewNotes(role) && (note.isPublished || isAuthor)
  return {
    canView,
    canEdit: canView && (isAuthor || canDeleteAnyNote(role)),
    canDelete: canView && (isAuthor || canDeleteAnyNote(role)),
    canPublish: canView && ((isAuthor && canPublishNote(role)) || canDeleteAnyNote(role)),
  }
}
