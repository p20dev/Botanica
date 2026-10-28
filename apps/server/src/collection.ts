import type { Pool } from "pg";
import { z } from "zod";
import { velvetleaf, type Locus } from "@botanica/genetics";
import type { PlantListQuery, CollectionStats } from "@botanica/shared";
import type { PlantRow } from "./plants.js";
import { ApiError } from "./errors.js";
const cursorSchema = z.strictObject({
  id: z.uuid(),
  sort: z.enum(["newest", "oldest", "name", "rarity"]),
  value: z.union([z.string().max(100), z.number().int().min(0).max(100)]),
  filterKey: z.string().max(500),
});
export async function listCollection(
  pool: Pool,
  ownerId: string,
  query: PlantListQuery,
) {
  const values: unknown[] = [ownerId],
    bind = (value: unknown) => {
      values.push(value);
      return "$" + values.length;
    };
  const trait = (locus: Locus) => {
    const definition = velvetleaf.loci[locus];
    return (
      "CASE " +
      definition.dominance
        .map(
          (allele) =>
            "WHEN (genome -> " +
            bind(locus) +
            "::text) ? " +
            bind(allele) +
            "::text" +
            " THEN " +
            bind((definition.labels as Record<string, string>)[allele]),
        )
        .join(" ") +
      " END"
    );
  };
  const cte =
    "WITH collection AS (SELECT p.*, " +
    trait("pigment") +
    " AS resolved_pigment, " +
    trait("leafPattern") +
    " AS resolved_pattern FROM plants p WHERE owner_id=$1) ";
  const conditions: string[] = [];
  for (const [column, value] of [
    ["species_id", query.species],
    ["rarity_tier", query.rarity],
    ["resolved_pigment", query.pigment],
    ["resolved_pattern", query.pattern],
  ] as const)
    if (value) conditions.push(column + " = " + bind(value));
  if (query.q)
    conditions.push(
      "(name || ' ' || id::text || ' ' || resolved_pigment || ' ' || resolved_pattern) ILIKE " +
        bind("%" + query.q.replace(/[\\%_]/g, "\\$&") + "%"),
    );
  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
  const count = await pool.query(
    cte + "SELECT count(*) AS count FROM collection" + where,
    values,
  );
  const filterKey = JSON.stringify([
    query.species ?? "",
    query.rarity ?? "",
    query.pigment ?? "",
    query.pattern ?? "",
    query.q ?? "",
  ]);
  const order = {
    newest: { column: "created_at", direction: "DESC", cast: "timestamptz" },
    oldest: { column: "created_at", direction: "ASC", cast: "timestamptz" },
    name: { column: "lower(name)", direction: "ASC", cast: "text" },
    rarity: { column: "rarity_score", direction: "DESC", cast: "integer" },
  }[query.sort];
  let after = "";
  if (query.cursor) {
    let cursor: z.infer<typeof cursorSchema>;
    try {
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8")),
      );
    } catch {
      throw new ApiError(400, "INVALID_CURSOR", "The page cursor is invalid.");
    }
    if (cursor.sort !== query.sort || cursor.filterKey !== filterKey)
      throw new ApiError(
        400,
        "INVALID_CURSOR",
        "Reset pagination after changing filters or sort order.",
      );
    if (
      order.cast === "timestamptz" &&
      !z.iso.datetime({ offset: true }).safeParse(cursor.value).success
    )
      throw new ApiError(400, "INVALID_CURSOR", "Invalid timestamp cursor.");
    if (order.cast === "integer" && typeof cursor.value !== "number")
      throw new ApiError(400, "INVALID_CURSOR", "Invalid rarity cursor.");
    after =
      (where ? " AND " : " WHERE ") +
      "(" +
      order.column +
      ",id) " +
      (order.direction === "DESC" ? "<" : ">") +
      " (" +
      bind(cursor.value) +
      "::" +
      order.cast +
      "," +
      bind(cursor.id) +
      "::uuid)";
  }
  const rows = (
    await pool.query<PlantRow>(
      cte +
        `SELECT *, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time, lower(name) AS sort_name FROM collection` +
        where +
        after +
        " ORDER BY " +
        order.column +
        " " +
        order.direction +
        ",id " +
        order.direction +
        " LIMIT " +
        bind(query.limit + 1),
      values,
    )
  ).rows;
  const items = rows.slice(0, query.limit),
    last = items.at(-1);
  const nextCursor =
    rows.length > query.limit && last
      ? Buffer.from(
          JSON.stringify({
            id: last.id,
            sort: query.sort,
            filterKey,
            value:
              query.sort === "rarity"
                ? last.rarity_score
                : query.sort === "name"
                  ? last.sort_name
                  : last.cursor_time,
          }),
        ).toString("base64url")
      : null;
  return { rows: items, total: Number(count.rows[0].count), nextCursor };
}
export async function collectionStats(
  pool: Pool,
  ownerId: string,
): Promise<CollectionStats> {
  const rows = (
    await pool.query<{
      rarity_tier: NonNullable<keyof CollectionStats["byRarity"]>;
      count: string;
    }>(
      "SELECT rarity_tier,count(*) FROM plants WHERE owner_id=$1 GROUP BY rarity_tier",
      [ownerId],
    )
  ).rows;
  return {
    total: rows.reduce((sum, row) => sum + Number(row.count), 0),
    byRarity: Object.fromEntries(
      rows.map((row) => [row.rarity_tier, Number(row.count)]),
    ),
  };
}
