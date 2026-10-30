import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Loads data from SQLite every time the screen gains focus, so tabs reflect what a session just changed. */
export function useFocusData<T>(load: (db: SQLiteDatabase) => Promise<T>) {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  const loadRef = useRef(load);
  // declared before useFocusEffect so it runs first and the focus load sees the latest closure
  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(() => {
    let alive = true;
    loadRef.current(db).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [db]);

  useFocusEffect(reload);
  return [data, reload] as const;
}
