package ftl.pfi

import com.fasterxml.jackson.databind.JsonNode
import ftl.lib.Json
import tbdex.sdk.protocol.models.CurrencyDetails
import tbdex.sdk.protocol.models.Offering
import tbdex.sdk.protocol.models.OfferingData
import tbdex.sdk.protocol.models.PaymentMethod
import web5.sdk.credentials.ConstraintsV2
import web5.sdk.credentials.FieldV2
import web5.sdk.credentials.InputDescriptorV2
import web5.sdk.credentials.PresentationDefinitionV2

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

fun createOffering(uri: String): Offering {
    return Offering.create(
        from = uri,
        data = OfferingData(
            description = "fake offering 1",
            payoutUnitsPerPayinUnit = "0.0069",
            payoutCurrency = CurrencyDetails(currencyCode = "KES", minSubunits = "1", maxSubunits = "1000"),
            payinCurrency = CurrencyDetails(currencyCode = "USD", minSubunits = "1", maxSubunits = "1000"),
            payinMethods = listOf(
                PaymentMethod(
                    kind = "USD_LEDGER",
                    requiredPaymentDetails = REQUIRED_PAYMENT_DETAILS
                )
            ),
            payoutMethods = listOf(
                PaymentMethod(
                    kind = "MOMO_MPESA",
                    requiredPaymentDetails = REQUIRED_PAYMENT_DETAILS
                )
            ),
            requiredClaims = PresentationDefinitionV2(
                id = "7ce4004c-3c38-4853-968b-e411bafcd945",
                inputDescriptors = listOf(
                    InputDescriptorV2(
                        id = "bbdb9b7c-5754-4f46-b63b-590bada959e0",
                        constraints = ConstraintsV2(
                            fields = listOf(
                                FieldV2(
                                    path = listOf("$.type[*]")
                                    // todo pattern = "^SanctionCredential$"
                                )
                            )
                        )
                    )
                )
            )
        )
    )
}