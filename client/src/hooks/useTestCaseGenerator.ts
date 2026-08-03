import { useState, useCallback, useRef } from 'react';
import type { GenerateSuccessResponse, TestCaseCategory, LLMConfig } from '@shared/types';
import { generateTestCases } from '../api/generateTestCases';

interface GenerateParams {
  userStory: string;
  categories: TestCaseCategory[];
  llmConfig: LLMConfig;
}

interface UseTestCaseGeneratorReturn {
  loading: boolean;
  error: string | null;
  results: GenerateSuccessResponse | null;
  generate: (params: GenerateParams) => Promise<void>;
  retry: () => void;
}

/**
 * Custom hook managing test-case generation state.
 */
export function useTestCaseGenerator(): UseTestCaseGeneratorReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GenerateSuccessResponse | null>(null);

  // Keep the last request so retry works without re-typing
  const lastRequestRef = useRef<GenerateParams | null>(null);

  const generate = useCallback(async ({ userStory, categories, llmConfig }: GenerateParams): Promise<void> => {
    const request: GenerateParams = { userStory, categories, llmConfig };
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
      setError((err as Error).message || 'Failed to reach the server.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback((): void => {
    if (lastRequestRef.current) {
      generate(lastRequestRef.current);
    }
  }, [generate]);

  return { loading, error, results, generate, retry };
}
