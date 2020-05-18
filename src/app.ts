import { Store, Send, Update } from './store'
import {
  render as renderToDOM,
  TemplateResult,
  SVGTemplateResult
} from 'lit-html'
import { raf } from './raf'
export { render, html, TemplateResult, SVGTemplateResult } from 'lit-html'

type InitialValue<T> = () => T

interface Options {
  renderOnStateChange?: boolean
}

// TODO: Pass some sort of rendering context to the templates to inject SSR or
// service worker appropriate rendering functions

export type Props<T> = {
  state: T
  send: Send<T>
  prev: T
}

export function clean<T, P extends Props<T>> (props: P): Props<T> {
  const { state, send, prev } = props
  return { state, send, prev }
}

export type Template<T> = (
  props: Props<T>
) => TemplateResult | SVGTemplateResult

export class App<T> {
  store: Store<T>
  prevState: T
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
    this.prevState = this.store.state
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

  render () {
    const currentState = this.store.state

    const result = this.mainTemplate({
      state: currentState,
      send: this.send,
      prev: this.prevState
    })

    this.prevState = currentState

    return result
  }

  mount (el: HTMLElement): void {
    renderToDOM(this.render(), el)

    if (this._renderOnStateChange) {
      this.store.onStateChange(
        raf(() => {
          renderToDOM(this.render(), el)
        })
      )
    }
  }
}
