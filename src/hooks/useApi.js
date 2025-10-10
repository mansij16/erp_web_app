import { useState, useEffect, useCallback } from "react";
import { useApp } from "../contexts/AppContext";

const useApi = (apiFunc, immediateCall = false) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showNotification } = useApp();

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunc(...args);
        setData(result.data || result);
        return result;
      } catch (err) {
        setError(err);
        showNotification(err.message || "An error occurred", "error");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, showNotification]
  );

  useEffect(() => {
    if (immediateCall) {
      execute();
    }
  }, []);

  return { data, loading, error, execute };
};

export default useApi;
