import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { getGameState } from '../api/client';

const POLL_INTERVAL = 2000;

export function useGameState(roomCode: string | null) {
  const setGameState = useGameStore((s) => s.setGameState);
  const hostId = useGameStore((s) => s.hostId);
  const playerId = useGameStore((s) => s.playerId);
  const gameState = useGameStore((s) => s.gameState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const fetchState = useCallback(async () => {
    if (!roomCode) return;
    try {
      const state = await getGameState(
        roomCode,
        hostId ?? undefined,
        playerId ?? undefined
      );
      if (isMounted.current) {
        setGameState(state);
      }
    } catch (err) {
      // Silently ignore poll errors — will retry next interval
      console.warn('Game state poll failed:', err);
    }
  }, [roomCode, hostId, playerId, setGameState]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!roomCode) return;

    // Stop polling if game finished
    if (gameState?.status === 'finished') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch immediately
    fetchState();

    intervalRef.current = setInterval(fetchState, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomCode, fetchState, gameState?.status]);

  return gameState;
}
