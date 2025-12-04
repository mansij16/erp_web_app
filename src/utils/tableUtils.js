/**
 * Calculates dynamic column width based on header name and content type
 * @param {string} headerName - The column header name
 * @param {string} field - The field name (optional, for type inference)
 * @param {Array} rows - Array of data rows (optional, for content-based calculation)
 * @param {number} minWidth - Minimum width override (optional)
 * @returns {Object} Column configuration with minWidth and flex properties
 */
export const getDynamicColumnWidth = (headerName, field = "", rows = [], minWidth = null) => {
  // Base width calculation from header name (approximately 8px per character)
  const headerWidth = (headerName?.length || 10) * 8;
  
  // Estimate content width based on field type
  let contentEstimate = 0;
  
  if (field) {
    const fieldLower = field.toLowerCase();
    
    // Estimate based on field name patterns
    if (fieldLower.includes('productcode') || fieldLower.includes('product_code')) {
      contentEstimate = 250; // Product codes can be quite long (e.g., "30 GSMPremiumSublimation")
    } else if (fieldLower.includes('alias')) {
      contentEstimate = 200; // Aliases can be long
    } else if (fieldLower.includes('code') || fieldLower.includes('number')) {
      contentEstimate = 150; // Codes/numbers can vary in length
    } else if (fieldLower.includes('date')) {
      contentEstimate = 120; // Dates are formatted consistently
    } else if (fieldLower.includes('amount') || fieldLower.includes('rate') || fieldLower.includes('price')) {
      contentEstimate = 130; // Currency values
    } else if (fieldLower.includes('phone') || fieldLower.includes('mobile')) {
      contentEstimate = 140; // Phone numbers
    } else if (fieldLower.includes('email')) {
      contentEstimate = 200; // Email addresses
    } else if (fieldLower.includes('status') || fieldLower.includes('active')) {
      contentEstimate = 100; // Status chips
    } else if (fieldLower.includes('name') || fieldLower.includes('customer') || fieldLower.includes('supplier')) {
      contentEstimate = 180; // Names can be longer
    } else if (fieldLower.includes('address')) {
      contentEstimate = 250; // Addresses are long
    } else if (fieldLower.includes('description') || fieldLower.includes('notes')) {
      contentEstimate = 200; // Descriptions
    } else {
      contentEstimate = 120; // Default estimate
    }
  } else {
    contentEstimate = 120; // Default if no field provided
  }
  
  // Calculate actual content width from data if available
  if (rows && rows.length > 0 && field) {
    const maxContentLength = Math.max(
      ...rows.map(row => {
        const value = row[field];
        if (value === null || value === undefined) return 0;
        const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return str.length;
      }),
      headerName.length
    );
    // Use 8-9px per character for better accuracy (accounts for font size and padding)
    contentEstimate = Math.max(contentEstimate, maxContentLength * 8.5, headerName.length * 10);
  }
  
  // Use provided minWidth or calculate from header and content
  const calculatedMinWidth = minWidth || Math.max(headerWidth + 40, contentEstimate, 80);
  
  // Return column config - use flex for most columns, minWidth for fixed-size columns
  return {
    minWidth: Math.ceil(calculatedMinWidth),
    flex: 1, // Allow column to grow/shrink
  };
};

/**
 * Processes column definitions to add dynamic widths
 * @param {Array} columns - Array of column definitions
 * @param {Array} rows - Array of data rows (optional)
 * @returns {Array} Processed columns with dynamic widths
 */
export const processColumnsWithDynamicWidths = (columns, rows = []) => {
  return columns.map(col => {
    // If column already has flex or explicit width settings, preserve them
    if (col.flex !== undefined || col.width !== undefined) {
      // If width is set but no flex, convert to minWidth and add flex
      if (col.width && !col.flex) {
        return {
          ...col,
          minWidth: col.width,
          flex: 1,
          width: undefined, // Remove fixed width
        };
      }
      return col;
    }
    
    // Calculate dynamic width
    const widthConfig = getDynamicColumnWidth(
      col.headerName || col.field,
      col.field,
      rows,
      col.minWidth
    );
    
    return {
      ...col,
      ...widthConfig,
    };
  });
};

