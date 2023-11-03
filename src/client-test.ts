import { TbdexHttpClient, DevTools, Rfq } from '@tbdex/http-client'
import fs from 'fs/promises'

//
//
// Replace this with the DID of the PFI you want to connect to.
// Get this from the console of the server once you launch it.
//
const PFI_DID = 'did:ion:EiDgs_F6pK672qmdJP2n8-LY4MjhPSehDl1I6y1nfrSW3g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiNnpYZ3VBZW1XZHBDYVVkYjE2Rjl4czFmU3JBUEZ2MmZlcFE0SGJoM2QxNCJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6InBmaSIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHA6Ly9sb2NhbGhvc3Q6OTAwMCIsInR5cGUiOiJQRkkifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUJOV21uNlV1c3hrczBTalhPTzBSUUZVbnR3dGxzczFjLVlBTFpJQ01BQUNBIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlEOU50cWVXbzNMOXNJdHBRRHQzazlIaEVpcDhZMk9UZk00QWJCTFNXeWpmZyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQUxqei1rNWtaZlBmQTJEWUcwY2V1Rk9tbGhUN0VDM1F0ZUVxR2tOeXM0cFEifX0'

//
//
//  Connect to the PFI and get the list of offerings (offerings are resources - anyone can ask for them)
//
const { data } = await TbdexHttpClient.getOfferings({ pfiDid: PFI_DID })
const [ offering ] = data
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


const { privateKeyJwk } = alice.keySet.verificationMethodKeys[0]
const kid = alice.document.verificationMethod[0].id

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

//
//
// All interaction with the PFI happens in the context of an exchange.
// This is where for example a quote would show up in result to an RFQ.
const exchanges = await TbdexHttpClient.getExchanges({
  pfiDid: PFI_DID,
  filter: { id: rfq.exchangeId },
  privateKeyJwk,
  kid
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
      const did = await DevTools.createDid()
      await fs.writeFile(filename, JSON.stringify(did, null, 2))
      return did
    }
    console.error('Error reading from file:', error)
  }
}