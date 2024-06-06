import type { BalancesApi } from '@tbdex/http-server'
import { Balance } from '@tbdex/http-server'
import { config } from '../config.js'

export class _BalancesRepository implements BalancesApi {
  async getBalances({ requesterDid }): Promise<Balance[]> {
    console.log('getBalances for:', requesterDid)
    const bal = Balance.create({
      data: {
        currencyCode: 'USDC',
        available: '1000',
      },
      metadata: {
        from: config.pfiDid.uri,
      }
    })
    return [bal]
  }
}

export const BalancesRepository = new _BalancesRepository()