/* eslint-disable no-unused-vars */
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
  TickerData,
} from "../interfaces/routes";

// @ts-ignore
const WebSocket = require("ws");

const callbackListeners: Record<string, any> = {};
export class WebSockets {
  private socketInstance!: WebSocket;

  private token: string;

  private url: string;

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
  async open() {
    const socket = new WebSocket(this.url);
    this.socketInstance = socket;

    const socketOpenPromise = new Promise(function (resolve, reject) {
      socket.onopen = function () {
        resolve(true);
      };
      socket.onerror = function (err: any) {
        reject(err);
      };
    });

    this.socketInstance.onmessage = (event: any) => {
      event = JSON.parse(event.data);
      if (callbackListeners[event.eventName]) {
        callbackListeners[event.eventName](event.data);
      }
    };

    return socketOpenPromise;
  }

  /**
   * closes the socket instance connection
   */
  close() {
    if (this.socketInstance) {
      this.socketInstance.close();
    }

    Object.keys(callbackListeners).forEach(function (key) {
      delete callbackListeners[key];
    });
  }

  subscribeGlobalUpdatesBySymbol(symbol: MarketSymbol): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.send(
      JSON.stringify([
        "SUBSCRIBE",
        [
          {
            e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
            p: symbol,
          },
        ],
      ])
    );
    return true;
  }

  unsubscribeGlobalUpdatesBySymbol(symbol: MarketSymbol): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.send(
      JSON.stringify([
        "UNSUBSCRIBE",
        [
          {
            e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
            p: symbol,
          },
        ],
      ])
    );
    return true;
  }

  subscribeUserUpdateByToken(): boolean {
    if (!this.socketInstance) return false;

    this.socketInstance.send(
      JSON.stringify([
        "SUBSCRIBE",
        [
          {
            e: SOCKET_EVENTS.UserUpdatesRoom,
            t: this.token,
          },
        ],
      ])
    );
    return true;
  }

  unsubscribeUserUpdateByToken(): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.send(
      JSON.stringify([
        "UNSUBSCRIBE",
        [
          {
            e: SOCKET_EVENTS.UserUpdatesRoom,
            t: this.token,
          },
        ],
      ])
    );
    return true;
  }

  setAuthToken = (token: string) => {
    this.token = token;
  };

  // Emitted when any price bin on the oderbook is updated.
  onOrderBookUpdate = (cb: ({ orderbook }: any) => void) => {
    callbackListeners[SOCKET_EVENTS.OrderbookUpdateKey] = cb;
  };

  onMarketDataUpdate = (
    cb: ({ marketData }: { marketData: MarketData }) => void
  ) => {
    callbackListeners[SOCKET_EVENTS.MarketDataUpdateKey] = cb;
  };

  onMarketHealthChange = (
    cb: ({ status, symbol }: { status: MARKET_STATUS; symbol: string }) => void
  ) => {
    callbackListeners[SOCKET_EVENTS.MarketHealthKey] = cb;
  };

  onCandleStickUpdate = (
    symbol: string,
    interval: string,
    cb: (candle: MinifiedCandleStick) => void
  ) => {
    callbackListeners[
      this.createDynamicUrl(SOCKET_EVENTS.GET_LAST_KLINE_WITH_INTERVAL, {
        symbol,
        interval,
      })
    ] = cb;
  };

  onExchangeHealthChange = (
    cb: ({ isAlive }: { isAlive: boolean }) => void
  ) => {
    callbackListeners[SOCKET_EVENTS.ExchangeHealthKey] = cb;
  };

  onTickerUpdate = (cb: (tickerData: TickerData[]) => void) => {
    callbackListeners[SOCKET_EVENTS.TickerUpdate] = cb;
  };

  // TODO: figure out what it does
  onRecentTrades = (
    cb: ({ trades }: { trades: GetMarketRecentTradesResponse[] }) => void
  ) => {
    callbackListeners[SOCKET_EVENTS.RecentTradesKey] = cb;
  };

  onUserOrderUpdate = (
    cb: ({ order }: { order: PlaceOrderResponse }) => void
  ) => {
    callbackListeners[SOCKET_EVENTS.OrderUpdateKey] = cb;
  };

  onUserPositionUpdate = (
    cb: ({ position }: { position: GetPositionResponse }) => void
  ) => {
    callbackListeners[SOCKET_EVENTS.PositionUpdateKey] = cb;
  };

  onUserUpdates = (
    cb: ({ trade }: { trade: GetUserTradesResponse }) => void
  ) => {
    callbackListeners[SOCKET_EVENTS.UserTradeKey] = cb;
  };

  onUserAccountDataUpdate = (
    cb: ({ accountData }: { accountData: GetAccountDataResponse }) => void
  ) => {
    callbackListeners[SOCKET_EVENTS.AccountDataUpdateKey] = cb;
  };
}
