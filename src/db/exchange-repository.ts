import {
  Message,
  Close,
  Order,
  OrderStatus,
  Quote,
  ExchangesApi,
  Rfq,
  Parser,
} from "@tbdex/http-server";
import {
  MessageModel,
  MessageKind,
  GetExchangesFilter,
  Exchange,
} from "@tbdex/http-server";
import { Postgres } from "./postgres.js";
import { config } from "../config.js";

class _ExchangeRepository implements ExchangesApi {
  // Maps exchangeId to Exchange
  exchangeMessagesMap: Map<string, Exchange>;

  constructor() {
    this.exchangeMessagesMap = new Map<string, Exchange>();
  }

  async getExchanges(opts?: {
    filter: GetExchangesFilter;
  }): Promise<Exchange[]> {
    return [];

    // TODO: try out GROUP BY! would do it now, just unsure what the return structure looks like
    console.log("I was called.");
    const exchangeIds = opts.filter.id?.length ? opts.filter.id : [];

    if (exchangeIds.length == 0) {
      console.log("I said i don't have anything passed o");
      return await this.getAllExchanges();
    }

    const exchanges: Exchange[] = [];

    if (opts.filter.id) {
      // filter has `id` and `from`
      console.log("now we filter");
      for (const id of opts.filter.id) {
        console.log("looping.");
        const exchange = this.exchangeMessagesMap.get(id);
        if (exchange?.rfq?.from === opts.filter.from) {
          exchanges.push(exchange);
        }
      }
    } else {
      // filter only has `from`
      console.log("we skipped filter");
      this.exchangeMessagesMap.forEach((exchange, _id) => {
        // You definitely shouldn't use InMemoryExchangesApi in production.
        // This will get really slow
        if (exchange?.rfq?.from === opts.filter.from) {
          exchanges.push(exchange);
        }
      });
    }

    console.log("I'm about to return");

    return exchanges;
  }

  async getAllExchanges(): Promise<Exchange[]> {
    const results = await Postgres.client
      .selectFrom("exchange")
      .select(["message"])
      .orderBy("createdat", "asc")
      .execute();

    return this.composeMessages(results);
  }

  async getExchange(opts: { id: string }): Promise<Exchange | undefined> {
    const results = await Postgres.client
      .selectFrom("exchange")
      .select(["message"])
      .where((eb) =>
        eb.and({
          exchangeid: opts.id,
        }),
      )
      .orderBy("createdat", "asc")
      .execute();

    const messages = await this.composeMessages(results);

    return messages[0];
  }

  private async composeMessages(
    results: { message: MessageModel }[],
  ): Promise<Exchange[]> {
    const exchangeIdsToMessages: { [key: string]: Exchange } = {};

    for (let result of results) {
      const message = await Parser.parseMessage(result.message);
      let exchange = this.exchangeMessagesMap.get(message.exchangeId);
      // const exchange =
      //   this.exchangeMessagesMap.get(message.exchangeId) ?? new Exchange();
      // exchange.addNextMessage(message);
      // this.exchangeMessagesMap.set(message.exchangeId, exchange);

      if (!exchange) {
        exchange = new Exchange();
        this.exchangeMessagesMap.set(message.exchangeId, exchange);
      }
      exchange.addNextMessage(message);

      exchangeIdsToMessages[message.exchangeId] = exchange;
    }

    // return exchange;
    return Object.values(exchangeIdsToMessages);
  }

  async getRfq(opts: { exchangeId: string }): Promise<Rfq> {
    return (await this.getMessage({
      exchangeId: opts.exchangeId,
      messageKind: "rfq",
    })) as Rfq;
  }

  async getQuote(opts: { exchangeId: string }): Promise<Quote> {
    return (await this.getMessage({
      exchangeId: opts.exchangeId,
      messageKind: "quote",
    })) as Quote;
  }

