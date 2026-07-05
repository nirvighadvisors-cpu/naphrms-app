import apiClient from '@/lib/api-client';

export interface SystemSetting {
  key: string;
  value: string;
  type: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'JSON';
  description: string | null;
  isPublic: boolean;
}

export type UpsertSettingInput = {
  key: string;
  value: string;
  type?: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'JSON';
  description?: string;
  isPublic?: boolean;
};

export const settingsApi = {
  getAll: () => 
    apiClient.get<{ data: SystemSetting[] }>('/settings').then(res => res.data.data),
    
  upsert: (settings: UpsertSettingInput[]) => 
    apiClient.post<{ message: string }>('/settings', { settings }).then(res => res.data),
};
