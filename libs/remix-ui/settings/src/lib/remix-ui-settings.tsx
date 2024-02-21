import {ViewPlugin} from '@remixproject/engine-web'
import React, {useState, useRef, useReducer, useEffect, useCallback} from 'react' // eslint-disable-line

import {AppModal, AlertModal, ModalTypes} from '@remix-ui/app'
import {labels, textDark, textSecondary} from './constants'

import './remix-ui-settings.css'
import {
  generateContractMetadat,
  personal,
  copilotActivate,
  copilotMaxNewToken,
  copilotTemperature,
  textWrapEventAction,
  useMatomoAnalytics,
  saveTokenToast,
  removeTokenToast,
  saveSwarmSettingsToast,
  saveIpfsSettingsToast,
  useAutoCompletion,
  useShowGasInEditor,
  useDisplayErrors
} from './settingsAction'
import {initialState, toastInitialState, toastReducer, settingReducer} from './settingsReducer'
import {Toaster} from '@remix-ui/toaster' // eslint-disable-line
import {RemixUiThemeModule, ThemeModule} from '@remix-ui/theme-module'
import {RemixUiLocaleModule, LocaleModule} from '@remix-ui/locale-module'
import {FormattedMessage, useIntl} from 'react-intl'
import {GithubSettings} from './github-settings'
import {EtherscanSettings} from './etherscan-settings'
import {SindriSettings} from './sindri-settings'

/* eslint-disable-next-line */
export interface RemixUiSettingsProps {
  plugin: ViewPlugin
  config: any
  editor: any
  _deps: any
  useMatomoAnalytics: boolean
  themeModule: ThemeModule
  localeModule: LocaleModule
}

