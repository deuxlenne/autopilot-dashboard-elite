import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Task, TaskCategory } from '../types';
import { useAlarmSystem } from '../hooks/useAlarmSystem';

const INTERVAL_OPTIONS = [
  { label: 'Every 5 min', value: 5 },
  { label: 'Every 10 min', value: 10 },
  { label: 'Every 15 min', value: 15 },
  { label: 'Every 30 min', value: 30 },
  { label: 'Every 60 min', value: 60 },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('daily');
  const [interval, setInterval] = useState(15);
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'all' | TaskCategory | 'completed'>('all');

  const { activeAlarmCount } = useAlarmSystem(tasks);

  const fetchTasks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data as Task[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: title.trim(),
      category,
      reminder_interval_minutes: interval,
      status: 'pending',
      notes: notes.trim() || null,
    });

    if (!error) {
      setTitle('');
      setNotes('');
      setCategory('daily');
      setInterval(15);
      fetchTasks();
    } else {
      alert('Failed to create task: ' + error.message);
    }
  };

  const completeTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Permanently delete this task?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) fetchTasks();
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'all') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return t.category === filter && t.status === 'pending';
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-orbitron text-xl neon-text-cyan tracking-wider">TASK MATRIX</h2>
          <p className="text-xs text-cyan-600 mt-1">
            {pendingCount} active • {activeAlarmCount} alarms running • NO MUTE ENABLED
          </p>
        </div>
        {activeAlarmCount > 0 && (
          <div className="alarm-pulse px-4 py-2 bg-red-950/60 border border-red-500 text-red-300 text-xs font-bold tracking-widest rounded">
            ⚠ {activeAlarmCount} ACTIVE ALARM{activeAlarmCount > 1 ? 'S' : ''}
          </div>
        )}
      </div>

      {/* Create form */}
      <form onSubmit={addTask} className="card-glow p-5 space-y-4">
        <h3 className="text-sm text-purple-400 tracking-widest uppercase mb-2">New Task Protocol</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-cyan-500 mb-1">TASK TITLE</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded text-sm"
              placeholder="What needs to be done?"
            />
          </div>

          <div>
            <label className="block text-xs text-cyan-500 mb-1">CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="w-full px-3 py-2 rounded text-sm"
            >
              <option value="urgent">URGENT / IMMEDIATE</option>
              <option value="daily">DAILY</option>
              <option value="weekly">WEEKLY</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-cyan-500 mb-1">REMINDER FREQUENCY</label>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full px-3 py-2 rounded text-sm"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-cyan-500 mb-1">NOTES (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded text-sm resize-none"
              placeholder="Extra details..."
            />
          </div>
        </div>

        <button type="submit" className="neon-btn-purple px-6 py-2.5 text-sm">
          INITIATE TASK
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'urgent', 'daily', 'weekly', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs tracking-wider uppercase border transition-all ${
              filter === f
                ? f === 'urgent'
                  ? 'border-red-400 text-red-300 bg-red-500/10'
                  : f === 'completed'
                  ? 'border-green-400 text-green-300 bg-green-500/10'
                  : 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-gray-700 text-gray-500 hover:border-gray-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="text-center py-12 text-cyan-700">LOADING MATRIX...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-cyan-800 text-sm">
          {filter === 'completed' ? 'No completed tasks yet.' : 'No active tasks in this filter.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={`card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                task.category === 'urgent' && task.status === 'pending' ? 'urgent-task' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded tracking-wider uppercase font-bold ${
                      task.category === 'urgent'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : task.category === 'daily'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    }`}
                  >
                    {task.category}
                  </span>
                  {task.status === 'pending' && (
                    <span className="text-[10px] text-yellow-500/80">
                      ⟳ every {task.reminder_interval_minutes}m
                    </span>
                  )}
                  {task.status === 'completed' && (
                    <span className="text-[10px] text-green-400">✓ COMPLETED</span>
                  )}
                </div>
                <h4 className="font-medium text-cyan-50 truncate">{task.title}</h4>
                {task.notes && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.notes}</p>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                {task.status === 'pending' && (
                  <button
                    onClick={() => completeTask(task.id)}
                    className="neon-btn px-4 py-1.5 text-xs"
                  >
                    COMPLETE
                  </button>
                )}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="neon-btn-danger px-3 py-1.5 text-xs"
                >
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
