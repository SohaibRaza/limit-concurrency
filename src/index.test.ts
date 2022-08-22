import limitConcurrency from "./index";

function createDeferredPromise<T>() {
  let _resolve!: (t?: T) => void;
  let _reject!: (error: Error) => void;
  const resolvedRef = { current: false };
  const touchedRef = { current: false };

  const promise = new Promise<T>((thisResolve, thisReject) => {
    _resolve = thisResolve as (t?: T) => void;
    _reject = thisReject;
  });

  return Object.assign(promise, {
    touch: () => {
      touchedRef.current = true;
    },
    resolve: () => {
      resolvedRef.current = true;
      _resolve();
    },
    reject: (error: Error) => {
      _reject(error);
    },
    isResolved: () => {
      return resolvedRef.current;
    },
    isTouched: () => {
      return touchedRef.current;
    },
  });
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

it("does not mutate the collection", async () => {
  const a = {};
  const b = {};
  const c = {};
  const collection = [a, b, c];
  await limitConcurrency({
    collection,
    asyncTask: () => new Promise((resolve) => setTimeout(resolve, 100)),
    limit: 10,
  });

  expect(collection.length).toBe(3);
  expect(collection[0]).toBe(a);
  expect(collection[1]).toBe(b);
  expect(collection[2]).toBe(c);
});

it("runs every item in a collection through an async function limiting the number of concurrent workers", async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();

  const promise = limitConcurrency({
    collection: [one, two, three],
    asyncTask: async (obj, index) => {
      obj.touch();
      await obj;
      return index;
    },
    limit: 1,
  });

  setTimeout(async () => {
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(false);
    expect(two.isTouched()).toBe(false);
    expect(two.isResolved()).toBe(false);
    expect(three.isTouched()).toBe(false);
    expect(three.isResolved()).toBe(false);

    one.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(false);
    expect(three.isTouched()).toBe(false);
    expect(three.isResolved()).toBe(false);

    two.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(true);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(false);

    three.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(true);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(true);
  }, 0);

  const result = await promise;
  expect(result).toEqual([0, 1, 2]);
});

it("works with concurrency limit greater than one", async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();

  const promise = limitConcurrency({
    collection: [one, two, three],
    asyncTask: async (obj) => {
      obj.touch();
      await obj;
    },
    limit: 2,
  });

  setTimeout(async () => {
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(false);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(false);
    expect(three.isTouched()).toBe(false);
    expect(three.isResolved()).toBe(false);

    one.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(false);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(false);

    two.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(true);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(false);

    three.resolve();
    await flush();

    expect(one.isTouched()).toBe(true);
    expect(one.isResolved()).toBe(true);
    expect(two.isTouched()).toBe(true);
    expect(two.isResolved()).toBe(true);
    expect(three.isTouched()).toBe(true);
    expect(three.isResolved()).toBe(true);
  }, 0);

  await promise;
});

it("works with an empty collection", async () => {
  await limitConcurrency({
    collection: [],
    asyncTask: async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    limit: 10,
  });
});

it("returns the collection in input order", async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();
  const four = createDeferredPromise();
  const five = createDeferredPromise();
  const six = createDeferredPromise();

  const promise = limitConcurrency({
    collection: [one, two, three, four, five, six],
    asyncTask: async (obj, i) => {
      obj.touch();
      await obj;
      return i;
    },
    limit: 3,
  });

  setTimeout(async () => {
    six.resolve();
    five.resolve();
    four.resolve();
    await flush();
    three.resolve();
    two.resolve();
    one.resolve();
  }, 0);

  const result = await promise;

  expect(result).toEqual([0, 1, 2, 3, 4, 5]);
});

it("defaults to a Promise.all if no concurrency limit is given", async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();

  const promise = limitConcurrency({
    collection: [one, two],
    asyncTask: async (obj) => {
      obj.touch();
      await obj;
    },
  });

  setTimeout(() => {
    expect(one.isTouched()).toBe(true);
    expect(two.isTouched()).toBe(true);

    one.resolve();
    two.resolve();
  }, 0);

  await promise;
});

it("throws at the first error", async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();

  const promise = limitConcurrency({
    collection: [one, two, three],
    asyncTask: async (obj) => {
      obj.touch();
      await obj;
    },
    limit: 1,
  });

  setTimeout(async () => {
    one.resolve();
    await flush();

    two.reject(new Error("test error"));
  }, 0);

  let rejected = false;
  try {
    await promise;
  } catch (e: any) {
    rejected = true;
    expect(e.message).toBe("test error");
  }
  expect(rejected).toBe(true);
});

it("throws if the last item fails", async () => {
  const one = createDeferredPromise();
  const two = createDeferredPromise();
  const three = createDeferredPromise();

  const promise = limitConcurrency({
    collection: [one, two, three],
    asyncTask: async (obj) => {
      obj.touch();
      await obj;
    },
    limit: 1,
  });

  setTimeout(async () => {
    one.resolve();
    await flush();

    two.resolve();
    await flush();

    three.reject(new Error("test error"));
  }, 0);

  let rejected = false;
  try {
    await promise;
  } catch (e: any) {
    rejected = true;
    expect(e.message).toBe("test error");
  }
  expect(rejected).toBe(true);
});
