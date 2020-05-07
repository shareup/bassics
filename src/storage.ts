import { State } from './state'
import { nextTick } from './next-tick'

type AnyFunction = (...args: any[]) => any

export type Update<T> = <A>(updater: Reducer<T, A>, arg: A) => T
export type Send<T> = <A>(action: Action<T, A>, arg: A) => Promise<T>

type Reducer<T, A> = (state: T, arg: A) => T
type Action<T, A> = (
  state: T,
  arg: A,
  send: Send<T>,
  update: Update<T>
) => Promise<void>

type StateChangeCallback<T> = (state: T, prev: T) => void

type ActionCallback<T> = <A>(
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

export interface Options {
  logger?: Logger
  logStateChanges?: boolean
  logActionCallbackTimings?: boolean
}

export interface Logger {
  debug: (...args: any[]) => void
  log: (...args: any[]) => void
  error: (...args: any[]) => void
  group: (name: string) => void
  groupEnd: () => void
}

const NullLogger = {
  debug: (..._args: any[]) => {
    return
  },
  log: (..._args: any[]) => {
    return
  },
  error: (..._args: any[]) => {
    return
  },
  group: (_name: string) => {
    return
  },
  groupEnd: () => {
    return
  }
}

export class Storage<T> {
  logger: Logger

  _options: Options
  _state: State<T>
  _previousStateValue: T
  _history: HistoryEntry<T>[]
  _stateChangeCallbacks: StateChangeCallback<T>[]
  _all: () => void
  _actionCallbacks: WeakMap<AnyFunction, ActionCallback<T>[]>
  _errorCallbacks: ErrorCallback<T>[]

  constructor (initialState: T | InitialValue<T>, options: Options = {}) {
    this._options = options || {}
    this.logger = this._options.logger || NullLogger
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
        this.logger.debug(
          '✨ state changed',
          newState,
          this._previousStateValue
        )
      }

      this._stateChangeCallbacks.forEach(cb => {
        cb(newState, this._previousStateValue)
      })
    })
  }

  get state () {
    return this._state.value
  }

  next<A, U> (action: Action<T, A>, arg: A): Promise<void> {
    // const end = createMeasurement()

    return nextTick(async () => {
      try {
        await this.send(action, arg)
      } finally {
        // const duration = end().toFixed(3)
        // this.logger.debug(`🏁 ${duration}ms next ${action.name}`)
      }
    })
  }

  async send<A> (action: Action<T, A>, arg: A): Promise<T> {
    // const end = createMeasurement()
    this.logger.group(`send ${action.name}`)
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
      this.logger.error(`🧨 send ${action.name}`, e.message)
      this.logger.error(e.stack)

      this._errorCallbacks.forEach(cb => {
        cb(this._state.value, e, action.name)
      })

      throw e
    } finally {
      // const duration = end().toFixed(3)
      // this.logger.debug(`🏁 ${duration}ms send ${action.name}`)
      this.logger.groupEnd()
    }

    return this._state.value
  }

  update<A> (updater: Reducer<T, A>, arg: A): T {
    let name = updater.name

    if (name === '') {
      name = 'anonymous'
    }

    // const end = createMeasurement()
    this.logger.group(`update ${name}`)
    // const cbEnd = createMeasurement()

    try {
      this._state.update(oldState => {
        // oldState is mutable inside this callback
        const newState = updater(oldState, arg)
        this._previousStateValue = oldState
        return newState
      })

      this._history.push({
        name,
        arg,
        result: this._state.value
      })

      this._runActionCallbacks(updater, arg, () => {
        return
      })

      return this._state.value
    } catch (e) {
      this.logger.error(`🧨 update ${name}`, e.message)
      this.logger.error(e.stack)

      this._errorCallbacks.forEach(cb => {
        cb(this._state.value, e, name)
      })

      throw e
    } finally {
      // const syncDuration = end()
      // this.logger.debug(`🚀 ${syncDuration.toFixed(3)}ms update ${name}`)
      this.logger.groupEnd()
    }
  }

  onError (cb: ErrorCallback<T>): void {
    this._errorCallbacks.push(cb)
  }

  onAction<A> (cb: ActionCallback<T>): void
  onAction<A> (fn: AnyFunction, cb: ActionCallback<T>): void

  onAction<A> (
    fn: ActionCallback<T> | AnyFunction,
    cb?: ActionCallback<T>
  ): void {
    if (cb === undefined) {
      cb = fn as ActionCallback<T>
      this._updateActionCallbacks(this._all, cb)
    } else {
      fn = fn as AnyFunction
      this._updateActionCallbacks(fn, cb)
    }
  }

  _updateActionCallbacks<A> (fn: AnyFunction, cb: ActionCallback<T>): void {
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
        this.logger.error(`🧨 ${action.name} callbacks`, e.message)
        this.logger.error(e.stack)
      })
      .finally(() => {
        // const duration = end().toFixed(3)
        // if (this._options.logActionCallbackTimings) {
        // this.logger.debug(`🏁 ${duration}ms ${action.name} callbacks finished`)
        // }
      })
  }

  onStateChange (cb: StateChangeCallback<T>): void {
    this._stateChangeCallbacks.push(cb)
  }
}
