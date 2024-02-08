import { PortableDid } from '@web5/dids'
import { createOrLoadDid } from './utils.js'
import { VerifiableCredential } from '@web5/credentials'


// get the did from the command line parameter
const customerDid: string = process.argv[2]

const issuer : PortableDid = await createOrLoadDid('issuer.json')

//
// At this point we can check if the user is sanctioned or not and decide to issue the credential.
// TOOD: implement the actual sanctions check!


//
//
// Create a sanctions credential so that the PFI knows that Alice is legit.
//
const vc = await VerifiableCredential.create({
  type    : 'SanctionCredential',
  issuer  : issuer.did,
  subject : customerDid,
  data    : {
    'beep': 'boop'
  }
})

const vcJwt = await vc.sign({ did: issuer})

console.log('Copy this signed credential for later use:\n\n', vcJwt)



