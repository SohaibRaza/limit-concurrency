interface ConcurrentPromiseOptions<T, R> {
  readonly asyncTask: (t: T, index: number) => Promise<R>;
  readonly collection: readonly T[];
  readonly limit?: number;
}

/**
 * Binds task with index to keep track of the order
 * @param collection
 * @returns [t, i][]
 */
function bindTaskWithIndex<T>(collection: readonly T[]) {
  return collection.map((t, i) => [t, i] as [T, number]);
}

async function limitConcurrency<T, R>({
  collection,
  asyncTask,
  limit,
}: ConcurrentPromiseOptions<T, R>): Promise<R[]> {
  if (!limit) {
    return Promise.all(collection.map((item, index) => asyncTask(item, index)));
  }

  if (!collection.length) {
    return [];
  }

  const results: Array<[R, number]> = [];
  const mutableCollection = bindTaskWithIndex(collection);

  let available = limit;
  let done = false;
  let globalResolve!: () => void;
  let globalReject!: (err: Error) => void;

  const finalPromise = new Promise<void>((resolve, reject) => {
    globalResolve = resolve;
    globalReject = reject;
  });

  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function ready() {
    return new Promise<void>((resolve) => {
      const listener = () => {
        if (done) {
          listeners.delete(listener);
          resolve();
        } else if (available > 0) {
          listeners.delete(listener);
          available -= 1;
          resolve();
        }
      };

      listeners.add(listener);
      notify();
    });
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const value = mutableCollection.shift();

    if (!value) break;
    if (done) break;

    const [t, index] = value;

    await ready();

    asyncTask(t, index)
      .then((result) => {
        results.push([result, index]);
        available += 1;

        if (results.length === collection.length) {
          done = true;
          globalResolve();
        }
      })
      .catch((e) => {
        done = true;
        globalReject(e);
      })
      .finally(notify);
  }

  await finalPromise;

  return results
    .slice()
    .sort(([, a], [, b]) => a - b)
    .map(([r]) => r);
}

export default limitConcurrency;
