import { useEffect, useRef, useCallback } from 'react';
import { Task } from '../types';

// Aggressive alarm sound using Web Audio API (no external file needed)
function createAlarmOscillator(audioCtx: AudioContext) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
  gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  return { oscillator, gainNode };
}

export function useAlarmSystem(tasks: Task[], onForceComplete?: (taskId: string) => void) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAlarmsRef = useRef<Map<string, { intervalId: number; osc: OscillatorNode }>>(new Map());
  const lastNotifiedRef = useRef<Map<string, number>>(new Map());

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playAlarmBurst = useCallback(() => {
    try {
      const ctx = ensureAudioContext();
      const { oscillator, gainNode } = createAlarmOscillator(ctx);
      
      // Two-tone alarm
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }, [ensureAudioContext]);

  const showNotification = useCallback((task: Task) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const n = new Notification(`⚠ TASK ALARM: ${task.title}`, {
        body: `[${task.category.toUpperCase()}] Reminder every ${task.reminder_interval_minutes} min — COMPLETE THIS NOW`,
        icon: '/vite.svg',
        tag: `task-${task.id}`, // replace previous
        requireInteraction: true, // stays until user interacts
        silent: false,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const startAlarmForTask = useCallback((task: Task) => {
    if (activeAlarmsRef.current.has(task.id)) return;

    // Immediate first hit
    playAlarmBurst();
    showNotification(task);

    const intervalMs = Math.max(task.reminder_interval_minutes * 60 * 1000, 15000); // min 15s for safety

    const intervalId = window.setInterval(() => {
      playAlarmBurst();
      showNotification(task);
      // Also try to focus / flash title
      document.title = `⚠ ALARM — ${task.title}`;
      setTimeout(() => {
        document.title = 'NEON // TASK TRACKER';
      }, 3000);
    }, intervalMs);

    activeAlarmsRef.current.set(task.id, { intervalId, osc: null as any });
    lastNotifiedRef.current.set(task.id, Date.now());
  }, [playAlarmBurst, showNotification]);

  const stopAlarmForTask = useCallback((taskId: string) => {
    const entry = activeAlarmsRef.current.get(taskId);
    if (entry) {
      clearInterval(entry.intervalId);
      activeAlarmsRef.current.delete(taskId);
      lastNotifiedRef.current.delete(taskId);
    }
  }, []);

  // Main watcher
  useEffect(() => {
    const pending = tasks.filter(t => t.status === 'pending');

    // Start alarms for pending tasks
    pending.forEach(task => {
      if (!activeAlarmsRef.current.has(task.id)) {
        startAlarmForTask(task);
      }
    });

    // Stop alarms for completed ones
    const pendingIds = new Set(pending.map(t => t.id));
    activeAlarmsRef.current.forEach((_, id) => {
      if (!pendingIds.has(id)) {
        stopAlarmForTask(id);
      }
    });

    return () => {
      // Cleanup on unmount
      activeAlarmsRef.current.forEach((entry) => clearInterval(entry.intervalId));
      activeAlarmsRef.current.clear();
    };
  }, [tasks, startAlarmForTask, stopAlarmForTask]);

  // Request notification permission on first interaction
  useEffect(() => {
    const request = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      ensureAudioContext();
      document.removeEventListener('click', request);
    };
    document.addEventListener('click', request);
    return () => document.removeEventListener('click', request);
  }, [ensureAudioContext]);

  return {
    activeAlarmCount: activeAlarmsRef.current.size,
    forceStopAll: () => {
      activeAlarmsRef.current.forEach((_, id) => stopAlarmForTask(id));
    }
  };
}
