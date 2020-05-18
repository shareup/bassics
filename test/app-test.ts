import { App } from '../src/app'
import { html } from 'lit-html'

// const decoder = new TextDecoder()

test('initializes a store', () => {
  interface State {
    count: 0
  }

  const initialState: State = { count: 0 }

  const app = new App(
    initialState,
    ({ state }) => html`
      <p>Count: ${state.count}</p>
    `
  )

  expect(app.store).toBeTruthy()
  expect(app.store.state.count).toBe(0)

  const result = app.render()
  expect(result).toBeTruthy()

  // TODO: introspect TemplateResult?
})
