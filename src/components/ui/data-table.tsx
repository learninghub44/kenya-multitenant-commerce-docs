"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";
import styles from "./ui.module.css";

export type Column<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** Plain text used by the search box. Omit to exclude the column from search. */
  searchText?: (row: Row) => string;
};

/**
 * Client-side search + pagination over rows that the server already loaded
 * (so tenant scoping and permissions are enforced before rows get here).
 * Do not use for very large datasets; paginate on the server instead.
 */
export function DataTable<Row>({ columns, rows, rowKey, pageSize = 10, searchLabel = "Search", emptyMessage = "Nothing to show yet." }: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  pageSize?: number;
  searchLabel?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => columns.some((c) => c.searchText?.(row).toLowerCase().includes(q)));
  }, [rows, columns, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const searchable = columns.some((c) => c.searchText);

  return <div>
    {searchable ? <div className={styles.tableTools}>
      <input className={styles.search} type="search" value={query} aria-label={searchLabel} placeholder={searchLabel}
        onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
    </div> : null}
    {visible.length === 0 ? <p className={styles.alert} role="status">{query ? "No results match your search." : emptyMessage}</p> :
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr></thead>
        <tbody>{visible.map((row) => <tr key={rowKey(row)}>{columns.map((c) => <td key={c.key}>{c.render(row)}</td>)}</tr>)}</tbody>
      </table></div>}
    {filtered.length > pageSize ? <div className={styles.pager}>
      <span aria-live="polite">Page {current + 1} of {pageCount} · {filtered.length} rows</span>
      <div className={styles.pagerButtons}>
        <Button small disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button>
        <Button small disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>Next</Button>
      </div>
    </div> : null}
  </div>;
}
