import { PortsApi } from '../api';
import { Port } from '../types/logistics';
import { useAsync } from './useAsync';

export function usePorts() {
  const state = useAsync<Port[]>(() => PortsApi.list(), []);
  return { ...state, ports: state.data || [] };
}
