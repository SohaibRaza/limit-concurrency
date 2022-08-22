## Running Examples
1. `yarn install`
2. `yarn build`
3. open `examples/index.html`
4. Enter urls
5. Enter concurrency limit
6. Click fetch

-------

Example 1:
```js
import limitConcurrency from "limit-concurrency";

async function getUsers() {
  const result = await limitConcurrency({
    collection: [
      "https://jsonplaceholder.ir/users/1",
      "https://jsonplaceholder.ir/users/2",
      "https://jsonplaceholder.ir/users/3",
      "https://jsonplaceholder.ir/users/4",
      "https://jsonplaceholder.ir/users/5",
    ],
    asyncTask: async (url) => {
      const response = await fetch(url);
      const text = await response.text();
      return text;
    },
    limit: 2, // only fetch two pages at a time
  });

  console.log(result);
}
```
Example 2:
```js
import limitConcurrency from "limit-concurrency";
import axios from "axios";

async function getTODOs() {
  const result = await limitConcurrency({
    collection: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    asyncTask: async (id) => {
      const response = await axios.get(`https://jsonplaceholder.typicode.com/todos/${id}`);
      return response.data;
    },
    limit: 4, // only fetch four tasks at a time
  });

  console.log(result);
}
```

## Test Cases
  - ✓ runs every item in a collection through an async function limiting the number of concurrent workers.
  - ✓ works with max limit greater than one.
  - ✓ works with an empty collection.
  - ✓ returns the collection in input order .
  - ✓ defaults to a Promise.all implements if no max limit is given.
  - ✓ throws at the first error.
  - ✓ throws if the last item throws.
  - ✓ does not mutate the collection.
