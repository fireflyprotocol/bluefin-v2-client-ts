export const isReactNative =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

export const isNode =
  typeof process !== "undefined" &&
  typeof process.versions === "object" &&
  !!process.versions.node &&
  !isReactNative;
