import React from "react";
import { DataGrid, GridToolbar, GridActionsCellItem } from "@mui/x-data-grid";
import {
  Box,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";

const DataTable = ({
  title,
  columns,
  rows,
  loading = false,
  pageSize = 20,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onSearch,
  searchPlaceholder = "Search...",
  showActions = true,
  customActions = [],
  hideAddButton = false,
}) => {
  const [searchText, setSearchText] = React.useState("");
  const [paginationModel, setPaginationModel] = React.useState({
    page: 0,
    pageSize: pageSize,
  });

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchText(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const actionColumns = showActions
    ? [
        {
          field: "actions",
          type: "actions",
          headerName: "Actions",
          width: 100,
          getActions: (params) => {
            const actions = [];

            if (onView) {
              actions.push(
                <GridActionsCellItem
                  icon={<ViewIcon />}
                  label="View"
                  onClick={() => onView(params.row)}
                />
              );
            }

            if (onEdit) {
              actions.push(
                <GridActionsCellItem
                  icon={<EditIcon />}
                  label="Edit"
                  onClick={() => onEdit(params.row)}
                />
              );
            }

            if (onDelete) {
              actions.push(
                <GridActionsCellItem
                  icon={<DeleteIcon />}
                  label="Delete"
                  onClick={() => onDelete(params.row)}
                />
              );
            }

            if (customActions.length > 0) {
              customActions.forEach((action) => {
                actions.push(
                  <GridActionsCellItem
                    icon={action.icon}
                    label={action.label}
                    onClick={() => action.onClick(params.row)}
                  />
                );
              });
            }

            return actions;
          },
        },
      ]
    : [];

  return (
    <Paper sx={{ width: "100%", p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>
        {!hideAddButton && onAdd && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
            Add New
          </Button>
        )}
      </Stack>

      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={[...columns, ...actionColumns]}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50, 100]}
          disableRowSelectionOnClick
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: false,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          getRowId={(row) => row._id || row.id}
        />
      </Box>
    </Paper>
  );
};

export default DataTable;
