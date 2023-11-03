import type { OfferingsApi } from '@tbdex/http-server'

import { Offering } from '@tbdex/http-server'
import { Postgres } from './postgres.js'

export class _OfferingRepository implements OfferingsApi {
  async create(offering: Offering) {
    let result = await Postgres.client.insertInto('offering')
      .values({
        offeringid: offering.id,
        payoutcurrency: offering.payoutCurrency.currencyCode,
        payincurrency: offering.payinCurrency.currencyCode,
        offering: JSON.stringify(offering)
      })
      .execute()

    console.log(`create offering result: ${JSON.stringify(result, null, 2)}`)
  }

  async getOffering(opts: {id: string}): Promise<Offering> {
    const [ result ] =  await Postgres.client.selectFrom('offering')
      .select(['offering'])
      .where('offeringid', '=', opts.id)
      .execute()

    if (!result) {
      return undefined
    }

    return Offering.factory(result.offering)

  }

  async getOfferings(): Promise<Offering[]> {
    const results =  await Postgres.client.selectFrom('offering')
      .select(['offering'])
      .execute()

    const offerings: Offering[] = []
    for (let result of results) {
      const offering = Offering.factory(result.offering)
      offerings.push(offering)
    }

    return offerings
  }
}

export const OfferingRepository = new _OfferingRepository()