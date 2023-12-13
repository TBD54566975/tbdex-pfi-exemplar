import { DevTools, Rfq } from '@tbdex/http-client'

// this is fine hard coded for now, so long as it resolves to our FTL cluster http://localhost:8892/ingress
const PFI_DID = 'did:ion:EiDEhuIcZXZQzHj2sgsBzIlaYZjSDAQmlOJ9hkvfRbkwhw:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiRkxKalNBNi04R1RmOE1zMDMtTWhub2lLUTFQeHFDUWg3ZTJGck9MQTRFdyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6InBmaSIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODg5Mi9pbmdyZXNzIiwidHlwZSI6IlBGSSJ9XX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpQi1GQ21BV0kyNnRMOHIzQ1RHdkdUY25qanpMSUtwbmNobjhMRXFGTnozdFEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUFOaUdfMHM3MVp2VDBtbE9Kc0h3UVZ3REI4cDNILWp5c2xka3dIT0ZkNWZBIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlCSlI1cklOaDQyTXRGTGRIR2lTUlVBdkJHZ3BxOVNlcU9vMWJkYV9iT1ZhQSJ9fQ'

// this is fine to create each time
const issuer = await DevTools.createDid()

// this is also fine to create each time
const alice = await DevTools.createDid()
const { privateKeyJwk } = alice.keySet.verificationMethodKeys[0]
const kid = alice.document.verificationMethod[0].id

const getOfferings = async () => {
  const res = await fetch('http://localhost:8892/ingress/offerings')
  const body = await res.json()
  const offerings = JSON.parse(body.offerings)
  return offerings[0].metadata.id
}

const submitRfq = async (offeringId) => {
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
}

getOfferings()
  .then(submitRfq)
  .then(() => console.log('Success!'))
