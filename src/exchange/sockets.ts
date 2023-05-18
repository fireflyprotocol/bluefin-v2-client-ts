/* eslint-disable no-unused-vars */
import { Socket, io } from "socket.io-client";
import {
  MarketSymbol,
  SOCKET_EVENTS,
  MARKET_STATUS,
  MinifiedCandleStick,
} from "@firefly-exchange/library";

import {
  GetMarketRecentTradesResponse,
  PlaceOrderResponse,
  GetPositionResponse,
  GetUserTradesResponse,
  GetAccountDataResponse,
  MarketData,
  UserSubscriptionAck,
  TickerData,
} from "../interfaces/routes";

export class Sockets {
  private socketInstance!: Socket;

  private url: string;

  private token: string;

  constructor(url: string) {
    this.url = url;
    this.token = "";
  }

  createDynamicUrl(dynamicUrl: string, object: any) {
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const key in object) {
      dynamicUrl = dynamicUrl.replace(`{${key}}`, object[key]);
    }
    return dynamicUrl;
  }

  /**
   * opens socket instance connection
   */
  open() {
    this.socketInstance = io(this.url, {
      transports: ["websocket"],
    });
  }

  /**
   * closes the socket instance connection
   */
  close() {
    if (this.socketInstance) {
      this.socketInstance.disconnect();
      this.socketInstance.close();
    }
  }

  subscribeGlobalUpdatesBySymbol(symbol: MarketSymbol): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.emit("SUBSCRIBE", [
      {
        e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
        p: symbol,
      },
    ]);
    return true;
  }

  unsubscribeGlobalUpdatesBySymbol(symbol: MarketSymbol): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.emit("UNSUBSCRIBE", [
      {
        e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
        p: symbol,
      },
    ]);
    return true;
  }

  setAuthToken = (token: string) => {
    this.token = token;
  };

  subscribeUserUpdateByToken(callback?: UserSubscriptionAck): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.emit(
      "SUBSCRIBE",
      [
        {
          e: SOCKET_EVENTS.UserUpdatesRoom,
          t: this.token,
        },
      ],
      (data: UserSubscriptionAck) => {
        if (callback instanceof Function) callback(data);
      }
    );
    return true;
  }

  unsubscribeUserUpdateByToken(callback?: UserSubscriptionAck): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.emit(
      "UNSUBSCRIBE",
      [
        {
          e: SOCKET_EVENTS.UserUpdatesRoom,
          t: this.token,
        },
      ],
      (data: UserSubscriptionAck) => {
        if (callback instanceof Function) callback(data);
      }
    );
    return true;
  }

  // Emitted when any price bin on the oderbook is updated.
  onOrderBookUpdate = (cb: ({ orderbook }: any) => void) => {
    this.socketInstance.on(SOCKET_EVENTS.OrderbookUpdateKey, cb);
  };

  onMarketDataUpdate = (
    cb: ({ marketData }: { marketData: MarketData }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.MarketDataUpdateKey, cb);
  };

  onMarketHealthChange = (
    cb: ({ status, symbol }: { status: MARKET_STATUS; symbol: string }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.MarketHealthKey, cb);
  };

  onCandleStickUpdate = (
    symbol: string,
    interval: string,
    cb: (candle: MinifiedCandleStick) => void
  ) => {
    this.socketInstance.on(
      this.createDynamicUrl(SOCKET_EVENTS.GET_LAST_KLINE_WITH_INTERVAL, {
        symbol,
        interval,
      }),
      cb
    );
  };

  onExchangeHealthChange = (
    cb: ({ isAlive }: { isAlive: boolean }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.ExchangeHealthKey, cb);
  };

  onTickerUpdate = (cb: (tickerData: TickerData[]) => void) => {
    this.socketInstance.on(SOCKET_EVENTS.TickerUpdate, cb);
  };

  // TODO: figure out what it does
  onRecentTrades = (
    cb: ({ trades }: { trades: GetMarketRecentTradesResponse[] }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.RecentTradesKey, cb);
  };

  onUserOrderUpdate = (
    cb: ({ order }: { order: PlaceOrderResponse }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.OrderUpdateKey, cb);
  };

  onUserPositionUpdate = (
    cb: ({ position }: { position: GetPositionResponse }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.PositionUpdateKey, cb);
  };

  onUserUpdates = (
    cb: ({ trade }: { trade: GetUserTradesResponse }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.UserTradeKey, cb);
  };

  onUserAccountDataUpdate = (
    cb: ({ accountData }: { accountData: GetAccountDataResponse }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.AccountDataUpdateKey, cb);
  };
}
