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
  const msgs: string[] = []

  async function doAdd (
    state: State,
    amount: number,
    send: Send<State>,
    update: Update<State>
  ): Promise<void> {
    update(add, amount)
    await send(log, null)
  }

  async function log (state: State) {
    msgs.push(`current amount is: ${state.amount}`)
  }

  function add (state: State, amount: number): State {
    state.amount += amount
    return state
  }

  await store.send(doAdd, 5)
  await store.send(doAdd, 3)

  expect(store.state.amount).toBe(10)
  expect(msgs.length).toBe(2)
})
