
// returns a promise with the same type as the input promise

/**
 * 
 * @template T
 * @param {Promise<T>} promise 
 * @param {() => Promise<void>} predicate 
 * @param {number} timeout 
 * @returns {Promise<T>}
 */
export async function loopWhile(promise, predicate, timeout) {
  let promiseCompleted = false;

  let wrappedPromise = async () => {
    let result = await promise;
    promiseCompleted = true;
    return result;
  }

  let wrappedPredicate = async () => {
    while (!promiseCompleted) {
      let timeoutpromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(true);
        }, timeout);
      });
      let promise = predicate();
      
      [promise, timeoutpromise] = await Promise.all([promise, timeoutpromise]);
    }
  }

  wrappedPredicate();

  return wrappedPromise();
}
