import type { AnalyzedJob, DashboardStats, JobStatus, UserProfile } from "@/types";
import { createClient } from "@/lib/supabase/client";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(path, {
    ...init,
    headers: {
      ...authHeaders,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

export async function fetchJobs(): Promise<AnalyzedJob[]> {
  return request<AnalyzedJob[]>("/api/jobs");
}

export async function fetchStats(): Promise<DashboardStats> {
  return request<DashboardStats>("/api/stats");
}

export async function updateJobStatus(
  id: string,
  status: JobStatus
): Promise<AnalyzedJob> {
  return request<AnalyzedJob>(`/api/jobs/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function fetchProfile(): Promise<UserProfile> {
  return request<UserProfile>("/api/profile");
}

export async function updateProfile(
  profile: Pick<
    UserProfile,
    "tech_stack" | "stop_words" | "bio" | "selected_platform"
  >
): Promise<UserProfile> {
  return request<UserProfile>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}
