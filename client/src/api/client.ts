import axios from 'axios';
import { useGameStore } from '../store/gameStore';
import type {
  CreateRoomResponse,
  GetRoomResponse,
  JoinRoomResponse,
  StartGameResponse,
  GameState,
  RoomConfig,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// Inject auth headers from store on every request
api.interceptors.request.use((config) => {
  const { hostId, playerId } = useGameStore.getState();
  if (hostId) {
    config.headers['x-host-id'] = hostId;
  } else if (playerId) {
    config.headers['x-player-id'] = playerId;
  }
  return config;
});

// ── Room endpoints ────────────────────────────────────────────────────────────

export async function createRoom(): Promise<CreateRoomResponse> {
  const { data } = await api.post<CreateRoomResponse>('/api/rooms');
  return data;
}

export async function getRoom(code: string): Promise<GetRoomResponse> {
  const { data } = await api.get<GetRoomResponse>(`/api/rooms/${code}`);
  return data;
}

export async function joinRoom(
  code: string,
  name: string
): Promise<JoinRoomResponse> {
  const { data } = await api.post<JoinRoomResponse>(`/api/rooms/${code}/join`, {
    name,
  });
  return data;
}

// ── Game endpoints ────────────────────────────────────────────────────────────

export async function startGame(code: string): Promise<StartGameResponse> {
  const { data } = await api.post<StartGameResponse>(`/api/game/${code}/start`);
  return data;
}

export async function nextQuestion(code: string): Promise<void> {
  await api.post(`/api/game/${code}/next`);
}

export async function revealAnswer(code: string): Promise<void> {
  await api.post(`/api/game/${code}/reveal`);
}

export async function getGameState(
  code: string,
  hostId?: string,
  playerId?: string
): Promise<GameState> {
  const headers: Record<string, string> = {};
  if (hostId) headers['x-host-id'] = hostId;
  else if (playerId) headers['x-player-id'] = playerId;

  const { data } = await api.get<GameState>(`/api/game/${code}/state`, {
    headers,
  });
  return data;
}

export async function submitAnswer(
  code: string,
  answer: 'A' | 'B' | 'C' | 'D'
): Promise<void> {
  await api.post(`/api/game/${code}/answer`, { answer });
}

export async function updateRoomConfig(
  _code: string,
  _config: Partial<RoomConfig>
): Promise<void> {
  // Config is passed at start time; this is a no-op placeholder
  // that screens can call before startGame if the API supports it
}

export { api };
