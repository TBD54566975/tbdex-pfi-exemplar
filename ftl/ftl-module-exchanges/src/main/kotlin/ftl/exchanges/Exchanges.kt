package ftl.exchanges

import com.nimbusds.jose.jwk.JWK
import ftl.lib.Json
import ftl.lib.PostgresClient
import tbdex.sdk.protocol.models.Quote
import tbdex.sdk.protocol.models.QuoteData
import tbdex.sdk.protocol.models.QuoteDetails
import tbdex.sdk.protocol.models.Rfq
import web5.sdk.crypto.InMemoryKeyManager
import web5.sdk.dids.DidKey
import xyz.block.ftl.Context
import xyz.block.ftl.Ingress
import xyz.block.ftl.Method
import xyz.block.ftl.Verb
import java.time.OffsetDateTime
import java.time.ZoneOffset

data class SubmitRfqRequest(val rfq: String)
typealias SubmitRfqResponse = Unit // todo should include errors

data class GetExchangesRequest(val messageType: String)
data class GetExchangesResponse(val exchanges: String)

class Exchanges {
    private val postgresClient = PostgresClient()
    private val didKey: DidKey

    init {
        val km = InMemoryKeyManager()
        km.import(JWK.parse("""
                {
                  "d": "-Prle8d05jKCRh9_AY2b5G82iv5-WsmiiGzH3jYXiiA",
                  "alg": "EdDSA",
                  "crv": "Ed25519",
                  "kty": "OKP",
                  "ext": "true",
                  "key_ops": [
                    "sign"
                  ],
                  "x": "k2H6W-BpdNfN98AFB0frbZVUOXCJ6PiaqspjilEN2WY"
                }
            """.trimIndent()))

        didKey = DidKey("did:key:z6MkwJMVm2pdQxZ8jQLqyWx3ipD8q88HE8FqkDs1bCofKdgg", km)
    }

    @Verb
    @Ingress(Method.POST, "/exchanges/{exchangeId}/rfq")
    fun submitRfq(context: Context, req: SubmitRfqRequest): SubmitRfqResponse {
        // todo middleware validation from tbdex-kt/httpserver

        val rfq = Json.parse(req.rfq, Rfq::class.java)

        val sql = """
            INSERT INTO exchange (exchangeid, messageid, subject, messagekind, message)
            VALUES (?, ?, ?, ?, ?::json)
        """.trimIndent()

        postgresClient.connection.prepareStatement(sql).apply {
            setString(1, rfq.metadata.exchangeId.toString())
            setString(2, rfq.metadata.id.toString())
            setString(3, rfq.metadata.from)
            setString(4, rfq.metadata.kind.toString())
            setString(5, Json.stringify(rfq))
        }.executeUpdate()

        try {
            println(didKey)

            val quote = Quote.create(
                to = rfq.metadata.from,
                from = didKey.uri,
                exchangeId = rfq.metadata.exchangeId,
                quoteData = QuoteData(
                    expiresAt = OffsetDateTime.of(2023, 12, 1, 0, 0, 0, 0, ZoneOffset.UTC),
                    payin = QuoteDetails(
                        currencyCode = "USD",
                        amountSubunits = "100"
                    ),
                    payout = QuoteDetails(
                        currencyCode = "USD",
                        amountSubunits = "100"
                    )
                )
            )
            quote.sign(didKey)

            println(quote)
        } catch (ex: Exception) {
            println(ex)
        }
    }

    @Verb
    @Ingress(Method.GET, "/exchanges/{exchangeId}?messageType={messageType}")
    fun getExchanges(context: Context, req: GetExchangesRequest): GetExchangesResponse {


        return GetExchangesResponse("hello world")
    }
}
