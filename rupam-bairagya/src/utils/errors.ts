import axios from "axios";

interface ApiErrorBody {
  message?: string;
  error?: string;
}

export function getApiErrorMessage(err: unknown, fallback = "Unexpected error"): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export function getApiErrorStatus(err: unknown): number | undefined {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.status;
  }
  return undefined;
}

export function getApiErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.data?.error;
  }
  return undefined;
}

