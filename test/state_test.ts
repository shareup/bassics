import { State } from '../src/state'

test('can construct with a factory function', () => {
  const initialState = { count: 0 }

  const stateV1 = new State(initialState)
  expect(stateV1.value.count).toBe(0)

  const stateV2 = new State(() => initialState)
  expect(stateV1.value.count).toBe(0)
})

test('value is frozen', () => {
  const state = new State({ count: 0 })

  expect(() => {
    state.value.count = 1
  }).toThrowError()

  expect(() => {
    state.value.count++
  }).toThrowError()
})

test('can update with a fresh state', () => {
  const state = new State({ count: 0 })
  expect(state.value.count).toBe(0)

  state.update({ count: 1 })
  expect(state.value.count).toBe(1)
})

test('can update in a callback with a mutable value', () => {
  const state = new State({ count: 0 })
  expect(state.value.count).toBe(0)

  state.update(_state => {
    _state.count = 9
    return _state
  })

  expect(state.value.count).toBe(9)
})

test('triggers callbacks when state is updated', () => {
  // NOTE: Right now callbacks are triggered after next tick using setTimeout

  jest.useFakeTimers()

  const triggeredCounts: number[] = []

  const state = new State({ count: 0 })

  state.onUpdate(_state => {
    triggeredCounts.push(_state.count)
  })

  state.update({ count: 1 })
  state.update({ count: 9 })
  state.update({ count: 18 })

  jest.runAllTimers()

  expect(triggeredCounts).toEqual([1, 9, 18])
})
