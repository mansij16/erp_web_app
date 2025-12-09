const DEFAULT_CHAR_PIXEL_WIDTH = 8.5;
const CELL_HORIZONTAL_PADDING = 32;
const MIN_COLUMN_WIDTH = 80;
const OBJECT_PRIORITY_KEYS = [
  "label",
  "name",
  "title",
  "code",
  "number",
  "value",
  "status",
  "description",
];
const ARRAY_AGG_KEYS = [
  "qtyAccepted",
  "qtyReceived",
  "qtyRejected",
  "qty",
  "qtyRolls",
  "qtyRoll",
  "qtyRollsAccepted",
  "quantity",
  "amount",
  "total",
  "balance",
  "value",
];

function formatObjectValue(value) {
  if (!value) return "";

  for (const key of OBJECT_PRIORITY_KEYS) {
    if (value[key] !== undefined && value[key] !== null) {
      return String(value[key]);
    }
  }

  const primitiveValues = Object.values(value).filter(
    (val) => typeof val === "string" || typeof val === "number"
  );

  if (primitiveValues.length > 0) {
    return primitiveValues.slice(0, 2).join(" ");
  }

  return "";
}

function formatArrayValue(values) {
  if (!values.length) return "";

  if (values.every((item) => typeof item === "string" || typeof item === "number")) {
    return values.join(", ");
  }

  const aggregateKey = ARRAY_AGG_KEYS.find((key) =>
    values.some((item) => typeof item?.[key] === "number")
  );

  if (aggregateKey) {
    const total = values.reduce(
      (sum, item) => sum + (Number(item?.[aggregateKey]) || 0),
      0
    );

    const suffix =
      aggregateKey.toLowerCase().includes("roll") ? " rolls" : "";

    return `${total}${suffix}`;
  }

  const flattened = values
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item);
      if (Array.isArray(item)) return formatArrayValue(item);
      if (typeof item === "object") return formatObjectValue(item);
      return "";
    })
    .filter(Boolean);

  return flattened.length ? flattened.join(", ") : `${values.length} items`;
}

function normalizeToString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return formatArrayValue(value);
  if (typeof value === "object") return formatObjectValue(value);
  return "";
}

const extractTextFromChildren = (children) => {
  if (children === null || children === undefined) return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).filter(Boolean).join(" ");
  }
  if (typeof children === "object" && children.props) {
    if (children.props.label !== undefined) {
      return String(children.props.label);
    }
    return extractTextFromChildren(children.props.children);
  }
  return "";
};

const extractRenderedCellText = (rendered) => {
  if (rendered === null || rendered === undefined) return "";
  if (typeof rendered === "string" || typeof rendered === "number") {
    return String(rendered);
  }
  if (Array.isArray(rendered)) {
    return rendered.map(extractRenderedCellText).filter(Boolean).join(" ");
  }
  if (typeof rendered === "object" && rendered.props) {
    if (rendered.props.label !== undefined) {
      return String(rendered.props.label);
    }
    return extractTextFromChildren(rendered.props.children);
  }
  return "";
};

const buildBaseParams = (row, column, rowIndex) => {
  const fallbackId =
    row?._id || row?.id || `${column.field || "col"}-${rowIndex}`;

  return {
    id: fallbackId,
    row,
    field: column.field,
    value: column.field ? row?.[column.field] : undefined,
    formattedValue: column.field ? row?.[column.field] : undefined,
  };
};

const getCellDisplayValue = (column, row, rowIndex) => {
  const params = buildBaseParams(row, column, rowIndex);

  if (typeof column.autoWidthValueGetter === "function") {
    try {
      const customValue = column.autoWidthValueGetter(params);
      const normalized = normalizeToString(customValue);
      if (normalized) {
        return normalized;
      }
    } catch (error) {
      // ignore and fallback
    }
  }

  let derivedValue = params.value;

  if (typeof column.valueGetter === "function") {
    try {
      derivedValue = column.valueGetter(params);
    } catch (error) {
      // ignore and fallback to base value
    }
  }

  if (typeof column.valueFormatter === "function") {
    try {
      const formatted = column.valueFormatter({ ...params, value: derivedValue });
      const normalized = normalizeToString(formatted);
      if (normalized) {
        return normalized;
      }
    } catch (error) {
      // ignore formatter errors
    }
  }

  if (typeof column.renderCell === "function") {
    try {
      const rendered = column.renderCell({ ...params, value: derivedValue });
      const renderedText = extractRenderedCellText(rendered);
      if (renderedText) {
        return renderedText;
      }
    } catch (error) {
      // ignore renderCell errors
    }
  }

  return normalizeToString(derivedValue);
};

/**
 * Calculates dynamic column width based on rendered content
 * @param {Object} column - Column definition
 * @param {Array} rows - Table rows
 * @returns {number} Width value in pixels
 */
export const getDynamicColumnWidth = (column, rows = []) => {
  const headerText = column?.headerName || column?.field || "";
  let maxCharLength = Math.max(headerText.length, 1);

  rows.forEach((row, index) => {
    const cellText = getCellDisplayValue(column, row, index);
    maxCharLength = Math.max(maxCharLength, cellText.length);
  });

  const computedWidth =
    Math.ceil(maxCharLength * DEFAULT_CHAR_PIXEL_WIDTH + CELL_HORIZONTAL_PADDING);
  const minWidth = column?.minWidth
    ? Math.max(column.minWidth, MIN_COLUMN_WIDTH)
    : MIN_COLUMN_WIDTH;

  return Math.max(computedWidth, minWidth);
};

/**
 * Processes column definitions to assign widths matching the longest content
 * @param {Array} columns - Column definitions
 * @param {Array} rows - Data rows
 * @returns {Array} Columns with calculated widths
 */
export const processColumnsWithDynamicWidths = (columns = [], rows = []) => {
  return columns.map((col) => {
    if (!col || col.disableDynamicWidth) {
      return col;
    }

    const width = getDynamicColumnWidth(col, rows);

    return {
      ...col,
      width,
      minWidth: width,
      flex: 0,
    };
  });
};

