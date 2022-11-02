import { Interface } from '@ethersproject/abi'
import ERC20 from './ERC20.json'
import ArtGobblers from './ArtGobblers.json'

const IERC20Interface = new Interface(ERC20.abi)

export { ERC20, IERC20Interface }

const ArtGobblersInterface = new Interface(ArtGobblers.abi)

export { ArtGobblers, ArtGobblersInterface }