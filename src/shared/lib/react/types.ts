/**
 * Resolves keys of T that are functions.
 */
export type FunctionKey<T> = {
   
  [K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Picks keys of T that are functions.
 */
export type PickActions<T> = Pick<T, FunctionKey<T>>;

/**
 * Omits keys of T that are functions.
 */
export type OmitState<T> = Omit<T, FunctionKey<T>>;
