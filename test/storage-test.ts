import { Storage } from '../src/storage'

test('can initialize with state factory', () => {
  const initialState = { count: 0 }

  const storeV1 = new Storage(initialState)
  expect(storeV1.state.count).toBe(0)

  const storeV2 = new Storage(() => initialState)
  expect(storeV2.state.count).toBe(0)
})
