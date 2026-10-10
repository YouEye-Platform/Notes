import { getMany, getOne } from "@/lib/db/client";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Note relationships stay inside the validated session user's namespace. */
export async function validatePrivateNoteReferences(
  userId: string,
  body: Record<string, unknown>,
): Promise<400 | 404 | null> {
  if (body.folder_id !== undefined && body.folder_id !== null && body.folder_id !== "") {
    if (typeof body.folder_id !== "string" || !uuid.test(body.folder_id)) return 400;
    if (!await getOne("SELECT id FROM folders WHERE id = $1 AND user_id = $2", [body.folder_id, userId])) return 404;
  }
  if (body.tag_ids !== undefined) {
    if (!Array.isArray(body.tag_ids) || body.tag_ids.length > 100
      || body.tag_ids.some(id => typeof id !== "string" || !uuid.test(id))) return 400;
    const ids = [...new Set(body.tag_ids as string[])];
    if (ids.length) {
      const tags = await getMany("SELECT id FROM tags WHERE user_id = $1 AND id = ANY($2::uuid[])", [userId, ids]);
      if (tags.length !== ids.length) return 404;
    }
  }
  return null;
}
