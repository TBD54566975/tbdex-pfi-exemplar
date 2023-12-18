import { DevTools, Order, Rfq } from '@tbdex/http-client'

// this is fine hard coded for now
const PFI_DID = 'did:key:z6MkjNMRmdDYN8ZK4GcLwokmcHy7edsUzea5uBaebZLVeYNM'

// this is fine to create each time
const issuer = await DevTools.createDid()

// this is also fine to create each time
const alice = await DevTools.createDid()
const { privateKeyJwk } = alice.keySet.verificationMethodKeys[0]
const kid = alice.document.verificationMethod[0].id

const getOfferings = async () => {
  console.log('Getting offerings...')

  const res = await fetch('http://localhost:8892/ingress/offerings')
  const body = await res.json()
  const offerings = JSON.parse(body.offerings)
  return offerings[0].metadata.id
}

const submitRfq = async (offeringId) => {
  console.log('Submitting RFQ...')

  const { signedCredential } = await DevTools.createCredential({
    type    : 'SanctionCredential',
    issuer  : issuer,
    subject : alice.did,
    data    : {
      'beep': 'boop'
    }
  })

  const rfq = Rfq.create({
    metadata: { from: alice.did, to: PFI_DID },
    data: {
      offeringId: offeringId,
      payinSubunits: '100',
      payinMethod: {
        kind: 'DEBIT_CARD',
        paymentDetails: {
          cvv: '123',
          cardNumber: '1234567890123456789',
          expiryDate: '10/23',
          cardHolderName: 'Ephraim Mcgilacutti'
        }
      },
      payoutMethod: {
        kind: 'BTC_ADDRESS',
        paymentDetails: {
          btcAddress: '0x1234567890'
        }
      },
      claims: [signedCredential]
    }
  })
  await rfq.sign(privateKeyJwk, kid)

  const res = await fetch(`http://localhost:8892/ingress/exchanges/${rfq.metadata.exchangeId}/rfq`, {
    method: 'POST',
    body: JSON.stringify({
      rfq: JSON.stringify(rfq)
    })
  })
  if (!res.ok) throw Error('Failed to submit rfq')

  return rfq.exchangeId
}

const getQuote = async (exchangeId) => {
  console.log('Getting Quote...')

  const res = await fetch('http://localhost:8892/ingress/exchanges')
  if (!res.ok) throw Error('Failed to get quote', res.status)

  const body = await res.json()
  const exchanges = JSON.parse(body.exchanges)
  const quote = exchanges.find(x => x[0].metadata.exchangeId === exchangeId).find(x => x.metadata.kind === 'quote')

  return quote.metadata.exchangeId
}

const submitOrder = async (exchangeId) => {
  console.log('Submitting Order...')

  const order = Order.create({
    metadata: { from: alice.did, to: PFI_DID, exchangeId }
  })
  await order.sign(privateKeyJwk, kid)

  const res = await fetch(`http://localhost:8892/ingress/exchanges/${order.metadata.exchangeId}/order`, {
    method: 'POST',
    body: JSON.stringify({
      order: JSON.stringify(order)
    })
  })
  if (!res.ok) throw Error('Failed to submit rfq')

  return order.exchangeId
}

const getOrderStatus = async (exchangeId) => {
  console.log('Getting OrderStatus...')

  const res = await fetch('http://localhost:8892/ingress/exchanges')
  if (!res.ok) throw Error('Failed to get quote', res.status)

  const body = await res.json()
  const exchanges = JSON.parse(body.exchanges)
  const orderStatus = exchanges.find(x => x[0].metadata.exchangeId === exchangeId).find(x => x.metadata.kind === 'orderstatus')

  console.log('OrderStatus:', orderStatus.data.orderStatus)
}

getOfferings()
  .then(submitRfq)
  .then(getQuote)
  .then(submitOrder)
  .then(getOrderStatus)
  .then(() => console.log('Success!'))
