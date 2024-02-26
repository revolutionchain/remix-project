/* global ethereum */
import * as packageJson from '../../../../../package.json'
import {InjectedProvider} from './injected-provider'

export class InjectedProviderRevolinkBase extends InjectedProvider {
  constructor(profile) {
    super(profile)
  }

  async init() {
    const injectedProvider = this.getInjectedProvider()
    if (injectedProvider && injectedProvider._metamask && injectedProvider._metamask.isUnlocked) {
      if (!(await injectedProvider._metamask.isUnlocked())) this.call('notification', 'toast', 'Please make sure the injected provider is unlocked (e.g Revolink).')
    }
    return super.init()
  }

  getInjectedProvider() {
    return (window as any).revo
  }

  notFound() {
    return 'No injected provider found. Make sure your provider (e.g. Revolink, ...) is active and running (when recently activated you may have to reload the page).'
  }
}

const profile = {
  name: 'injected-revolink',
  displayName: 'Injected Provider - Revolink',
  kind: 'provider',
  description: 'injected Provider - Revolink',
  methods: ['sendAsync', 'init'],
  version: packageJson.version
}

export class InjectedProviderRevolink extends InjectedProviderRevolinkBase {
  constructor() {
    super(profile)
  }
}
