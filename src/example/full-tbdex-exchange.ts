import {
  TbdexHttpClient,
  Rfq,
  Quote,
  Order,
  OrderStatus,
  Close,
} from '@tbdex/http-client'
import { createOrLoadDid } from './utils.js'
import { BearerDid } from '@web5/dids'
import { ErrorDetail, Message, Parser, RequestError, ResponseError } from '@tbdex/http-server'
import queryString from 'query-string'

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
const [offering] = await TbdexHttpClient.getOfferings({ pfiDid: pfiDid })
console.log('got offering:', JSON.stringify(offering, null, 2))

//
// Load alice's private key to sign RFQ
//
const alice = await createOrLoadDid('alice.json')

//
// And here we go with tbdex-protocol!
//

// First, Create an RFQ
const rfq = Rfq.create({
  metadata: { from: alice.uri, to: pfiDid, protocol: '1.0' },
  data: {
    offeringId: offering.id,
    payin: {
      kind: 'USD_LEDGER',
      amount: '100.00',
      paymentDetails: {},
    },
    payout: {
      kind: 'BANK_FIRSTBANK',
      paymentDetails: {
        accountNumber: '0x1234567890',
        reason: 'I got kids',
      },
    },
    claims: [signedCredential],
  },
})

await rfq.sign(alice)

try {
  await TbdexHttpClient.createExchange(rfq, { replyTo: alice.uri })
} catch (error) {
  console.log('Can\'t create:', error)
}
// await TbdexHttpClient.createExchange(rfq, { replyTo: alice.uri });
console.log('sent RFQ: ', JSON.stringify(rfq, null, 2))

let quote

//Wait for Quote message to appear in the exchange
while (!quote) {
  const exchange = await getExchange({
    pfiDid: rfq.metadata.to,
    did: alice,
    exchangeId: rfq.exchangeId
  })

  quote = exchange.find(msg => msg instanceof Quote)

  if (!quote) {
    // Wait 2 seconds before making another request
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

//
//
// All interaction with the PFI happens in the context of an exchange.
// This is where for example a quote would show up in result to an RFQ:
const exchanges = await getExchanges({
  pfiDid: pfiDid,
  did: alice,
  filter: { id: rfq.exchangeId },
})

console.log('got exchanges:', JSON.stringify(exchanges, null, 2))
//
// Now lets get the quote out of the returned exchange
//
const [exchange] = exchanges

for (const message of exchange) {
  if (message instanceof Quote) {
    const quote = message as Quote
    console.log('we have received a quote!', JSON.stringify(quote, null, 2))

    // Place an order against that quote:
    const order = Order.create({
      metadata: {
        from: alice.uri,
        to: pfiDid,
        exchangeId: quote.exchangeId,
        protocol: '1.0',
      },
    })
    await order.sign(alice)
    await TbdexHttpClient.submitOrder(order)
    console.log('Sent order: ', JSON.stringify(order, null, 2))

    // poll for order status updates
    await pollForStatus(order, pfiDid, alice)
  }
}

/*
 * This is a very simple polling function that will poll for the status of an order.
 */
async function pollForStatus(order: Order, pfiDid: string, did: BearerDid) {
  let close: Close
  while (!close) {
    const exchanges = await getExchanges({
      pfiDid: pfiDid,
      did: did,
      filter: { id: order.exchangeId },
    })

    const [exchange] = exchanges

    for (const message of exchange) {
      if (message instanceof OrderStatus) {
        console.log('we got a new order status')
        const orderStatus = message as OrderStatus
        console.log('orderStatus', JSON.stringify(orderStatus, null, 2))
      } else if (message instanceof Close) {
        console.log('we have a close message')
        close = message as Close
        console.log('close', JSON.stringify(close, null, 2))
        return close
      }
    }
  }
}



async function getExchange(opts: { pfiDid: string; exchangeId: string; did: any }): Promise<Message[]> {
  const { pfiDid, exchangeId, did } = opts

  const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
  const apiRoute = `${pfiServiceEndpoint}/exchanges/${exchangeId}`
  const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: did, pfiDid })

  let response: Response
  try {
    response = await fetch(apiRoute, {
      headers: {
        authorization: `Bearer ${requestToken}`
      }
    })
  } catch (e) {
    throw new RequestError({ message: `Failed to get exchange from ${pfiDid}`, recipientDid: pfiDid, url: apiRoute, cause: e })
  }

  const messages: Message[] = []

  if (!response.ok) {
    const errorDetails = await response.json() as ErrorDetail[]
    throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
  }

  const responseBody = await response.json()
  const exchangeData = responseBody.data
  for (let jsonMessage of [exchangeData.rfq, exchangeData.quote, ...exchangeData.orderstatus]) {
    if (jsonMessage) {
      const message = await Parser.parseMessage(jsonMessage)
      messages.push(message)
    }
  }

  return messages
}

//
//
//
//
//
//
//
//
/** IMPORTANT the following code is to patch over: https://github.com/TBD54566975/tbdex-js/issues/236  */
//
//
//
//
//
//
//
//

async function getExchanges(opts: { pfiDid: string; filter?: { id: string | string[] }; did: any }): Promise<Message[][]> {

  const { pfiDid, filter, did } = opts

  const pfiServiceEndpoint = await TbdexHttpClient.getPfiServiceEndpoint(pfiDid)
  const queryParams = filter ? `?${queryString.stringify(filter)}` : ''
  const apiRoute = `${pfiServiceEndpoint}/exchanges${queryParams}`
  const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: did, pfiDid })

  let response: Response
  try {
    response = await fetch(apiRoute, {
      headers: {
        authorization: `Bearer ${requestToken}`
      }
    })
  } catch (e) {
    throw new RequestError({ message: `Failed to get exchanges from ${pfiDid}`, recipientDid: pfiDid, url: apiRoute, cause: e })
  }

  const exchanges: Message[][] = []

  if (!response.ok) {
    const errorDetails = await response.json() as ErrorDetail[]
    throw new ResponseError({ statusCode: response.status, details: errorDetails, recipientDid: pfiDid, url: apiRoute })
  }

  const responseBody = await response.json() as { data: any[] }
  for (let exchangeData of responseBody.data) {
    const exchange: Message[] = []

    for (let jsonMessage of [exchangeData.rfq, exchangeData.quote, ...exchangeData.orderstatus]) {
      if (jsonMessage) {
        const message = await Parser.parseMessage(jsonMessage)
        exchange.push(message)
      }
    }

    exchanges.push(exchange)
  }

  return exchanges
}
