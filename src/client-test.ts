import { TbdexHttpClient, DevTools, Rfq } from '@tbdex/http-client'
import { DidDhtMethod } from '@web5/dids'
import fs from 'fs/promises'

//
//
// Replace this with the DID of the PFI you want to connect to.
// Get this from the console of the server once you launch it.
//

// load server-did (this will be created when you run server did, or you can copy/paste one):
let PFI_DID = await fs.readFile('server-did.txt', 'utf-8')


//
//
//  Connect to the PFI and get the list of offerings (offerings are resources - anyone can ask for them)
//
const [ offering ] = await TbdexHttpClient.getOfferings({ pfiDid: PFI_DID })
//console.log('offering', JSON.stringify(offering, null, 2))


//
//
// Create a did for the issuer of the SanctionCredential. In the real world this would be an external service.
// But here we will just create one.
// Copy the issuer did into the seed-offerings.ts file and run:
//    npm run seed-offerings to seed the PFI with the issuer DID.
//
// This means that the PFI will trust SanctionsCredentials issued by this faux issuer.
const issuer = await createOrLoadDid('issuer.json')
console.log('issuer did:', issuer.did)


//
//
// Create a did for Alice, who is the customer of the PFI in this case.
const alice = await createOrLoadDid('alice.json')

//
//
// Create a sanctions credential so that the PFI knows that Alice is legit.
// This is normally done by a third party.
const { signedCredential } = await DevTools.createCredential({
  type    : 'SanctionCredential',
  issuer  : issuer,
  subject : alice.did,
  data    : {
    'beep': 'boop'
  }
})

//
//
// And here we go with tbdex-protocol!
const rfq = Rfq.create({
  metadata: { from: alice.did, to: PFI_DID },
  data: {
    offeringId: offering.id,
    payinAmount: '100.00',
    payinMethod: {
      kind: 'USD_LEDGER',
      paymentDetails: {}
    },
    payoutMethod: {
      kind: 'BANK_FIRSTBANK',
      paymentDetails: {
        accountNumber: '0x1234567890',
        reason: 'I got kids'
      }
    },
    claims: [signedCredential]
  }
})

await rfq.sign(alice)

const rasp = await TbdexHttpClient.sendMessage({ message: rfq })
console.log('send rfq response', JSON.stringify(rasp, null, 2))

//
//
// All interaction with the PFI happens in the context of an exchange.
// This is where for example a quote would show up in result to an RFQ.
const exchanges = await TbdexHttpClient.getExchanges({
  pfiDid: PFI_DID,
  did: alice,
  filter: { id: rfq.exchangeId }
})

console.log('exchanges', JSON.stringify(exchanges, null, 2))


// utility function
async function createOrLoadDid(filename: string) {

  // Check if the file exists
  try {
    const data = await fs.readFile(filename, 'utf-8')
    console.log('loading from file')
    return JSON.parse(data)
  } catch (error) {
    // If the file doesn't exist, generate a new DID
    if (error.code === 'ENOENT') {
      const did = await DidDhtMethod.create({ publish: true })
      await fs.writeFile(filename, JSON.stringify(did, null, 2))
      return did
    }
    console.error('Error reading from file:', error)
  }
}