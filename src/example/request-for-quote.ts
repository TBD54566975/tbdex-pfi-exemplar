import { TbdexHttpClient, Rfq, Quote, Order } from '@tbdex/http-client'
import { createOrLoadDid } from './utils.js'

//
// get the PFI did from the command line parameter
//
const pfiDid = process.argv[2]
if (!pfiDid) {
  console.error('Please put in the DID of the PFI as the first parameter')
  process.exit(1)
}


const signedCredential = process.argv[3]
if (!signedCredential) {
  console.error('Please put in the signed credential as the second parameter')
  process.exit(1)
}

//
//  Connect to the PFI and get the list of offerings (offerings are resources - anyone can ask for them)
//
const { data } = await TbdexHttpClient.getOfferings({ pfiDid: pfiDid })
const [ offering ] = data
//console.log('offering:', JSON.stringify(offering, null, 2))


//
// Load alice's private key to sign RFQ
//
const alice = await createOrLoadDid('alice.json')
const { privateKeyJwk } = alice.keySet.verificationMethodKeys[0]
const kid = alice.document.verificationMethod[0].id



//
// And here we go with tbdex-protocol!
//
const rfq = Rfq.create({
  metadata: { from: alice.did, to: pfiDid },
  data: {
    offeringId: offering.id,
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

const rasp = await TbdexHttpClient.sendMessage({ message: rfq })
console.log('send rfq response', JSON.stringify(rasp, null, 2))

//console.log(rasp)

//
//
// All interaction with the PFI happens in the context of an exchange.
// This is where for example a quote would show up in result to an RFQ.
const exchanges = await TbdexHttpClient.getExchanges({
  pfiDid: pfiDid,
  filter: { id: rfq.exchangeId },
  privateKeyJwk,
  kid
})


const [ exchange ] = exchanges.data

for (const message of exchange) {
  if (message instanceof Quote) {
    console.log('we have a quote')
    const quote = message as Quote

    // place an order against that quote
    const order = Order.create({
      metadata: { from: alice.did, to: pfiDid, exchangeId: quote.exchangeId },
    })
    await order.sign(privateKeyJwk, kid)
    const orderResponse = await TbdexHttpClient.sendMessage({ message: order })
    console.log('orderResponse', orderResponse)

  }
}




