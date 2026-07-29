import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Adjust imports
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  PaginationContent,
} from "@/components/ui/pagination"; // Adjust imports

type Column = {
  header: string;
  accessorKey: string;
  cell?: (row: any, index: number) => React.ReactNode;
};

type CustomTableProps = {
  columns: Column[];
  data: any[];
  rowsPerPage?: number;
  emptyMessage?: string;
};

const CustomTable: React.FC<CustomTableProps> = ({
  columns,
  data,
  rowsPerPage = 5,
  emptyMessage = "No records yet.",
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = data.slice(startIndex, startIndex + rowsPerPage);

  useEffect(() => {
    setCurrentPage((previousPage) => {
      if (totalPages === 0) {
        return 1;
      }

      return Math.min(previousPage, totalPages);
    });
  }, [totalPages]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const getVisiblePages = () => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
  <div className="h-full w-full rounded-md border flex flex-col">
    {/* Scrollable table wrapper */}
    <div className="overflow-auto flex-1">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.accessorKey} className="capitalize">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-40 text-center text-slate-400">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            currentData.map((row, rowIndex) => (
              <TableRow key={row._id || row.id || rowIndex}>
                {columns.map((col) => {
                  const cellContent = col.cell
                    ? col.cell(row, rowIndex)
                    : row[col.accessorKey];
                  return (
                    <TableCell key={col.accessorKey}>{cellContent}</TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>

    {/* Pagination pinned below */}
    {totalPages > 1 && <div className="border-t p-2">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              className='cursor-pointer'
              onClick={() => handlePageChange(currentPage - 1)}
            />
          </PaginationItem>
          {currentPage>3 && (
          <PaginationItem key={1}>
            <PaginationLink
              href="#"
              isActive={currentPage === 1}
              onClick={() => handlePageChange(1)}
            >
              {1}
            </PaginationLink>
          </PaginationItem>
          )}

          {currentPage>3 && totalPages > 5 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {getVisiblePages().map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={currentPage === page}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {currentPage < totalPages - 2 && totalPages > 5 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          {currentPage < totalPages - 2 && (
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              isActive={currentPage === totalPages}
              onClick={() => handlePageChange(totalPages)}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              className='cursor-pointer'
              onClick={() => handlePageChange(currentPage + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>}
  </div>

  );
};

export default CustomTable;
