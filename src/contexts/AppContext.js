import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import { useSnackbar } from "notistack";

const AppContext = createContext();

const initialState = {
  loading: false,
  error: null,
  notification: null,

  masters: {
    categories: [],
    products: [],
    skus: [],
    suppliers: [],
    customers: [],
    ledgers: [],
  },

  purchase: {
    orders: [],
    grns: [],
    invoices: [],
    currentPO: null,
  },

  sales: {
    orders: [],
    challans: [],
    invoices: [],
    currentSO: null,
  },

  inventory: {
    rolls: [],
    unmappedRolls: [],
    stockSummary: {},
  },

  accounting: {
    vouchers: [],
    payments: [],
    currentVoucher: null,
  },

  filters: {
    dateRange: {
      startDate: null,
      endDate: null,
    },
    status: "",
    search: "",
  },
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_NOTIFICATION":
      return { ...state, notification: action.payload };

    case "SET_CATEGORIES":
      return {
        ...state,
        masters: { ...state.masters, categories: action.payload },
      };

    case "SET_PRODUCTS":
      return {
        ...state,
        masters: { ...state.masters, products: action.payload },
      };

    case "SET_SKUS":
      return {
        ...state,
        masters: { ...state.masters, skus: action.payload },
      };

    case "SET_SUPPLIERS":
      return {
        ...state,
        masters: { ...state.masters, suppliers: action.payload },
      };

    case "SET_CUSTOMERS":
      return {
        ...state,
        masters: { ...state.masters, customers: action.payload },
      };

    case "SET_PURCHASE_ORDERS":
      return {
        ...state,
        purchase: { ...state.purchase, orders: action.payload },
      };

    case "SET_CURRENT_PO":
      return {
        ...state,
        purchase: { ...state.purchase, currentPO: action.payload },
      };

    case "SET_SALES_ORDERS":
      return {
        ...state,
        sales: { ...state.sales, orders: action.payload },
      };

    case "SET_CURRENT_SO":
      return {
        ...state,
        sales: { ...state.sales, currentSO: action.payload },
      };

    case "SET_ROLLS":
      return {
        ...state,
        inventory: { ...state.inventory, rolls: action.payload },
      };

    case "SET_UNMAPPED_ROLLS":
      return {
        ...state,
        inventory: { ...state.inventory, unmappedRolls: action.payload },
      };

    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case "RESET_FILTERS":
      return {
        ...state,
        filters: initialState.filters,
      };

    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { enqueueSnackbar } = useSnackbar();

  const setLoading = useCallback((loading) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const setError = useCallback(
    (error) => {
      dispatch({ type: "SET_ERROR", payload: error });
      if (error) {
        enqueueSnackbar(error.message || "An error occurred", {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar]
  );

  const showNotification = useCallback(
    (message, type = "info") => {
      enqueueSnackbar(message, { variant: type });
    },
    [enqueueSnackbar]
  );

  const value = {
    state,
    dispatch,
    setLoading,
    setError,
    showNotification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
