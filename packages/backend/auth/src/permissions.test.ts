import { describe, expect, it } from 'vitest'
import {
  canChangeRole,
  canCreateNote,
  canDeleteAnyNote,
  canPublishNote,
  canViewNotes,
  notePermissionsFor,
} from './permissions'
import { ROLES } from './roles'

/**
 * Permission logic is security-critical, so it is tested case by case rather than covered
 * incidentally by whatever feature test happened to touch it.
 */
describe('role checks', () => {
  it('lets a member and above read, and refuses a caller with no account', () => {
    expect(canViewNotes('guest')).toBe(false)
    for (const role of ROLES.filter((role) => role !== 'guest')) {
      expect(canViewNotes(role)).toBe(true)
    }
  })

  it('lets a member and above create, and nobody below', () => {
    expect(canCreateNote('guest')).toBe(false)
    expect(canCreateNote('member')).toBe(true)
    expect(canCreateNote('editor')).toBe(true)
    expect(canCreateNote('owner')).toBe(true)
  })

  it('reserves publishing for an editor and above', () => {
    expect(canPublishNote('member')).toBe(false)
    expect(canPublishNote('editor')).toBe(true)
    expect(canPublishNote('admin')).toBe(true)
  })

  it('reserves deleting anyone note for an admin and above', () => {
    expect(canDeleteAnyNote('editor')).toBe(false)
    expect(canDeleteAnyNote('admin')).toBe(true)
    expect(canDeleteAnyNote('owner')).toBe(true)
  })
})

describe('canChangeRole', () => {
  it('lets an owner grant a role below their own', () => {
    expect(canChangeRole('owner', 'admin')).toBe(true)
  })

  it('refuses to let anyone grant their own level, which would create a silent peer', () => {
    expect(canChangeRole('admin', 'admin')).toBe(false)
  })

  it('refuses to let anyone grant a level above their own', () => {
    expect(canChangeRole('admin', 'owner')).toBe(false)
    expect(canChangeRole('member', 'editor')).toBe(false)
  })
})

describe('notePermissionsFor', () => {
  const note = { authorId: 'u_author', isPublished: true }
  const draft = { authorId: 'u_author', isPublished: false }

  it('lets an author edit and delete their own note whatever their role', () => {
    const permissions = notePermissionsFor('member', note, 'u_author')
    expect(permissions.canEdit).toBe(true)
    expect(permissions.canDelete).toBe(true)
  })

  it('does not let a member edit someone else note', () => {
    const permissions = notePermissionsFor('member', note, 'u_other')
    expect(permissions.canEdit).toBe(false)
    expect(permissions.canDelete).toBe(false)
  })

  it('lets an admin act on a note they did not write', () => {
    const permissions = notePermissionsFor('admin', note, 'u_other')
    expect(permissions.canEdit).toBe(true)
    expect(permissions.canDelete).toBe(true)
    expect(permissions.canPublish).toBe(true)
  })

  it('does not let an author publish without the role for it', () => {
    expect(notePermissionsFor('member', note, 'u_author').canPublish).toBe(false)
    expect(notePermissionsFor('editor', note, 'u_author').canPublish).toBe(true)
  })

  it('keeps a draft private to its author, even from an admin', () => {
    expect(notePermissionsFor('editor', draft, 'u_author').canView).toBe(true)
    expect(notePermissionsFor('member', draft, 'u_other').canView).toBe(false)
    expect(notePermissionsFor('admin', draft, 'u_other')).toEqual({
      canView: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
    })
  })

  it('shows a published note to every role that can view notes', () => {
    expect(notePermissionsFor('member', note, 'u_other').canView).toBe(true)
    expect(notePermissionsFor('guest', note, 'u_other').canView).toBe(false)
  })

  it('gives a caller with no account nothing at all', () => {
    expect(notePermissionsFor('guest', note, 'u_other')).toEqual({
      canView: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
    })
  })
})
