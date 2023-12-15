package ftl.pfi

import com.nimbusds.jose.jwk.JWK
import ftl.lib.Json
import ftl.lib.PostgresClient
import tbdex.sdk.protocol.models.*
import web5.sdk.crypto.InMemoryKeyManager
import web5.sdk.dids.DidKey
import xyz.block.ftl.Context
import xyz.block.ftl.Ingress
import xyz.block.ftl.Method
import xyz.block.ftl.Verb
import java.time.OffsetDateTime
import java.time.ZoneOffset

typealias GetOfferingsRequest = Unit
data class GetOfferingsResponse(val offerings: String)

data class SubmitRfqRequest(val rfq: String)
typealias SubmitRfqResponse = Unit // todo should include errors

data class GetExchangesRequest(val messageType: String)
data class GetExchangesResponse(val exchanges: String)

class Pfi {
    private val postgresClient = PostgresClient()
    private val didKey: DidKey

    private var keyManager: InMemoryKeyManager

    init {
        keyManager = InMemoryKeyManager()
//        keyManager.generatePrivateKey(JWSAlgorithm.EdDSA, Curve.Ed25519)
        keyManager.import(JWK.parse("""
            {
              "kty": "EC",
              "d": "ObZnT863Zo8l4IUpjXdwQnJCWYYdIRz8oL2iP2YtGcE",
              "use": "sig",
              "crv": "secp256k1",
              "kid": "jSc9GweDpzbUTlrnw2UFFzROLDR-AHJNzdP3AICeuTk",
              "x": "AejkSFx3tb5o3_9gPaRaMS3ix2Z_2k41pfRCWwjhcdM",
              "y": "KN7bMi_oMr2l8MsNm5eovIckCnBmPJcpv48RPP4Vtyo",
              "alg": "ES256K"
            }
        """.trimIndent()))
//        didKey = DidKey.create(keyManager)
        didKey = DidKey("did:key:zQ3shtpZRkkSSoAu461yCWoprySM19cXhqCMKaPu7yQ5AJrv7", keyManager)
    }

    @Verb
    @Ingress(Method.GET, "/offerings")
    fun getOfferings(context: Context, req: GetOfferingsRequest): GetOfferingsResponse {
        try {
            val exported = keyManager.export()
            println(Json.stringify(exported))

            val offerings: MutableList<Offering> = mutableListOf()

            val select = postgresClient.connection.createStatement()
            val rs = select.executeQuery("SELECT * FROM offering")

            if (!rs.next()) {
                println("KW DBG inserting!")
                val offering = createOffering(didKey.uri)
                offering.sign(didKey)

                val test = Json.stringify(offering)
                println(test)

                val insert = postgresClient.connection.prepareStatement(
                    "INSERT INTO offering (offeringid, payoutcurrency, payincurrency, offering) VALUES (?, ?, ?, ?::json)"
                ).apply {
                    setString(1, offering.metadata.id.toString())
                    setString(2, offering.data.payinCurrency.currencyCode)
                    setString(3, offering.data.payoutCurrency.currencyCode)
                    setString(4, Json.stringify(offering))
                }
                insert.executeUpdate()
                insert.close()

                offerings.add(offering)
            } else {
                println("KW DBG selecting existing")
                do {
                    val offering = Offering.parse(rs.getString("offering"))
                    offerings.add(offering)
                } while (rs.next())
            }

            postgresClient.close()

            return GetOfferingsResponse(Json.stringify(offerings))
        } catch (ex: Exception) {
            println(ex)
            throw ex
        }
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

        println("Inserted RFQ")

        try {
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
