export function nextTick<O> (cb: () => O | Promise<O>): Promise<O> {
  return new Promise((resolve, reject) => {
    requestAnimationFrame(() => {
      Promise.resolve(cb())
        .then(value => resolve(value))
        .catch(e => reject(e))
    })
  })
}
