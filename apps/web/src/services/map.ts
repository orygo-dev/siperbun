import { api, type ApiResponse } from '../lib/api';
import type { MapMarker } from './dashboard';

export const mapApi = {
  markers: () => api.get<ApiResponse<MapMarker[]>>('/map/markers'),
};
