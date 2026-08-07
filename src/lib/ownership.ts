/**
 * Who is allowed to see the parts of a profile that are not public.
 *
 * A leaf on purpose. profiles.ts imports the Supabase client, and a rule that decides what
 * a stranger may see is worth testing without a database in the room. Same arrangement as
 * thread.ts under comments.ts: the rule lives out here, the module that reads rows
 * re-exports it, and callers see one import.
 */

/**
 * Whether a viewer is looking at their own profile.
 *
 * A profile shows its published stories to everybody. Anything still waiting on a look,
 * held, or turned down is the owner's business alone, and this predicate is the whole rule
 * that keeps it that way.
 *
 * Compared on id rather than handle. A handle is a label somebody can change, and once
 * freed somebody else can take it. An id is who they are.
 *
 * Both arguments have to be present. Neither should ever be missing, which is exactly why
 * this has to survive one of them being missing: a bare equality check would make a viewer
 * with no id the owner of a profile with no id, since undefined equals undefined.
 */
export function ownsProfile(
  viewerId: string | null | undefined,
  profileId: string | null | undefined
): boolean {
  if (!viewerId || !profileId) return false;
  return viewerId === profileId;
}
