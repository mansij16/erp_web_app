import { useState, useCallback } from "react";

const usePagination = (initialPageSize = 20) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setPage(0);
  }, []);

  const resetPagination = useCallback(() => {
    setPage(0);
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  return {
    page,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,
  };
};

export default usePagination;
