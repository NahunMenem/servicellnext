import Link from "next/link";

type PaginationControlsProps = {
  page: number;
  hasNext: boolean;
  buildHref: (page: number) => string;
};

export function PaginationControls({
  page,
  hasNext,
  buildHref
}: PaginationControlsProps) {
  return (
    <div className="pagination-bar">
      <Link
        aria-disabled={page <= 1}
        className={`button secondary ${page <= 1 ? "is-disabled" : ""}`}
        href={page > 1 ? buildHref(page - 1) : "#"}
      >
        Anterior
      </Link>
      <span className="pill">Pagina {page}</span>
      <Link
        aria-disabled={!hasNext}
        className={`button secondary ${!hasNext ? "is-disabled" : ""}`}
        href={hasNext ? buildHref(page + 1) : "#"}
      >
        Siguiente
      </Link>
    </div>
  );
}
