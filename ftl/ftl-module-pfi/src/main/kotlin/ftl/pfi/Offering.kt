package ftl.pfi

import com.fasterxml.jackson.databind.JsonNode
import ftl.lib.Json
import tbdex.sdk.protocol.models.CurrencyDetails
import tbdex.sdk.protocol.models.Offering
import tbdex.sdk.protocol.models.OfferingData
import tbdex.sdk.protocol.models.PaymentMethod
import web5.sdk.credentials.model.ConstraintsV2
import web5.sdk.credentials.model.FieldV2
import web5.sdk.credentials.model.InputDescriptorV2
import web5.sdk.credentials.model.PresentationDefinitionV2

val REQUIRED_PAYMENT_DETAILS = Json.parse(
    """
        {
          "${'$'}schema": "http://json-schema.org/draft-07/schema",
          "additionalProperties": false,
          "type": "object",
          "properties": {
            "phoneNumber": {
              "minLength": 12,
              "pattern": "^+2547[0-9]{8}${'$'}",
              "description": "Mobile Money account number of the Recipient",
              "type": "string",
              "title": "Phone Number",
              "maxLength": 12
            },
            "accountHolderName": {
              "pattern": "^[A-Za-zs'-]+${'$'}",
              "description": "Name of the account holder as it appears on the Mobile Money account",
              "type": "string",
              "title": "Account Holder Name",
              "maxLength": 32
            }
          },
          "required": [
            "accountNumber",
            "accountHolderName"
          ]
        }
    """.trimIndent(),
    JsonNode::class.java)

fun createOffering(uri: String): Offering =
    Offering.create(
        from = uri,
        OfferingData(
            description = "A sample offering",
            payoutUnitsPerPayinUnit = "1",
            payinCurrency = CurrencyDetails("AUD", "1", "10000"),
            payoutCurrency = CurrencyDetails("USDC"),
            payinMethods = listOf(
                PaymentMethod(
                    kind = "BTC_ADDRESS",
                    requiredPaymentDetails = REQUIRED_PAYMENT_DETAILS
                )
            ),
            payoutMethods = listOf(
                PaymentMethod(
                    kind = "MOMO",
                    requiredPaymentDetails = REQUIRED_PAYMENT_DETAILS
                )
            ),
            requiredClaims = PresentationDefinitionV2(
                id = "test-pd-id",
                name = "simple PD",
                purpose = "pd for testing",
                inputDescriptors = listOf(
                    InputDescriptorV2(
                        id = "whatever",
                        purpose = "for testing",
                        constraints = ConstraintsV2(
                            fields = listOf(FieldV2(id = null, path = listOf("$.credentialSubject.btcAddress")))
                        )
                    )
                )
            ),
        )
    )
