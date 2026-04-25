import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useCollection<T extends { id: string }>(
  collectionPath: string,
  constraints: QueryConstraint[] = [],
): { data: T[]; loading: boolean; error: string | null } {
  const [data, setData]       = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionPath), ...constraints);

    const unsub = onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath]);

  return { data, loading, error };
}
