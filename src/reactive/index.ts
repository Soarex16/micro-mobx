import { GETTERS_CACHE_SYMBOL, GettersCache } from "./caching";
import MapCache from "./caching/map-cache";

// Unique symbol to store internal object copy inside reactive wrapper
const ORIGINAL_OBJ_SYMBOL = Symbol("original-object");

const GLOBAL_GETTER_CONTEXT: GetterExecutionContext = {
  currentGetter: undefined
};

export interface ReactiveObject<T extends {}> {
  [GETTERS_CACHE_SYMBOL]: GettersCache;
  [ORIGINAL_OBJ_SYMBOL]: T;
}

// Because JS executes in a single thread
// we can store current executing getter in a global variable
export interface GetterExecutionContext {
  currentGetter: string | undefined;
}

/**
 * Copy property from source into target and make it reactive
 */
function defineReactivePrimitive<T>(
  obj: ReactiveObject<T>,
  property: string,
  ctx = GLOBAL_GETTER_CONTEXT
) {
  const original = obj[ORIGINAL_OBJ_SYMBOL];

  if (!(property in original)) {
    throw new Error(`Property ${property} does not exists in object!`);
  }

  Object.defineProperty(obj, property, {
    get() {
      if (ctx.currentGetter) {
        const cache: GettersCache = obj[GETTERS_CACHE_SYMBOL];
        const cachedGetter = cache && cache.get(ctx.currentGetter);
        if (cachedGetter) {
          cachedGetter.dependentProps.add(property);
        } else {
          cache.add(ctx.currentGetter, [property]);
        }
      }

      // @ts-ignore
      return original[property];
    },
    set(value) {
      const cache: GettersCache = obj[GETTERS_CACHE_SYMBOL]!;

      // If values has been changed purge cache
      // for all getters dependent from this property
      if (cache) {
        cache.invalidate(property);
      }

      // @ts-ignore
      original[property] = value;
    }
  });
}

function defineReactiveProperty<T>(
  obj: ReactiveObject<T>,
  proto: any,
  prop: string,
  descriptor: PropertyDescriptor,
  ctx = GLOBAL_GETTER_CONTEXT
) {
  if (descriptor.get) {
    const originalGetter = descriptor.get;
    descriptor.get = function reactiveGetter() {
      const cache = obj[GETTERS_CACHE_SYMBOL];
      const cachedGetter = cache.get(prop);

      if (cachedGetter && cachedGetter.val) {
        return cachedGetter.val;
      } else {
        ctx.currentGetter = prop;

        const computedVal = originalGetter.bind(obj)();
        const updatedCacheValue = cache.get(prop);
        if (updatedCacheValue) {
          updatedCacheValue.val = computedVal;
        }

        ctx.currentGetter = undefined;

        return computedVal;
      }
    };
  }
  Object.defineProperty(proto, prop, descriptor);
}

function createReactivePrototypeChain<T>(
  obj: ReactiveObject<T>,
  source: any
): any {
  const reactiveProtoRoot = {};

  let proto = source;
  let rProto: any = reactiveProtoRoot;
  // Пока не размотали всю цепочку прототипов
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);

    rProto.__proto__ = {};
    rProto = rProto.__proto__;
    const protoDescriptors = Object.getOwnPropertyDescriptors(proto);
    Object.entries(protoDescriptors).forEach(([prop, descriptor]) => {
      defineReactiveProperty(obj, rProto, prop, descriptor);
    });
  }

  return reactiveProtoRoot;
}

const createSimpleCache = () => new MapCache();

function reactive<T>(
  obj: T,
  cacheFactory: () => GettersCache = createSimpleCache
): T {
  // copy original object
  const objectCopy: T = Object.assign({}, obj);
  const reactiveWrapper: ReactiveObject<T> = {
    [GETTERS_CACHE_SYMBOL]: cacheFactory(),
    [ORIGINAL_OBJ_SYMBOL]: objectCopy
  };

  const objDescriptors = Object.getOwnPropertyDescriptors(obj);
  Object.keys(objDescriptors).forEach((prop) => {
    defineReactivePrimitive(reactiveWrapper, prop);
  });

  // @ts-ignore
  reactiveWrapper.__proto__ = createReactivePrototypeChain(
    reactiveWrapper,
    obj
  );

  // @ts-ignore
  return reactiveWrapper as T;
}

export default reactive;
