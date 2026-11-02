import { api } from "./client";
import type { Resume, ResumeScore } from "./types";

// A file picked with expo-document-picker. React Native's FormData takes this
// {uri, name, type} shape in place of a browser File.
export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

export const resumesApi = {
  list: () => api.get<Resume[]>("/resumes"),
  upload: (file: PickedFile) => {
    const form = new FormData();
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as unknown as Blob);
    return api.postForm<Resume>("/resumes", form);
  },
  setMain: (id: string) => api.patch<Resume>(`/resumes/${id}`, { is_main: true }),
  remove: (id: string) => api.delete<void>(`/resumes/${id}`),
  // Fit score of the main resume against one job; 404 until generated.
  getScore: (jobPostingId: string) => api.get<ResumeScore>("/resumes/main/score", { job_posting_id: jobPostingId }),
  generateScore: (jobPostingId: string) =>
    api.post<ResumeScore>("/resumes/main/score", undefined, { job_posting_id: jobPostingId }),
};
