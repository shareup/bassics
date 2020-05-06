import { Storage, Send, Update } from '../src/storage'

test('can initialize with state factory', () => {
  const initialState = { count: 0 }

  const storeV1 = new Storage(initialState)
  expect(storeV1.state.count).toBe(0)

  const storeV2 = new Storage(() => initialState)
  expect(storeV2.state.count).toBe(0)
})

test('actions work', async () => {
  interface State {
    amount: number
  }

  const store = new Storage<State>({ amount: 2 })

  async function doAdd (
    state: State,
    amount: number,
    send: Send<State, any>,
    update: Update<State, any>
  ): Promise<void> {
    update(add, amount)
    await send(log, null)
  }

  async function log (
    state: State,
    nothing: null,
    _send: Send<State, any>,
    _update: Update<State, any>
  ) {
    // tslint:disable-next-line no-console
    console.debug(`current amount is: ${state.amount}`)
  }

  function add (state: State, amount: number): State {
    state.amount += amount
    return state
  }

  await store.send(doAdd, 5)
  await store.send(doAdd, 3)

  expect(store.state.amount).toBe(10)
})
