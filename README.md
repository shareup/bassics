# bassics

bassics is a typesafe reactive frontend microframework for building highly performant client apps with familiar patterns like central, unidirectional state management, actions + reducers, html templates, and routing.

Well, it will be. **It's not ready for use yet.** Hopefully version 0.1.0 will be published soon.

## Example dreamcode

**Does not work, this is just my dreamcode for what I want to write.**

```ts
import { App, html, Send, Update, Template } from 'bassics'

interface State {
  count: number;
}

const initialState: State = { count: 0 }

const app = new App(initialState, { renderOnUpdate: true })

cosnt template: Template = (state: State, send: Send) => html`
  <p>Count is ${state.count}</p>
`

app.mount(document.body, template)

setInterval(() => {
  app.send(increment)
}, 3000)

async function increment (state: State, _send: Send, update: Update): void {
  console.debug('incrementing count soon…')

  // actions can be async, cannot mutate state
  await wait(250)

  // This update call is typesafe and will only compile if the arguments are correct
  state = update(updateCount, state.count + 1)

  console.debug('incremented to ${state.count}')
}

function updateCount (state: State, count: number): State {
  // reducers (or updaters) are always synchronous
  state.count = count
  return state
}

function wait (amount) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, amount)
  })
}
```

## TODO

- [x] Extract from existing project
- [x] Stop passing the store around
- [ ] Document example app
- [ ] Include render action
- [ ] SSR
- [ ] Local dev setup?
- [ ] Routing?
