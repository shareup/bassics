import { Store, Send, Update } from './store'
import { render, TemplateResult, SVGTemplateResult } from 'lit-html'
import { raf } from './raf'
export { render, html, TemplateResult, SVGTemplateResult } from 'lit-html'

type InitialValue<T> = () => T

interface Options {
  renderOnStateChange?: boolean
}

// TODO: Pass some sort of rendering context to the templates to inject SSR or
// service worker appropriate rendering functions

export type Template<T> = (
  state: T,
  send: Send<T>,
  prev: T
) => TemplateResult | SVGTemplateResult

export class App<T> {
  store: Store<T>
  mainTemplate: Template<T>
  send: Send<T>
  update: Update<T>

  _renderOnStateChange: boolean

  constructor (
    initialState: T | InitialValue<T>,
    mainTemplate: Template<T>,
    options: Options = {}
  ) {
    this.store = new Store(initialState)
    this.mainTemplate = mainTemplate

    // NOTE: The default is true, so if it's left undefined then we'll call that true
    if (
      options.renderOnStateChange === undefined ||
      options.renderOnStateChange === true
    ) {
      this._renderOnStateChange = true
    } else {
      this._renderOnStateChange = false
    }

    this.send = this.store.send.bind(this.store)
    this.update = this.store.update.bind(this.store)
  }

  mount (el: HTMLElement): void {
    render(
      this.mainTemplate(
        this.store.state,
        this.store.send.bind(this.store),
        this.store.state
      ),
      el
    )

    const send = this.store.send.bind(this.store)

    if (this._renderOnStateChange) {
      this.store.onStateChange(
        raf((state, prev) => {
          render(this.mainTemplate(state, send, prev), el)
        })
      )
    }
  }
}
