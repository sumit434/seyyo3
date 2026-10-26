import { apiClient } from './api';
import { UpdateStaffSettingsPayload, BusinessProfile } from '../../shared/types/business';

export const updateStaffTerminalSettings = async (
  payload: UpdateStaffSettingsPayload
): Promise<{ success: boolean; data?: Partial<BusinessProfile> }> => {
  return apiClient.patch('/api/staff/settings', payload);
};
