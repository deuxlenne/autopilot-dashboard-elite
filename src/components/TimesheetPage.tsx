import { useEffect, useState, useMemo } from 'react';
import { format, subDays, isWeekend, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TimeEntry } from '../types';

function calcHours(clockIn: string | null, clockOut: string | null): number {
  if (!clockIn || !clockOut) return 0;
  try {
    const [h1, m1] = clockIn.split(':').map(Number);
    const [h2, m2] = clockOut.split(':').map(Number);
    let mins = h2 * 60 + m2 - (h1 * 60 + m1);
    if (mins < 0) mins += 24 * 60; // overnight
    return Math.round((mins / 60) * 100) / 100;
  } catch {
    return 0;
  }
}

export default function TimesheetPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [form, setForm] = useState({ clock_in: '', clock_out: '', overtime_hours: 0, notes: '' });

  // Rolling 14 days ending today
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 13; i >= 0; i--) {
      result.push(subDays(new Date(), i));
    }
    return result;
  }, []);

  const fetchEntries = async () => {
    if (!user) return;
    const start = format(days[0], 'yyyy-MM-dd');
    const end = format(days[13], 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (!error && data) {
      setEntries(data as TimeEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  const getEntry = (dateStr: string) => entries.find((e) => e.date === dateStr);

  const openEdit = (dateStr: string) => {
    const existing = getEntry(dateStr);
    setEditingDate(dateStr);
    setForm({
      clock_in: existing?.clock_in || '',
      clock_out: existing?.clock_out || '',
      overtime_hours: existing?.overtime_hours || 0,
      notes: existing?.notes || '',
    });
  };

  const saveEntry = async () => {
    if (!user || !editingDate) return;

    const existing = getEntry(editingDate);
    const payload = {
      user_id: user.id,
      date: editingDate,
      clock_in: form.clock_in || null,
      clock_out: form.clock_out || null,
      overtime_hours: Number(form.overtime_hours) || 0,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('time_entries')
        .update(payload)
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('time_entries').insert(payload));
    }

    if (!error) {
      setEditingDate(null);
      fetchEntries();
    } else {
      alert('Save failed: ' + error.message);
    }
  };

  // Totals
  const totals = useMemo(() => {
    let regular = 0;
    let overtime = 0;
    entries.forEach((e) => {
      regular += calcHours(e.clock_in, e.clock_out);
      overtime += Number(e.overtime_hours) || 0;
    });
    return {
      regular: Math.round(regular * 100) / 100,
      overtime: Math.round(overtime * 100) / 100,
      total: Math.round((regular + overtime) * 100) / 100,
    };
  }, [entries]);

  // Group by week for display
  const week1 = days.slice(0, 7);
  const week2 = days.slice(7, 14);

  const renderDayCard = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const entry = getEntry(dateStr);
    const isWE = isWeekend(day);
    const hours = entry ? calcHours(entry.clock_in, entry.clock_out) : 0;
    const ot = entry?.overtime_hours || 0;

    return (
      <div
        key={dateStr}
        onClick={() => openEdit(dateStr)}
        className={`card p-3 cursor-pointer hover:border-cyan-500/50 transition-all min-h-[110px] flex flex-col ${
          isWE ? 'border-purple-900/50 bg-purple-950/20' : ''
        } ${editingDate === dateStr ? 'neon-border' : ''}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-[10px] text-cyan-600 tracking-wider uppercase">
              {format(day, 'EEE')}
            </div>
            <div className="text-sm font-orbitron text-cyan-200">
              {format(day, 'MMM d')}
            </div>
          </div>
          {isWE && (
            <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
              OT ZONE
            </span>
          )}
        </div>

        {entry ? (
          <div className="mt-auto space-y-0.5 text-xs">
            <div className="text-cyan-400/90">
              {entry.clock_in || '--:--'} → {entry.clock_out || '--:--'}
            </div>
            <div className="text-gray-400">
              {hours > 0 && <span>{hours}h</span>}
              {ot > 0 && <span className="text-purple-400 ml-2">+{ot}h OT</span>}
            </div>
          </div>
        ) : (
          <div className="mt-auto text-[10px] text-gray-600 italic">No entry</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-orbitron text-xl neon-text-purple tracking-wider">
            TIMESHEET // 14-DAY
          </h2>
          <p className="text-xs text-purple-500/80 mt-1">
            Rolling window • Mon–Fri core • Weekends = Overtime capable
          </p>
        </div>

        {/* Summary */}
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-[10px] text-cyan-600 tracking-wider">REGULAR</div>
            <div className="font-orbitron text-cyan-300 text-lg">{totals.regular}h</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-purple-600 tracking-wider">OVERTIME</div>
            <div className="font-orbitron text-purple-300 text-lg">{totals.overtime}h</div>
          </div>
          <div className="text-center border-l border-cyan-900 pl-4">
            <div className="text-[10px] text-cyan-400 tracking-wider">TOTAL</div>
            <div className="font-orbitron neon-text-cyan text-xl">{totals.total}h</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-purple-800">LOADING TIMELINE...</div>
      ) : (
        <>
          {/* Week 1 */}
          <div>
            <h3 className="text-xs text-cyan-600 tracking-widest mb-3 uppercase">
              Days 1–7 • {format(week1[0], 'MMM d')} – {format(week1[6], 'MMM d')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {week1.map(renderDayCard)}
            </div>
          </div>

          {/* Week 2 */}
          <div>
            <h3 className="text-xs text-cyan-600 tracking-widest mb-3 uppercase">
              Days 8–14 • {format(week2[0], 'MMM d')} – {format(week2[6], 'MMM d')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {week2.map(renderDayCard)}
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card-glow w-full max-w-md p-6 space-y-4 relative">
            <h3 className="font-orbitron text-lg neon-text-cyan tracking-wider">
              LOG HOURS — {format(parseISO(editingDate), 'EEE, MMM d')}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-cyan-500 mb-1">CLOCK IN</label>
                <input
                  type="time"
                  value={form.clock_in}
                  onChange={(e) => setForm({ ...form, clock_in: e.target.value })}
                  className="w-full px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-500 mb-1">CLOCK OUT</label>
                <input
                  type="time"
                  value={form.clock_out}
                  onChange={(e) => setForm({ ...form, clock_out: e.target.value })}
                  className="w-full px-3 py-2 rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-purple-400 mb-1">
                OVERTIME HOURS (extra / weekend work)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={form.overtime_hours}
                onChange={(e) => setForm({ ...form, overtime_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded text-sm"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs text-cyan-500 mb-1">NOTES</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded text-sm resize-none"
                placeholder="What was done..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={saveEntry} className="neon-btn flex-1 py-2.5 text-sm">
                SAVE ENTRY
              </button>
              <button
                onClick={() => setEditingDate(null)}
                className="neon-btn-danger px-4 py-2.5 text-sm"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
