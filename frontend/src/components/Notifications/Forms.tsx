import type { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import type { Web3Provider } from '@ethersproject/providers'
import { formatEther, formatUnits } from '@ethersproject/units'
import { useContractCall, useContractFunction, useTokenAllowance } from '@usedapp/core'
import { utils } from 'ethers'
import { useState } from 'react'
import styled from 'styled-components'
import { TextBold } from '../../typography/Text'
import { SectionRow, ContentBlock, ContentRow } from '../base/base'
import { Button } from '../base/Button'
import LFeiPool from '../../abi/LFei.json'
import ERC20 from '../../abi/ERC20.json'
import { feiAddress, usdcAddress } from '../Constants'
import { useTokenBalance } from '@usedapp/core'

const feiInterface = new utils.Interface(ERC20.abi)
const lFeiInterface = new utils.Interface(LFeiPool)

interface InteractFeiProps {
  poolAddress: string
  account: string
  library: Web3Provider
}


export const ApproveFei = ({ poolAddress, account, library }: InteractFeiProps) => {
  const contract = new Contract(feiAddress, feiInterface, library.getSigner())
  const { send } = useContractFunction(contract, 'approve')
  const [value, setValue] = useState('0')
  return (
    <SectionRow>
      <label>Approve Fei (approve the amount you want to deposit)</label>
      <Input type="number" step="1" value={value} onChange={(e) => setValue(e.currentTarget.value)} />
      <SmallButton
        onClick={(e) => {
          send(poolAddress, utils.parseEther(value))
          setValue('0')
        }}
      >
        Approve
        </SmallButton>
    </SectionRow>
  )
}


export const DepositFei = ({ poolAddress, account, library }: InteractFeiProps) => {
  const contract = new Contract(poolAddress, lFeiInterface, library.getSigner())
  const { send } = useContractFunction(contract, 'depositFei')
  const [value, setValue] = useState('0')
  const tokenAllowance = useTokenAllowance(feiAddress, account, poolAddress)
  return (
    <SectionRow>
      {tokenAllowance && <label>Deposit Fei in Pool (can deposit {formatEther(tokenAllowance)})</label>}
      <Input type="number" step="1" value={value} onChange={(e) => setValue(e.currentTarget.value)} />
      <SmallButton
        onClick={(e) => {
          send(utils.parseEther(value))
          setValue('0')
        }}
      >
        Deposit
        </SmallButton>
    </SectionRow>
  )
}

export const WithdrawFei = ({ poolAddress, account, library }: InteractFeiProps) => {
  const contract = new Contract(poolAddress, lFeiInterface, library.getSigner())
  const { send } = useContractFunction(contract, 'withdrawFei')
  const [value, setValue] = useState('0')
  const [withdrawableFei] = useContractCall({
    abi: lFeiInterface,
    address: poolAddress,
    method: "withdrawableFei",
    args: [account]
  }) ?? []
  return (
    <SectionRow>
      {withdrawableFei && <label>Withdraw Fei from Pool (can withdraw {formatEther(withdrawableFei)})</label>}
      <Input type="number" step="1" value={value} onChange={(e) => setValue(e.currentTarget.value)} />
      <SmallButton
        onClick={(e) => {
          send(utils.parseEther(value))
          setValue('0')
        }}
      >
        Withdraw
        </SmallButton>
    </SectionRow>
  )
}

export const WithdrawUSDC = ({ poolAddress, account, library }: InteractFeiProps) => {
  const contract = new Contract(poolAddress, lFeiInterface, library.getSigner())
  const { send } = useContractFunction(contract, 'withdrawUSDC')
  const [value, setValue] = useState('0')
  const [withdrawableUSDC] = useContractCall({
    abi: lFeiInterface,
    address: poolAddress,
    method: "withdrawableUSDC",
    args: [account]
  }) ?? []
  
  return (
    <SectionRow>
      {withdrawableUSDC && <label>Withdraw USDC from Pool (can withdraw {formatUnits(withdrawableUSDC, 6)})</label>}
      <Input type="number" step="1" value={value} onChange={(e) => setValue(e.currentTarget.value)} />
      <SmallButton
        onClick={(e) => {
          send(utils.parseUnits(value, 6))
          setValue('0')
        }}
      >
        Withdraw
        </SmallButton>
    </SectionRow>
  )
}

const SmallButton = styled(Button)`
  min-width: unset;
  height: unset;
  padding: 5px 20px;
`

const Input = styled.input`
  margin-left: 10px;
  padding: 4px;
`

const CellTitle = styled(TextBold)`
  font-size: 20px;
  margin-bottom: 10px;
`
