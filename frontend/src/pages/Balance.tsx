import { formatEther, formatUnits } from '@ethersproject/units'
import { useEtherBalance, useEthers } from '@usedapp/core'
import { Container, ContentBlock, ContentRow, MainContent, Section, SectionRow } from '../components/base/base'
import { Button } from '../components/base/Button'
import { Label } from '../typography/Label'
import { TextInline } from '../typography/Text'
import { Title } from '../typography/Title'
import { useGooBalance, useUserEmissionMultiple } from '../components/hooks'

export function Balance() {
  const { activateBrowserWallet, deactivate, account } = useEthers()
  const userVirtualGooBalance = useGooBalance(account)
  const userEmissionMultiple = useUserEmissionMultiple(account)

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
            {userVirtualGooBalance && (
              <ContentRow>
                <Label>Virtual Goo balance:</Label> <TextInline>{formatEther(userVirtualGooBalance)}</TextInline> <Label>GOO</Label>
              </ContentRow>            
            )}
            {userEmissionMultiple && (
              <ContentRow>
                <Label>Emission multiple:</Label> <TextInline>{formatUnits(userEmissionMultiple, 0)}</TextInline> 
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
