package ftl.pfi.services

import com.nimbusds.jose.jwk.JWK
import web5.sdk.crypto.InMemoryKeyManager
import web5.sdk.dids.Did
import web5.sdk.dids.methods.key.DidKey

class DidService {
    private val did: DidKey

    init {
        val keyManager = InMemoryKeyManager()
        // todo obv this shouldn't be in git
        keyManager.import(
            JWK.parse("""
            {
              "kty": "OKP",
              "d": "YGsM3HeGRu03nwAed-1BzBkVrcwqJ_YRwqvbOXTCM6g",
              "use": "sig",
              "crv": "Ed25519",
              "kid": "U-tdS83vLqXthjWKmDMYg9IOkpNtRI4XVEB_DIynKEU",
              "x": "sAT-reavVgGfzXnL-oLY7lqK1uBHkWAKkKqInBgUmAs",
              "alg": "EdDSA"
            }
        """.trimIndent()))

        did = DidKey.load("did:key:z6MkrJNDakwUm42f8rLM8FAqadBkzztnc1P6DRyAqC1U5ZLn", keyManager)
    }

    fun getDid(): Did = did

    fun getUri(): String = did.uri
}