type fn = (...args: any[]) => void

export function raf<F extends fn> (work: F): (...args: Parameters<F>) => void {
  let scheduled = false
  let latestArgs: Parameters<F>

  return (...args: Parameters<F>) => {
    latestArgs = args

    if (!scheduled) {
      scheduled = true

      window.requestAnimationFrame(() => {
        scheduled = false
        work(...latestArgs)
      })
    }
  }
}
