import { useState, useCallback, useRef } from 'react';
import { generateTestCases } from '../api/generateTestCases';

/**
 * Custom hook managing test-case generation state.
 *
 * Returns: { loading, error, results, generate, retry }
 */
export function useTestCaseGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // Keep the last request so retry works without re-typing
  const lastRequestRef = useRef(null);

  const generate = useCallback(async ({ userStory, categories, llmConfig }) => {
    const request = { userStory, categories, llmConfig };
    lastRequestRef.current = request;

    setLoading(true);
    setError(null);

    try {
      const data = await generateTestCases(request);
      if (data.success) {
        setResults(data);
        setError(null);
      } else {
        setError(data.error || 'An unknown error occurred.');
        setResults(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to reach the server.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    if (lastRequestRef.current) {
      generate(lastRequestRef.current);
    }
  }, [generate]);

  return { loading, error, results, generate, retry };
}