  async getOrder(opts: { exchangeId: string }): Promise<Order> {
    return (await this.getMessage({
      exchangeId: opts.exchangeId,
      messageKind: "order",
    })) as Order;
  }

  async getOrderStatuses(opts: { exchangeId: string }): Promise<OrderStatus[]> {
    const results = await Postgres.client
      .selectFrom("exchange")
      .select(["message"])
      .where((eb) =>
        eb.and({
          exchangeid: opts.exchangeId,
          messagekind: "orderstatus",
        }),
      )
      .execute();

    const orderStatuses: OrderStatus[] = [];

    for (let result of results) {
      const orderStatus = (await Parser.parseMessage(
        result.message,
      )) as OrderStatus;
      orderStatuses.push(orderStatus);
    }

    return orderStatuses;
  }

  async getClose(opts: { exchangeId: string }): Promise<Close> {
    return (await this.getMessage({
      exchangeId: opts.exchangeId,
      messageKind: "close",
    })) as Close;
  }

  async getMessage(opts: { exchangeId: string; messageKind: MessageKind }) {
    const result = await Postgres.client
      .selectFrom("exchange")
      .select(["message"])
      .where((eb) =>
        eb.and({
          exchangeid: opts.exchangeId,
          messagekind: opts.messageKind,
        }),
      )
      .limit(1)
      .executeTakeFirst();

    if (result) {
      return await Parser.parseMessage(result.message);
    }
  }

  async addMessage(opts: { message: Message }) {
    const { message } = opts;
    const subject = aliceMessageKinds.has(message.kind)
      ? message.from
      : message.to;

    const result = await Postgres.client
      .insertInto("exchange")
      .values({
        exchangeid: message.exchangeId,
        messagekind: message.kind,
        messageid: message.id,
        subject,
        message: JSON.stringify(message),
      })
      .execute();

    console.log(
      `Add ${message.kind} Result: ${JSON.stringify(result, null, 2)}`,
    );

    if (message.kind == "rfq") {
      const quote = Quote.create({
        metadata: {
          from: config.pfiDid.uri,
          to: message.from,
          exchangeId: message.exchangeId,
          protocol: "1.0",
        },
        data: {
          expiresAt: new Date(2024, 4, 1).toISOString(),
          payin: {
            currencyCode: "BTC",
            amount: "1000.00",
          },
          payout: {
            currencyCode: "KES",
            amount: "123456789.00",
          },
        },
      });
      await quote.sign(config.pfiDid);
      this.addMessage({ message: quote as Quote });
    }

    if (message.kind == "order") {
      let orderStatus = OrderStatus.create({
        metadata: {
          from: config.pfiDid.uri,
          to: message.from,
          exchangeId: message.exchangeId,
          protocol: "1.0",
        },
        data: {
          orderStatus: "PROCESSING",
        },
      });
      await orderStatus.sign(config.pfiDid);
      this.addMessage({ message: orderStatus as OrderStatus });

      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

      orderStatus = OrderStatus.create({
        metadata: {
          from: config.pfiDid.uri,
          to: message.from,
          exchangeId: message.exchangeId,
          protocol: "1.0",
        },
        data: {
          orderStatus: "COMPLETED",
        },
      });
      await orderStatus.sign(config.pfiDid);
      this.addMessage({ message: orderStatus as OrderStatus });

      // finally close the exchange
      const close = Close.create({
        metadata: {
          from: config.pfiDid.uri,
          to: message.from,
          exchangeId: message.exchangeId,
          protocol: "1.0",
        },
        data: {
          reason: "Order fulfilled",
        },
      });
      await close.sign(config.pfiDid);
      this.addMessage({ message: close as Close });
    }

    const exchange =
      this.exchangeMessagesMap.get(message.exchangeId) ?? new Exchange();
    exchange.addNextMessage(message);
    this.exchangeMessagesMap.set(message.exchangeId, exchange);
  }
}

const aliceMessageKinds = new Set(["rfq", "order"]);

export const ExchangeRepository = new _ExchangeRepository();
