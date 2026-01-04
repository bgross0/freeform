import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Submission, type SubmissionParams } from "@/lib/api";

export function useSubmissions(formId: string, params: SubmissionParams = {}) {
  return useQuery({
    queryKey: ["submissions", formId, params],
    queryFn: async () => {
      return api.getSubmissions(formId, params);
    },
    enabled: !!formId,
  });
}

export function useSubmission(formId: string, submissionId: string) {
  return useQuery({
    queryKey: ["submissions", formId, submissionId],
    queryFn: async () => {
      const response = await api.getSubmission(formId, submissionId);
      return response.data;
    },
    enabled: !!formId && !!submissionId,
  });
}

export function useUpdateSubmission(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string; data: { is_read?: boolean } }) => {
      const response = await api.updateSubmission(formId, submissionId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", formId] });
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useDeleteSubmission(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      return api.deleteSubmission(formId, submissionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", formId] });
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useBulkUpdateSubmissions(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, is_read }: { ids: string[]; is_read: boolean }) => {
      return api.bulkUpdateSubmissions(formId, ids, is_read);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", formId] });
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useBulkDeleteSubmissions(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      return api.bulkDeleteSubmissions(formId, ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", formId] });
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export type { Submission, SubmissionParams };
