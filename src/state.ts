// -*- Fake immer -*-
// TODO: Eventually implement copy-on-write to save some CPU – https://github.com/Swatinem/cow
//       or just use immer…

type Callback<T> = (arg0: T) => void
type Factory<T> = () => T
type Updator<T> = (arg0: T) => T

export class State<T> {
  value: T
  _callbacks: Callback<T>[]

  constructor (initialValue: T | Factory<T>) {
    if (initialValue instanceof Function) {
      this.value = initialValue()
    } else {
      this.value = initialValue
    }

    deepFreeze(this.value)

    this._callbacks = []
  }

  update (newValue: T | Updator<T>): T {
    const originalValue = this.value

    if (newValue instanceof Function) {
      const mutableValue = deepCopy(this.value)
      const potentialNewValue = newValue(mutableValue)

      if (potentialNewValue instanceof Promise) {
        // https://github.com/immerjs/immer/issues/108#issuecomment-367694770
        // they allow async now but "it's up to the user to prevent conflicts"
        // so it's not a good idea IMO
        throw new Error('state changes must be made sychronously')
      }

      this.value = potentialNewValue
    } else {
      this.value = newValue
    }

    deepFreeze(this.value)

    if (originalValue !== this.value) {
      const currentValue = this.value

      this._callbacks.forEach(cb => {
        setTimeout(() => {
          cb(currentValue)
        })
      })
    }

    return this.value
  }

  onUpdate (cb: Callback<T>): void {
    this._callbacks.push(cb)
  }
}

function isObject (po: any): boolean {
  return (
    po !== null &&
    typeof po === 'object' &&
    po.constructor === Object &&
    Object.prototype.toString.call(po) === '[object Object]'
  )
}

function isTypedArray (a: any): boolean {
  return (
    a instanceof Int8Array ||
    a instanceof Int16Array ||
    a instanceof Int32Array ||
    a instanceof Uint8Array ||
    a instanceof Uint8ClampedArray ||
    a instanceof Uint16Array ||
    a instanceof Uint32Array ||
    a instanceof Float32Array ||
    a instanceof Float64Array
  )
}

function deepCopy<O> (o: O, level: number = 0): O {
  if (level > 20) {
    return o
  }

  if (isTypedArray(o)) {
    // @ts-ignore
    return o.constructor.from(o)
  } else if (Array.isArray(o)) {
    const a = Array.from(o)
    for (const i in o) {
      if (a.hasOwnProperty(i)) {
        a[i] = deepCopy(o[i], level + 1)
      }
    }
    // @ts-ignore
    return a
  } else if (isObject(o)) {
    o = Object.assign({}, o)
    for (const key in o) {
      // @ts-ignore
      if (o.hasOwnProperty(key)) {
        o[key] = deepCopy(o[key], level + 1)
      }
    }
    return o
  } else if (o instanceof File) {
    // @ts-ignore
    return new File([o], o.name, { type: o.type })
  } else if (o instanceof Blob) {
    // @ts-ignore
    return new Blob([o], { type: o.type })
  } else if (o instanceof Date) {
    // @ts-ignore
    return new Date(o)
  } else if (o instanceof Map || o instanceof WeakMap) {
    const m = o.constructor()

    // @ts-ignore
    for (const [k, v] of o) {
      m.set(k, v)
    }

    return m
  } else if (o instanceof Set || o instanceof WeakSet) {
    const s = o.constructor()

    // @ts-ignore
    for (const v of o) {
      s.add(v)
    }

    return s
  } else {
    return o
  }
}

function deepFreeze (o: any, level: number = 0): void {
  if (level > 20) {
    return
  }

  if (isObject(o)) {
    Object.freeze(o)

    for (const name of Object.getOwnPropertyNames(o)) {
      deepFreeze(o[name], level + 1)
    }
  } else if (Array.isArray(o)) {
    Object.freeze(o)

    for (const i in o) {
      if (o.hasOwnProperty(i)) {
        deepFreeze(o[i], level + 1)
      }
    }
  } else if (isTypedArray(o)) {
    o.copyWithin = undefined
    o.fill = undefined
    o.reverse = undefined
    o.set = undefined
    o.sort = undefined
  } else if (
    typeof o === 'string' ||
    o instanceof Blob ||
    o instanceof Date ||
    o instanceof Map ||
    o instanceof Set ||
    o instanceof WeakMap ||
    o instanceof WeakSet
  ) {
    Object.freeze(o)
  } else if (
    typeof o === 'number' ||
    typeof o === 'bigint' ||
    typeof o === 'boolean' ||
    o === Infinity ||
    isNaN(o) ||
    typeof o === 'symbol' ||
    o === undefined ||
    o === null
  ) {
    // noop
  } else {
    throw new Error(`unsupported type stored in State ${o}`)
  }
}
