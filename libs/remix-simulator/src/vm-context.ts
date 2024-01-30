/* global ethereum */
'use strict'
import { hash } from '@remix-project/remix-lib'
import { bytesToHex } from '@ethereumjs/util'
import { decode } from 'rlp'
import { ethers } from 'ethers'
import { execution } from '@remix-project/remix-lib'
const { LogsManager } = execution
import { VmProxy } from './VmProxy'
import { VM } from '@ethereumjs/vm'
import { Common, ConsensusType } from '@ethereumjs/common'
import { Trie } from '@ethereumjs/trie'
import { DefaultStateManager, EthersStateManager } from '@ethereumjs/statemanager'
import { EVMStateManagerInterface, StorageDump } from '@ethereumjs/common'
import { EVM } from '@ethereumjs/evm'
import { Blockchain } from '@ethereumjs/blockchain'
import { Block } from '@ethereumjs/block'
import { TypedTransaction } from '@ethereumjs/tx'
import { bigIntToHex } from '@ethereumjs/util'

/**
 * Options for constructing a {@link StateManager}.
 */
export interface DefaultStateManagerOpts {
  /**
   * A {@link Trie} instance
   */
  trie?: Trie
  /**
   * Option to prefix codehashes in the database. This defaults to `true`.
   * If this is disabled, note that it is possible to corrupt the trie, by deploying code
   * which code is equal to the preimage of a trie-node.
   * E.g. by putting the code `0x80` into the empty trie, will lead to a corrupted trie.
   */
  prefixCodeHashes?: boolean
}

/*
  extend vm state manager and instantiate VM
*/
class StateManagerCommonStorageDump extends DefaultStateManager {
  keyHashes: { [key: string]: string }
  constructor (opts: DefaultStateManagerOpts = {}) {
    super(opts)
    this.keyHashes = {}
  }

  putContractStorage (address, key, value) {
    this.keyHashes[bytesToHex(hash.keccak(key))] = bytesToHex(key)
    return super.putContractStorage(address, key, value)
  }

  copy(): StateManagerCommonStorageDump {
    const copyState =  new StateManagerCommonStorageDump({
      trie: this._trie.shallowCopy(false),
    })
    copyState.keyHashes = this.keyHashes
    return copyState
  }

  async dumpStorage (address): Promise<StorageDump> {
    return new Promise((resolve, reject) => {
      try {
        const trie = this._getStorageTrie(address)
        const storage = {}
        const stream = trie.createReadStream()

        stream.on('data', (val) => {
          const value: any = decode(val.value)
          const hexVal = bytesToHex(val.key)
          storage[hexVal] = {
            key: this.keyHashes[hexVal.replace('0x', '')],
            value: bytesToHex(value)
          }
        })
        stream.on('end', () => {
          resolve(storage)
        })
      } catch (e) {
        reject(e)
      }
    })
  }
}

export type CurrentVm = {
  vm: VM,
  web3vm: VmProxy,
  stateManager: EVMStateManagerInterface,
  common: Common
}

export class VMCommon extends Common {}

/*
  trigger contextChanged, web3EndpointChanged
*/
export class VMContext {
  currentFork: string
  blockGasLimitDefault: number
  blockGasLimit: number
  blocks: Record<string, Block>
  latestBlockNumber: string
  blockByTxHash: Record<string, Block>
  txByHash: Record<string, TypedTransaction>
  currentVm: CurrentVm
  web3vm: VmProxy
  logsManager: any // LogsManager 
  exeResults: Record<string, TypedTransaction>
  nodeUrl: string
  blockNumber: number | 'latest'

  constructor (fork?: string, nodeUrl?: string, blockNumber?: number | 'latest') {
    this.blockGasLimitDefault = 4300000
    this.blockGasLimit = this.blockGasLimitDefault
    this.currentFork = fork || 'merge'
    this.nodeUrl = nodeUrl
    this.blockNumber = blockNumber
    this.blocks = {}
    this.latestBlockNumber = "0x0"
    this.blockByTxHash = {}
    this.txByHash = {}
    this.exeResults = {}
    this.logsManager = new LogsManager()
  }

  async init () {
    this.currentVm = await this.createVm(this.currentFork)
  }

  async createVm (hardfork) {
    let stateManager: EVMStateManagerInterface
    if (this.nodeUrl) {
      let block = this.blockNumber
      if (this.blockNumber === 'latest') {
        const provider = new ethers.providers.StaticJsonRpcProvider(this.nodeUrl)
        block = await provider.getBlockNumber()
        stateManager = new EthersStateManager({
          provider: this.nodeUrl,
          blockTag: BigInt(block)
        })
        this.blockNumber = block
      } else {
        stateManager = new EthersStateManager({
          provider: this.nodeUrl,
          blockTag: BigInt(this.blockNumber)
        })
      }
      
    } else
      stateManager = new StateManagerCommonStorageDump()

    const consensusType = hardfork === 'berlin' || hardfork === 'london' ? ConsensusType.ProofOfWork : ConsensusType.ProofOfStake
    const difficulty = consensusType === ConsensusType.ProofOfStake ? 0 : 69762765929000

    const common = new VMCommon({ chain: 'mainnet', hardfork })
    const genesisBlock: Block = Block.fromBlockData({
      header: {
        timestamp: (new Date().getTime() / 1000 | 0),
        number: 0,
        coinbase: '0x0e9281e9c6a0808672eaba6bd1220e144c9bb07a',
        difficulty,
        gasLimit: 8000000
      }
    }, { common })

    const blockchain = await Blockchain.create({ common, validateBlocks: false, validateConsensus: false, genesisBlock })
    const evm = new EVM({ common, allowUnlimitedContractSize: true })
    
    const vm = await VM.create({
      common,
      activatePrecompiles: true,
      stateManager,
      blockchain,
      evm
    })

    // VmProxy and VMContext are very intricated.
    // VmProxy is used to track the EVM execution (to listen on opcode execution, in order for instance to generate the VM trace)
    const web3vm = new VmProxy(this)
    web3vm.setVM(vm)
    this.addBlock(genesisBlock, true)
    return { vm, web3vm, stateManager, common }
  }

  getCurrentFork () {
    return this.currentFork
  }

  web3 () {
    return this.currentVm.web3vm
  }

  vm () {
    return this.currentVm.vm
  }

  vmObject () {
    return this.currentVm
  }

  addBlock (block: Block, genesis?: boolean, isCall?: boolean) {
    let blockNumber = bigIntToHex(block.header.number)
    if (blockNumber === '0x') {
      blockNumber = '0x0'
    }

    this.blocks[bytesToHex(block.hash())] = block
    this.blocks[blockNumber] = block
    this.latestBlockNumber = blockNumber

    if (!isCall && !genesis) this.logsManager.checkBlock(blockNumber, block, this.web3())
  }

  trackTx (txHash, block, tx) {
    this.blockByTxHash[txHash] = block
    this.txByHash[txHash] = tx
  }

  trackExecResult (tx, execReult) {
    this.exeResults[tx] = execReult
  }
}
