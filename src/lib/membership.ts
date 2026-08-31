"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/auth";
import { api, type MembershipStatus } from "@/lib/api";

export function useMembership() {
  const { user } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<MembershipStatus>(
    user ? ["membership", user.token] : null,
    () => api.getMembershipStatus(),
    { revalidateOnFocus: false, dedupingInterval: 5_000 }
  );

  return {
    membership: data || null,
    loading: !!user && isLoading && !data,
    error: error instanceof Error ? error.message : "",
    refresh: mutate,
  };
}
