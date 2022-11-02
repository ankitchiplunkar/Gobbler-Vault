import { formatEther } from '@ethersproject/units'
import { useEtherBalance, useEthers, useTokenBalance } from '@usedapp/core'
import { Container, ContentBlock, ContentRow, MainContent, Section, SectionRow } from '../components/base/base'
import { Button } from '../components/base/Button'
import { Label } from '../typography/Label'
import { TextInline } from '../typography/Text'
import { Title } from '../typography/Title'
import { feiAddress, usdcAddress, addressList } from '../components/Constants'

export function Balance() {
  const { activateBrowserWallet, deactivate, account } = useEthers()
  const userBalance = useEtherBalance(account)
  const feiBalance = useTokenBalance(feiAddress, account)
  const usdcBalance = useTokenBalance(usdcAddress, account)
  const lFei1Balance = useTokenBalance(addressList["1"], account)
  const lFei95Balance = useTokenBalance(addressList["0.95"], account)
  const lFei09Balance = useTokenBalance(addressList["0.9"], account)
  const lFei85Balance = useTokenBalance(addressList["0.85"], account)
  const lFei08Balance = useTokenBalance(addressList["0.8"], account)
  const lFei75Balance = useTokenBalance(addressList["0.75"], account)


  return (
    <MainContent>
      <Container>
        <Section>
          <SectionRow>
            <Title>User Balances</Title>
            {account ? (
              <Button onClick={() => deactivate()}>Disconnect</Button>
            ) : (
                <Button onClick={() => activateBrowserWallet()}>Connect</Button>
              )}
          </SectionRow>
          <ContentBlock>
            {account && (
              <ContentRow>
                <Label>Account:</Label> <TextInline>{account}</TextInline>
              </ContentRow>
            )}
            {userBalance && (
              <ContentRow>
                <Label>Ether balance:</Label> <TextInline>{formatEther(userBalance)}</TextInline> <Label>ETH</Label>
              </ContentRow>
            )}
          </ContentBlock>

          <SectionRow>
            <Title>Pool Actions</Title>
          </SectionRow>
        </Section>
      </Container>
    </MainContent>
  )
}
