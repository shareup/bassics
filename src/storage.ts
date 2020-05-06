import { State } from './state'
import { nextTick } from './next-tick'

type AnyFunction = (...args: any[]) => any

type Action<T, A> = (
  state: T,
  arg: A,
  send: <R>(action: Action<T, R>, arg: R) => Promise<T>,
  update: <R>(action: Update<T, R>, arg: R) => T
) => Promise<void>

type Update<T, A> = (state: T, arg: A) => T

type Send<T, A> = (action: Action<T, A>, arg: A) => Promise<T>

type StateChangeCallback<T> = (state: T, prev: T) => void

type ActionCallback<T, A> = (
  state: T,
  actionArg: A,
  actionName: string
) => Promise<void>

type ErrorCallback<T> = (state: T, error: Error, actionName: string) => void

type InitialValue<T> = () => T

interface HistoryEntry<T> {
  name: string
  arg: any
  result: T
}

interface Options {
  logStateChanges?: boolean
  logActionCallbackTimings?: boolean
}

export class Storage<T> {
  _options: Options
  _state: State<T>
  _previousStateValue: T
  _history: HistoryEntry<T>[]
  _stateChangeCallbacks: StateChangeCallback<T>[]
  _all: () => void
  _actionCallbacks: WeakMap<AnyFunction, ActionCallback<T, any>[]>
  _errorCallbacks: ErrorCallback<T>[]

  constructor (initialState: T | InitialValue<T>, options: Options = {}) {
    this._options = options || {}
    this._state = new State(initialState)
    this._previousStateValue = Object.assign({}, this._state.value)
    this._history = []
    this._stateChangeCallbacks = []
    this._all = () => {
      return
    }
    this._actionCallbacks = new WeakMap()
    this._actionCallbacks.set(this._all, [])
    this._errorCallbacks = []

    this._state.onUpdate(newState => {
      if (this._options.logStateChanges) {
        // tslint:disable-next-line no-console
        console.debug('✨ state changed', newState, this._previousStateValue)
      }

      this._stateChangeCallbacks.forEach(cb => {
        cb(newState, this._previousStateValue)
      })
    })
  }

  get state () {
    return this._state.value
  }

  next<A> (action: Action<T, A>, arg: A): Promise<void> {
    // const end = createMeasurement()

    return nextTick(async () => {
      try {
        await this.send(action, arg)
      } finally {
        // const duration = end().toFixed(3)
        // console.debug(`🏁 ${duration}ms next ${action.name}`)
      }
    })
  }

  async send<A> (action: Action<T, A>, arg: A): Promise<T> {
    // const end = createMeasurement()
    // tslint:disable-next-line no-console
    console.group(`send ${action.name}`)
    // const cbEnd = createMeasurement()

    try {
      const currentState = this._state.value
      await action(
        currentState,
        arg,
        this.send.bind(this),
        this.update.bind(this)
      )

      this._history.push({
        name: action.name,
        arg,
        result: this._state.value
      })

      await this._runActionCallbacks(action, arg, () => {
        return
      })
    } catch (e) {
      // tslint:disable-next-line no-console
      console.error(`🧨 send ${action.name}`, e.message)
      // tslint:disable-next-line no-console
      console.error(e.stack)

      this._errorCallbacks.forEach(cb => {
        cb(this._state.value, e, action.name)
      })

      throw e
    } finally {
      // const duration = end().toFixed(3)
      // console.debug(`🏁 ${duration}ms send ${action.name}`)
      // tslint:disable-next-line no-console
      console.groupEnd()
    }

    return this._state.value
  }

  update<A> (action: Update<T, A>, arg: A): T {
    let name = action.name

    if (name === '') {
      name = 'anonymous'
    }

    // const end = createMeasurement()
    // tslint:disable-next-line no-console
    console.group(`update ${name}`)
    // const cbEnd = createMeasurement()

    try {
      this._state.update(oldState => {
        // oldState is mutable inside this callback
        const newState = action(oldState, arg)
        this._previousStateValue = oldState
        return newState
      })

      this._history.push({
        name,
        arg,
        result: this._state.value
      })

      this._runActionCallbacks(action, arg, () => {
        return
      })

      return this._state.value
    } catch (e) {
      // tslint:disable-next-line no-console
      console.error(`🧨 update ${name}`, e.message)
      // tslint:disable-next-line no-console
      console.error(e.stack)

      this._errorCallbacks.forEach(cb => {
        cb(this._state.value, e, name)
      })

      throw e
    } finally {
      // const syncDuration = end()
      // console.debug(`🚀 ${syncDuration.toFixed(3)}ms update ${name}`)
      // tslint:disable-next-line no-console
      console.groupEnd()
    }
  }

  onError (cb: ErrorCallback<T>): void {
    this._errorCallbacks.push(cb)
  }

  onAction<A> (cb: ActionCallback<T, A>): void
  onAction<A> (fn: AnyFunction, cb: ActionCallback<T, A>): void

  onAction<A> (
    fn: ActionCallback<T, A> | AnyFunction,
    cb?: ActionCallback<T, A>
  ): void {
    if (cb === undefined) {
      cb = fn as ActionCallback<T, A>
      this._updateActionCallbacks(this._all, cb)
    } else {
      fn = fn as AnyFunction
      this._updateActionCallbacks(fn, cb)
    }
  }

  _updateActionCallbacks<A> (fn: AnyFunction, cb: ActionCallback<T, A>): void {
    let cbs = this._actionCallbacks.get(fn)

    if (cbs === undefined) {
      cbs = []
    }

    cbs.push(cb)
    this._actionCallbacks.set(fn, cbs)
  }

  _runActionCallbacks<A> (
    action: AnyFunction,
    arg: A,
    end: () => void
  ): Promise<void> {
    const allCallbacks = this._actionCallbacks.get(this._all) || []
    const actionCallbacks = this._actionCallbacks.get(action) || []

    return Promise.all([
      allCallbacks.map(cb => {
        return cb(this._state.value, arg, action.name)
      }),
      actionCallbacks.map(cb => {
        return cb(this._state.value, arg, action.name)
      })
    ])
      .then(() => {
        // noop
      })
      .catch(e => {
        // tslint:disable-next-line no-console
        console.error(`🧨 ${action.name} callbacks`, e.message)
        // tslint:disable-next-line no-console
        console.error(e.stack)
      })
      .finally(() => {
        // const duration = end().toFixed(3)
        // if (this._options.logActionCallbackTimings) {
        // tslint:disable-next-line no-console
        // console.debug(`🏁 ${duration}ms ${action.name} callbacks finished`)
        // }
      })
  }

  onStateChange (cb: StateChangeCallback<T>): void {
    this._stateChangeCallbacks.push(cb)
  }
}
