package ftl.pfi.services

import com.fasterxml.jackson.databind.JsonNode
import ftl.pfi.Json
import tbdex.sdk.protocol.models.*
import web5.sdk.credentials.model.ConstraintsV2
import web5.sdk.credentials.model.FieldV2
import web5.sdk.credentials.model.InputDescriptorV2
import web5.sdk.credentials.model.PresentationDefinitionV2
import web5.sdk.dids.Did
import java.time.OffsetDateTime

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

class SampleTbdexService {
    fun getOffering(uri: String): Offering =
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

    fun getQuote(did: Did, rfq: Rfq): Quote =
        Quote.create(
            rfq.metadata.from, did.uri, rfq.metadata.exchangeId,
            QuoteData(
                expiresAt = OffsetDateTime.now().plusDays(1),
                payin = QuoteDetails("AUD", "1000", "1"),
                payout = QuoteDetails("BTC", "12", "2"),
                paymentInstructions = PaymentInstructions(
                    payin = PaymentInstruction(
                        link = "https://block.xyz",
                        instruction = "payin instruction"
                    ),
                    payout = PaymentInstruction(
                        link = "https://block.xyz",
                        instruction = "payout instruction"
                    )
                )
            )
        )

    fun getOrderStatus(did: Did, order: Order): OrderStatus =
        OrderStatus.create(
            order.metadata.from, did.uri, order.metadata.exchangeId, OrderStatusData("COMPLETED"))
}