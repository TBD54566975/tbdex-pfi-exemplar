import "./polyfills.js";

import { Postgres, OfferingRepository } from "./db/index.js";
import { Offering } from "@tbdex/http-server";
import { config } from "./config.js";

await Postgres.connect();
// await Postgres.ping()
await Postgres.clear();

const offering = Offering.create({
  metadata: { from: config.pfiDid.uri, protocol: "1.0" },
  data: {
    description: "fake offering 1",
    payoutUnitsPerPayinUnit: "0.0069", // ex. we send 100 dollars, so that means 14550.00 KES
    payin: {
      currencyCode: "USD",
      methods: [
        {
          kind: "USD_LEDGER",
          requiredPaymentDetails: {},
        },
      ],
    },
    payout: {
      currencyCode: "KES",
      methods: [
        {
          kind: "MOMO_MPESA",
          requiredPaymentDetails: {
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "Mobile Money Required Payment Details",
            type: "object",
            required: ["phoneNumber", "reason"],
            additionalProperties: false,
            properties: {
              phoneNumber: {
                title: "Mobile money phone number",
                description: "Phone number of the Mobile Money account",
                type: "string",
              },
              reason: {
                title: "Reason for sending",
                description:
                  "To abide by the travel rules and financial reporting requirements, the reason for sending money",
                type: "string",
              },
            },
          },
          estimatedSettlementTime: 10, // seconds
        },
        {
          kind: "BANK_FIRSTBANK",
          requiredPaymentDetails: {
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "Bank Transfer Required Payment Details",
            type: "object",
            required: ["accountNumber", "reason"],
            additionalProperties: false,
            properties: {
              accountNumber: {
                title: "Bank account number",
                description: "Bank account of the recipient's bank account",
                type: "string",
              },
              reason: {
                title: "Reason for sending",
                description:
                  "To abide by the travel rules and financial reporting requirements, the reason for sending money",
                type: "string",
              },
            },
          },
          estimatedSettlementTime: 10, // seconds
        },
      ],
    },

    requiredClaims: {
      id: "7ce4004c-3c38-4853-968b-e411bafcd945",
      input_descriptors: [
        {
          id: "bbdb9b7c-5754-4f46-b63b-590bada959e0",
          constraints: {
            fields: [
              {
                path: ["$.type[*]"],
                filter: {
                  type: "string",
                  pattern: "^SanctionCredential$",
                },
              },
              // uncomment the following with a valid issuer did from npm run example-create-issuer:
              //{
              //  path: ['$.issuer'],
              //  filter: {
              //    type: 'string',
              //    const: 'did:key:z6MkrA3GSkK3hxy4oQvezUSwTMR28Y97ZzYLHhBRjySLKfjB'
              //  }
              //}
            ],
          },
        },
      ],
    },
  },
});

await offering.sign(config.pfiDid);
await OfferingRepository.create(offering);
