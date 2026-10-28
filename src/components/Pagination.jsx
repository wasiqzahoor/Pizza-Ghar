import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, pages, total, onChange, label = "items" }) {
  if (!total) return null;

  if (pages <= 1) {
    return (
      <div className="text-sm text-gray-500 text-center py-3">
        {total} {label}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-4 flex-wrap">

      <div className="text-sm text-gray-500">
        {total} {label} &middot; Page {page} of {pages}
      </div>

      <div className="flex gap-2">

        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded-xl text-sm flex gap-1 items-center bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          Prev
        </button>

        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded-xl text-sm flex gap-1 items-center bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight size={16} />
        </button>

      </div>

    </div>
  );
}
