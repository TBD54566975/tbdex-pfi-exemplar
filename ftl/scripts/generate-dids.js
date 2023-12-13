import fs from 'node:fs'
import { DevTools } from '@tbdex/http-client'

const pfi = await DevTools.createDid()
const issuer = await DevTools.createDid()
const client = await DevTools.createDid()

const dids = {
  pfi: {
    uri: pfi.did,
    privateKeyJwk: pfi.keySet.verificationMethodKeys[0].privateKeyJwk,
    kid: pfi.document.verificationMethod[0].id
  },
  issuer: {
    uri: issuer.did,
    privateKeyJwk: issuer.keySet.verificationMethodKeys[0].privateKeyJwk,
    kid: issuer.document.verificationMethod[0].id
  },
  client: {
    uri: client.did,
    privateKeyJwk: client.keySet.verificationMethodKeys[0].privateKeyJwk,
    kid: client.document.verificationMethod[0].id
  }
}

fs.writeFileSync('dids.json', JSON.stringify(dids, null, 2))
