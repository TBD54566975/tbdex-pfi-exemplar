import { Message, Close, Order, OrderStatus, Quote, ExchangesApi, Rfq, Parser } from '@tbdex/http-server'
import type { MessageModel, MessageKind, GetExchangesFilter } from '@tbdex/http-server'
import { Postgres } from './postgres.js'
import { config } from '../config.js'

class _ExchangeRepository implements ExchangesApi {

  async getExchanges(opts: { filter: GetExchangesFilter }): Promise<Message[][]> {
    // TODO: try out GROUP BY! would do it now, just unsure what the return structure looks like
    const exchangeIds = opts.filter.id?.length ? opts.filter.id : []

    if (exchangeIds.length == 0) {
      return await this.getAllExchanges()
    }

    const exchanges: Message[][] = []
    for (let id of exchangeIds) {
      console.log('calling id', id)
      // TODO: handle error property
      try {
        const exchange = await this.getExchange({ id })
        if (exchange.length) exchanges.push(exchange)
        else console.error(`Could not find exchange with exchangeId ${id}`)
      } catch (err) {
        console.error(err)
      }
    }

    return exchanges
  }

  async getAllExchanges(): Promise<Message[][]> {
    const results = await Postgres.client.selectFrom('exchange')
      .select(['message'])
      .orderBy('createdat', 'asc')
      .execute()

    return this.composeMessages(results)
  }

  async getExchange(opts: { id: string }): Promise<Message[]> {
    const results = await Postgres.client.selectFrom('exchange')
      .select(['message'])
      .where(eb => eb.and({
        exchangeid: opts.id,
      }))
      .orderBy('createdat', 'asc')
      .execute()

    const messages = await this.composeMessages(results)

    return messages[0] ?? []
  }

  private async composeMessages(results: { message: MessageModel }[]): Promise<Message[][]> {
    const exchangeIdsToMessages: {[key: string]: Message[]} = {}

    for (let result of results) {
      const message = await Parser.parseMessage(result.message)
      const exchangeId = message.metadata.exchangeId
      if (exchangeIdsToMessages[exchangeId]) {
        exchangeIdsToMessages[exchangeId].push(message)
      } else {
        exchangeIdsToMessages[exchangeId] = [message]
      }
    }

    return Object.values(exchangeIdsToMessages)
  }

  async getRfq(opts: { exchangeId: string }): Promise<Rfq> {
    return await this.getMessage({ exchangeId: opts.exchangeId, messageKind: 'rfq' }) as Rfq
  }

  async getQuote(opts: { exchangeId: string }): Promise<Quote> {
    return await this.getMessage({ exchangeId: opts.exchangeId, messageKind: 'quote' }) as Quote
  }

  async getOrder(opts: { exchangeId: string }): Promise<Order> {
    return await this.getMessage({ exchangeId: opts.exchangeId, messageKind: 'order' }) as Order
  }

  async getOrderStatuses(opts: { exchangeId: string }): Promise<OrderStatus[]> {
    const results = await Postgres.client.selectFrom('exchange')
      .select(['message'])
      .where(eb => eb.and({
        exchangeid: opts.exchangeId,
        messagekind: 'orderstatus'
      }))
      .execute()

    const orderStatuses: OrderStatus[] = []

    for (let result of results) {
      const orderStatus = await Parser.parseMessage(result.message) as OrderStatus
      orderStatuses.push(orderStatus)
    }

    return orderStatuses
  }

  async getClose(opts: { exchangeId: string }): Promise<Close> {
    return await this.getMessage({ exchangeId: opts.exchangeId, messageKind: 'close' }) as Close
  }

  async getMessage(opts: { exchangeId: string, messageKind: MessageKind }) {
    const result = await Postgres.client.selectFrom('exchange')
      .select(['message'])
      .where(eb => eb.and({
        exchangeid: opts.exchangeId,
        messagekind: opts.messageKind
      }))
      .limit(1)
      .executeTakeFirst()

    if (result) {
      return await Parser.parseMessage(result.message)
    }
  }

  async addMessage(opts: { message: Message }) {
    const { message } = opts
    const subject = aliceMessageKinds.has(message.kind) ? message.from : message.to

    const result = await Postgres.client.insertInto('exchange')
      .values({
        exchangeid: message.exchangeId,
        messagekind: message.kind,
        messageid: message.id,
        subject,
        message: JSON.stringify(message)
      })
      .execute()

    console.log(`Add ${message.kind} Result: ${JSON.stringify(result, null, 2)}`)

    if (message.kind == 'rfq') {
      const quote = Quote.create({
        metadata: {
          from: config.pfiDid.uri,
          to: message.from,
          exchangeId: message.exchangeId
        },
        data: {
          expiresAt: new Date(2024, 4, 1).toISOString(),
          payin: {
            currencyCode: 'BTC',
            amount: '1000.00'
          },
          payout: {
            currencyCode: 'KES',
            amount: '123456789.00'
          }
        }
      })
      await quote.sign(config.pfiDid)
      this.addMessage({ message: quote as Quote})
    }

    if (message.kind == 'order') {
      let orderStatus = OrderStatus.create({
        metadata: {
          from: config.pfiDid.uri,
          to: message.from,
          exchangeId: message.exchangeId
        },
        data: {
          orderStatus: 'PROCESSING'
        }
      })
      await orderStatus.sign(config.pfiDid)
      this.addMessage({ message: orderStatus as OrderStatus})

      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay

      orderStatus = OrderStatus.create({
        metadata: {
          from: config.pfiDid.uri,
          to: message.from,
          exchangeId: message.exchangeId
        },
        data: {
          orderStatus: 'COMPLETED'
        }
      })
      await orderStatus.sign(config.pfiDid)
      this.addMessage({ message: orderStatus as OrderStatus})

      // finally close the exchange
      const close = Close.create({
        metadata: {
          from: config.pfiDid.uri,
          to: message.from,
          exchangeId: message.exchangeId
        },
        data: {
          reason: 'Order fulfilled'
        }
      })
      await close.sign(config.pfiDid)
      this.addMessage({ message: close as Close })
    }
  }
}

const aliceMessageKinds = new Set(['rfq', 'order'])

export const ExchangeRespository = new _ExchangeRepository()