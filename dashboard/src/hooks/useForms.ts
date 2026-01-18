import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type FormWithCounts, type FormSettings } from "@/lib/api";

export function useForms() {
  return useQuery({
    queryKey: ["forms"],
    queryFn: async () => {
      const response = await api.getForms();
      return response.data;
    },
  });
}

export function useForm(formId: string) {
  return useQuery({
    queryKey: ["forms", formId],
    queryFn: async () => {
      const response = await api.getForm(formId);
      return response.data;
    },
    enabled: !!formId,
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const response = await api.createForm(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useUpdateForm(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name?: string; settings?: Partial<FormSettings> }) => {
      const response = await api.updateForm(formId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      queryClient.invalidateQueries({ queryKey: ["forms", formId] });
    },
  });
}

export type { FormWithCounts, FormSettings };