export const RemixUiSettings = (props: RemixUiSettingsProps) => {
  const [, dispatch] = useReducer(settingReducer, initialState)
  const [state, dispatchToast] = useReducer(toastReducer, toastInitialState)
  const [tokenValue, setTokenValue] = useState({}) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [themeName] = useState('')
  const [privateBeeAddress, setPrivateBeeAddress] = useState('')
  const [postageStampId, setPostageStampId] = useState('')
  const [resetState, refresh] = useState(0)
  const [ipfsUrl, setipfsUrl] = useState('')
  const [ipfsPort, setipfsPort] = useState('')
  const [ipfsProtocol, setipfsProtocol] = useState('')
  const [ipfsProjectId, setipfsProjectId] = useState('')
  const [ipfsProjectSecret, setipfsProjectSecret] = useState('')
  const copilotDownload = useRef(null)

  const intl = useIntl()
  const initValue = () => {
    const metadataConfig = props.config.get('settings/generate-contract-metadata')
    if (metadataConfig === undefined || metadataConfig === null) generateContractMetadat(props.config, true, dispatch)

    const useAutoComplete = props.config.get('settings/auto-completion')
    if (useAutoComplete === null || useAutoComplete === undefined) useAutoCompletion(props.config, true, dispatch)

    const displayErrors = props.config.get('settings/display-errors')
    if (displayErrors === null || displayErrors === undefined) useDisplayErrors(props.config, true, dispatch)

    const useShowGas = props.config.get('settings/show-gas')
    if (useShowGas === null || useShowGas === undefined) useShowGasInEditor(props.config, true, dispatch)
  }
  useEffect(() => initValue(), [resetState, props.config])
  useEffect(() => initValue(), [])

  useEffect(() => {
    const token = props.config.get('settings/' + labels['gist'].key)
    if (token) {
      setTokenValue((prevState) => {
        return {...prevState, gist: token}
      })
    }

    const etherscantoken = props.config.get('settings/' + labels['etherscan'].key)
    if (etherscantoken) {
      setTokenValue((prevState) => {
        return {...prevState, etherscan: etherscantoken}
      })
    }
    const configPrivateBeeAddress = props.config.get('settings/swarm-private-bee-address')
    if (configPrivateBeeAddress) {
      setPrivateBeeAddress(configPrivateBeeAddress)
    }
    const configPostageStampId = props.config.get('settings/swarm-postage-stamp-id')
    if (configPostageStampId) {
      setPostageStampId(configPostageStampId)
    }

    const configipfsUrl = props.config.get('settings/ipfs-url')
    if (configipfsUrl) {
      setipfsUrl(configipfsUrl)
    }
    const configipfsPort = props.config.get('settings/ipfs-port')
    if (configipfsPort) {
      setipfsPort(configipfsPort)
    }
    const configipfsProtocol = props.config.get('settings/ipfs-protocol')
    if (configipfsProtocol) {
      setipfsProtocol(configipfsProtocol)
    }
    const configipfsProjectId = props.config.get('settings/ipfs-project-id')
    if (configipfsProjectId) {
      setipfsProjectId(configipfsProjectId)
    }
    const configipfsProjectSecret = props.config.get('settings/ipfs-project-secret')
    if (configipfsProjectSecret) {
      setipfsProjectSecret(configipfsProjectSecret)
    }
  }, [themeName, state.message])

  useEffect(() => {
    if (props.useMatomoAnalytics !== null) useMatomoAnalytics(props.config, props.useMatomoAnalytics, dispatch)
  }, [props.useMatomoAnalytics])

  const onchangeGenerateContractMetadata = (event) => {
    generateContractMetadat(props.config, event.target.checked, dispatch)
  }

  const textWrapEvent = (event) => {
    textWrapEventAction(props.config, props.editor, event.target.checked, dispatch)
  }

  const onchangeCopilotActivate = async (event) => {
    if (!event.target.checked) {
      copilotActivate(props.config, event.target.checked, dispatch)
      props.plugin.call('copilot-suggestion', 'uninstall')
      return
    }   
    const message = <div>Please wait while the copilot is downloaded. <span ref={copilotDownload}>0</span>/100 .</div>
    props.plugin.on('copilot-suggestion', 'loading', (data) => {
      if (!copilotDownload.current) return
      const loaded = ((data.loaded / data.total) * 100).toString()
      const dot = loaded.match(/(.*)\./g)
      copilotDownload.current.innerText = dot ? dot[0].replace('.', '') : loaded
    })
    const modalActivate: AppModal = {
      id: 'loadcopilotActivate',
      title: 'Download Solidity copilot',
      modalType: ModalTypes.default,
      okLabel: 'Close',
      message,
      okFn: async() => {
        props.plugin.off('copilot-suggestion', 'loading')
        if (await props.plugin.call('copilot-suggestion', 'status')) {
          copilotActivate(props.config, true, dispatch)          
        } else {
          props.plugin.call('copilot-suggestion', 'uninstall')
          copilotActivate(props.config, false, dispatch)
        }
      },
      hideFn: async () => {
        props.plugin.off('copilot-suggestion', 'loading')
        if (await props.plugin.call('copilot-suggestion', 'status')) {
          copilotActivate(props.config, true, dispatch)          
        } else {
          props.plugin.call('copilot-suggestion', 'uninstall')
          copilotActivate(props.config, false, dispatch)
        }
      }
    }
    props.plugin.call('copilot-suggestion', 'init')
    props.plugin.call('notification', 'modal', modalActivate)
    
  }

  const onchangeCopilotMaxNewToken = (event) => {
    copilotMaxNewToken(props.config, parseInt(event.target.value), dispatch)
  }

  const onchangeCopilotTemperature = (event) => {
    copilotTemperature(props.config, parseInt(event.target.value) / 100, dispatch)
  }

  const onchangePersonal = (event) => {
    personal(props.config, event.target.checked, dispatch)
  }

  const onchangeMatomoAnalytics = (event) => {
    useMatomoAnalytics(props.config, event.target.checked, dispatch)
  }

  const onchangeUseAutoComplete = (event) => {
    useAutoCompletion(props.config, event.target.checked, dispatch)
  }

  const onchangeShowGasInEditor = (event) => {
    useShowGasInEditor(props.config, event.target.checked, dispatch)
  }
  const onchangeDisplayErrors = (event) => {
    useDisplayErrors(props.config, event.target.checked, dispatch)
  }

  const getTextClass = (key) => {
    if (props.config.get(key)) {
      return textDark
    } else {
      return textSecondary
    }
  }

  const generalConfig = () => {
    const isMetadataChecked = props.config.get('settings/generate-contract-metadata') || false
    const isEditorWrapChecked = props.config.get('settings/text-wrap') || false
    const isPersonalChecked = props.config.get('settings/personal-mode') || false
    const isMatomoChecked = props.config.get('settings/matomo-analytics') || false

    const isAutoCompleteChecked = props.config.get('settings/auto-completion') || false
    const isShowGasInEditorChecked = props.config.get('settings/show-gas') || false
    const displayErrorsChecked = props.config.get('settings/display-errors') || false
    return (
      <div className="$border-top">
        <div className="d-flex justify-content-end pr-4">
          <button
            className="btn btn-sm btn-secondary ml-2"
            onClick={() => {
              try {
                if ((window as any).remixFileSystem.name === 'indexedDB') {
                  props.config.clear()
                  try {
                    localStorage.clear() // remove the whole storage
                  } catch (e) {
                    console.log(e)
                  }
                } else {
                  props.config.clear() // remove only the remix settings
                }
                refresh(resetState + 1)
              } catch (e) {
                console.log(e)
              }
            }}
          >
            <FormattedMessage id="settings.reset" />
          </button>
        </div>
        <div className="card-body pt-3 pb-2">
          <h6 className="card-title">
            <FormattedMessage id="settings.general" />
          </h6>
          <div className="mt-2 custom-control custom-checkbox mb-1">
            <input
              onChange={onchangeGenerateContractMetadata}
              id="generatecontractmetadata"
              data-id="settingsTabGenerateContractMetadata"
              type="checkbox"
              className="custom-control-input"
              name="contractMetadata"
              checked={isMetadataChecked}
            />
            <label
              className={`form-check-label custom-control-label align-middle ${getTextClass('settings/generate-contract-metadata')}`}
              data-id="settingsTabGenerateContractMetadataLabel"
              htmlFor="generatecontractmetadata"
            >
              <FormattedMessage id="settings.generateContractMetadataText" />
            </label>
          </div>
          <div className="mt-2 custom-control custom-checkbox mb-1">
            <input id="editorWrap" className="custom-control-input" type="checkbox" onChange={textWrapEvent} checked={isEditorWrapChecked} />
            <label className={`form-check-label custom-control-label align-middle ${getTextClass('settings/text-wrap')}`} htmlFor="editorWrap">
              <FormattedMessage id="settings.wordWrapText" />
            </label>
          </div>
          <div className="custom-control custom-checkbox mb-1">
            <input onChange={onchangeUseAutoComplete} id="settingsUseAutoComplete" type="checkbox" className="custom-control-input" checked={isAutoCompleteChecked} />
            <label
              className={`form-check-label custom-control-label align-middle ${getTextClass('settings/auto-completion')}`}
              data-id="settingsAutoCompleteLabel"
              htmlFor="settingsUseAutoComplete"
            >
              <span>
                <FormattedMessage id="settings.useAutoCompleteText" />
              </span>
            </label>
          </div>
          <div className="custom-control custom-checkbox mb-1">
            <input onChange={onchangeShowGasInEditor} id="settingsUseShowGas" type="checkbox" className="custom-control-input" checked={isShowGasInEditorChecked} />
            <label
              className={`form-check-label custom-control-label align-middle ${getTextClass('settings/show-gas')}`}
              data-id="settingsShowGasLabel"
              htmlFor="settingsUseShowGas"
            >
              <span>
                <FormattedMessage id="settings.useShowGasInEditorText" />
              </span>
            </label>
          </div>
          <div className="custom-control custom-checkbox mb-1">
            <input onChange={onchangeDisplayErrors} id="settingsDisplayErrors" type="checkbox" className="custom-control-input" checked={displayErrorsChecked} />
            <label
              className={`form-check-label custom-control-label align-middle ${getTextClass('settings/display-errors')}`}
              data-id="displayErrorsLabel"
              htmlFor="settingsDisplayErrors"
            >
              <span>
                <FormattedMessage id="settings.displayErrorsText" />
              </span>
            </label>
          </div>
          <div className="custom-control custom-checkbox mb-1">
            <input onChange={onchangePersonal} id="personal" type="checkbox" className="custom-control-input" checked={isPersonalChecked} />
            <label className={`form-check-label custom-control-label align-middle ${getTextClass('settings/personal-mode')}`} htmlFor="personal">
              <i className="fas fa-exclamation-triangle text-warning" aria-hidden="true"></i> <span> </span>
              <span> </span>
              <FormattedMessage id="settings.enablePersonalModeText" />
              &nbsp;
              <FormattedMessage id="settings.warnText" />
            </label>
          </div>
          <div className="custom-control custom-checkbox mb-1">
            <input onChange={onchangeMatomoAnalytics} id="settingsMatomoAnalytics" type="checkbox" className="custom-control-input" checked={isMatomoChecked} />
            <label className={`form-check-label custom-control-label align-middle ${getTextClass('settings/matomo-analytics')}`} htmlFor="settingsMatomoAnalytics">
              <span>
                <FormattedMessage id="settings.matomoAnalytics" />
              </span>
              <a href="https://medium.com/p/66ef69e14931/" target="_blank">
                {' '}
                <FormattedMessage id="settings.analyticsInRemix" />
              </a>{' '}
              <span>&</span>{' '}
              <a target="_blank" href="https://matomo.org/free-software">
                Matomo
              </a>
            </label>
          </div>
        </div>
      </div>
    )
  }

  // swarm settings
  const handleSavePrivateBeeAddress = useCallback(
    (event) => {
      setPrivateBeeAddress(event.target.value)
    },
    [privateBeeAddress]
  )

  const handleSavePostageStampId = useCallback(
    (event) => {
      setPostageStampId(event.target.value)
    },
    [postageStampId]
  )

  const saveSwarmSettings = () => {
    saveSwarmSettingsToast(props.config, dispatchToast, privateBeeAddress, postageStampId)
  }

  const swarmSettings = () => (
    <div className="border-top">
      <div className="card-body pt-3 pb-2">
        <h6 className="card-title">
          <FormattedMessage id="settings.swarm" />
        </h6>
        <div className="pt-2 pt-2 mb-0 pb-0">
          <label className="m-0">
            <FormattedMessage id="settings.privateBeeAddress" />:
          </label>
          <div className="text-secondary mb-0 h6">
            <input id="swarmprivatebeeaddress" data-id="settingsPrivateBeeAddress" className="form-control" onChange={handleSavePrivateBeeAddress} value={privateBeeAddress} />
          </div>
        </div>
        <div className="pt-2 mb-0 pb-0">
          <label className="m-0">
            <FormattedMessage id="settings.postageStampID" />:
          </label>
          <div className="text-secondary mb-0 h6">
            <input id="swarmpostagestamp" data-id="settingsPostageStampId" className="form-control" onChange={handleSavePostageStampId} value={postageStampId} />
            <div className="d-flex justify-content-end pt-2"></div>
          </div>
        </div>
        <div className="d-flex justify-content-end pt-2">
          <input
            className="btn btn-sm btn-primary ml-2"
            id="saveswarmsettings"
            data-id="settingsTabSaveSwarmSettings"
            onClick={() => saveSwarmSettings()}
            value={intl.formatMessage({id: 'settings.save'})}
            type="button"
            disabled={privateBeeAddress === ''}
          ></input>
        </div>
      </div>
    </div>
  )

  // ipfs settings

  const handleSaveIpfsProjectId = useCallback(
    (event) => {
      setipfsProjectId(event.target.value)
    },
    [ipfsProjectId]
  )

  const handleSaveIpfsSecret = useCallback(
    (event) => {
      setipfsProjectSecret(event.target.value)
    },
    [ipfsProjectSecret]
  )

  const handleSaveIpfsUrl = useCallback(
    (event) => {
      setipfsUrl(event.target.value)
    },
    [ipfsUrl]
  )

  const handleSaveIpfsPort = useCallback(
    (event) => {
      setipfsPort(event.target.value)
    },
    [ipfsPort]
  )

  const handleSaveIpfsProtocol = useCallback(
    (event) => {
      setipfsProtocol(event.target.value)
    },
    [ipfsProtocol]
  )

  const saveIpfsSettings = () => {
    saveIpfsSettingsToast(props.config, dispatchToast, ipfsUrl, ipfsProtocol, ipfsPort, ipfsProjectId, ipfsProjectSecret)
  }

  const isCopilotActivated = props.config.get('settings/copilot/suggest/activate') || false
  let copilotMaxnewToken = props.config.get('settings/copilot/suggest/max_new_tokens')
  if (!copilotMaxnewToken) {
    props.config.set('settings/copilot/suggest/max_new_tokens', 5)
    copilotMaxnewToken = 5
  }
  let copilotTemperatureValue = (props.config.get('settings/copilot/suggest/temperature')) * 100
  if (!copilotTemperatureValue) {
    props.config.set('settings/copilot/suggest/temperature', 0.5)
    copilotTemperatureValue = 0.5
  }

  if (isCopilotActivated) props.plugin.call('copilot-suggestion', 'init')
  const copilotSettings = () => (
    <div className="border-top">
      <div className="card-body pt-3 pb-2">
        <h6 className="card-title">
          <FormattedMessage id="settings.copilot" />
        </h6>

        <div className="pt-2 mb-0">
          <div className="text-secondary mb-0 h6">
            <div>
              <div className="custom-control custom-checkbox mb-1">
                <input onChange={onchangeCopilotActivate} id="copilot-activate" type="checkbox" className="custom-control-input" checked={isCopilotActivated} />
                <label className={`form-check-label custom-control-label align-middle ${getTextClass('settings/copilot/suggest/activate')}`} htmlFor="copilot-activate">
                  <FormattedMessage id="settings.copilot.activate" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 mb-0">
          <div className="text-secondary mb-0 h6">
            <div>
              <div className="mb-1">
                <label className={`form-check-label align-middle ${getTextClass('settings/copilot/suggest/max_new_tokens')}`} htmlFor="copilot-activate">
                  <FormattedMessage id="settings.copilot.max_new_tokens" /> - <span>{copilotMaxnewToken}</span>
                </label>
                <input onChange={onchangeCopilotMaxNewToken} id="copilot-max-new-token" value={copilotMaxnewToken} min='1' max='150' type="range" className="custom-range" />                
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 mb-0">
          <div className="text-secondary mb-0 h6">
            <div>
              <div className="mb-1">
                <label className={`form-check-label align-middle ${getTextClass('settings/copilot/suggest/temperature')}`} htmlFor="copilot-activate">
                  <FormattedMessage id="settings.copilot.temperature" /> - <span>{copilotTemperatureValue / 100}</span>
                </label>
                <input onChange={onchangeCopilotTemperature} id="copilot-temperature" value={copilotTemperatureValue} min='0' max='100' type="range" className="custom-range" />                
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )

  const ipfsSettings = () => (
    <div className="border-top">
      <div className="card-body pt-3 pb-2">
        <h6 className="card-title">
          <FormattedMessage id="settings.ipfs" />
        </h6>
        <div className="pt-2 mb-0">
          <label className="m-0">
            IPFS <FormattedMessage id="settings.host" />:
          </label>
          <div className="text-secondary mb-0 h6">
            <input placeholder="e.g. ipfs.infura.io" id="settingsIpfsUrl" data-id="settingsIpfsUrl" className="form-control" onChange={handleSaveIpfsUrl} value={ipfsUrl} />
          </div>
        </div>
        <div className="pt-2 mb-0 pb-0">
          <label className="m-0">
            IPFS <FormattedMessage id="settings.protocol" />:
          </label>
          <div className="text-secondary mb-0 h6">
            <input
              placeholder="e.g. https"
              id="settingsIpfsProtocol"
              data-id="settingsIpfsProtocol"
              className="form-control"
              onChange={handleSaveIpfsProtocol}
              value={ipfsProtocol}
            />
          </div>
        </div>
        <div className="pt-2 mb-0 pb-0">
          <label className="m-0">
            IPFS <FormattedMessage id="settings.port" />:
          </label>
          <div className="text-secondary mb-0 h6">
            <input placeholder="e.g. 5001" id="settingsIpfsPort" data-id="settingsIpfsPort" className="form-control" onChange={handleSaveIpfsPort} value={ipfsPort} />
          </div>
        </div>
        <div className="pt-2 mb-0 pb-0">
          <label className="m-0">
            IPFS <FormattedMessage id="settings.projectID" /> [ INFURA ]:
          </label>
          <div className="text-secondary mb-0 h6">
            <input id="settingsIpfsProjectId" data-id="settingsIpfsProjectId" className="form-control" onChange={handleSaveIpfsProjectId} value={ipfsProjectId} />
          </div>
        </div>
        <div className="pt-2 mb-0 pb-0">
          <label className="m-0">
            IPFS <FormattedMessage id="settings.projectSecret" /> [ INFURA ]:
          </label>
          <div className="text-secondary mb-0 h6">
            <input
              id="settingsIpfsProjectSecret"
              data-id="settingsIpfsProjectSecret"
              className="form-control"
              type="password"
              onChange={handleSaveIpfsSecret}
              value={ipfsProjectSecret}
            />
          </div>
        </div>
        <div className="d-flex justify-content-end pt-2">
          <input
            className="btn btn-sm btn-primary ml-2"
            id="saveIpfssettings"
            data-id="settingsTabSaveIpfsSettings"
            onClick={() => saveIpfsSettings()}
            value={intl.formatMessage({id: 'settings.save'})}
            type="button"
          ></input>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {state.message ? <Toaster message={state.message} /> : null}
      {generalConfig()}
      {copilotSettings()}
      <GithubSettings
        saveToken={(githubToken: string, githubUserName: string, githubEmail: string) => {
          saveTokenToast(props.config, dispatchToast, githubToken, 'gist-access-token')
          saveTokenToast(props.config, dispatchToast, githubUserName, 'github-user-name')
          saveTokenToast(props.config, dispatchToast, githubEmail, 'github-email')
        }}
        removeToken={() => {
          removeTokenToast(props.config, dispatchToast, 'gist-access-token')
          removeTokenToast(props.config, dispatchToast, 'github-user-name')
          removeTokenToast(props.config, dispatchToast, 'github-email')
        }}
        config={props.config}
      />
      <EtherscanSettings
        saveToken={(etherscanToken: string) => {
          saveTokenToast(props.config, dispatchToast, etherscanToken, 'etherscan-access-token')
        }}
        removeToken={() => {
          removeTokenToast(props.config, dispatchToast, 'etherscan-access-token')
        }}
        config={props.config}
      />
      <SindriSettings
        saveToken={(sindriToken: string) => {
          saveTokenToast(props.config, dispatchToast, sindriToken, 'sindri-access-token')
        }}
        removeToken={() => {
          removeTokenToast(props.config, dispatchToast, 'sindri-access-token')
        }}
        config={props.config}
      />
      {swarmSettings()}
      {ipfsSettings()}
      <RemixUiThemeModule themeModule={props._deps.themeModule} />
      <RemixUiLocaleModule localeModule={props._deps.localeModule} />      
    </div>
  )
}
