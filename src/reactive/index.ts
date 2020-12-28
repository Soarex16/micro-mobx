import { GETTERS_CACHE_SYMBOL, GettersCache } from "./caching";
import {
  GLOBAL_AUTORUN_CONTEXT,
  recordAutorunDependency,
  executeDependentAutorunFunctions
} from "./autorun";
import MapCache from "./caching/map-cache";

// Unique symbol to store internal object copy inside reactive wrapper
const ORIGINAL_OBJ_SYMBOL = Symbol("original-object");

// Object that holds current executing getter
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
 * Define in reactive wrapper property from internal object
 * @param obj - reactive wrapper over internal object
 * @param property - property to define
 * @param ctx - getter context, used to determine current executing getter.
 * Need for proper getters dependency management.
 * @param autorunCtx - current autorun execution context
 */
function defineReactivePrimitive<T>(
  obj: ReactiveObject<T>,
  property: string,
  ctx = GLOBAL_GETTER_CONTEXT,
  autorunCtx = GLOBAL_AUTORUN_CONTEXT
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

      recordAutorunDependency(autorunCtx, obj, property);

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

      executeDependentAutorunFunctions(autorunCtx, obj, property);
    }
  });
}

/**
 * Define reactive propery in proto bound to obj
 * @param obj - object that acts as this inside property getter ans setter
 * @param proto - prototype where defining getter
 * @param prop - property to define in proto
 * @param descriptor - property descriptor
 * @param ctx - current getter context
 * @param autorunCtx - current autorun execution context
 */
function defineReactiveProperty<T>(
  obj: ReactiveObject<T>,
  proto: any,
  prop: string,
  descriptor: PropertyDescriptor,
  ctx = GLOBAL_GETTER_CONTEXT,
  autorunCtx = GLOBAL_AUTORUN_CONTEXT
) {
  if (descriptor.get) {
    const originalGetter = descriptor.get;
    descriptor.get = function reactiveGetter() {
      // no need to record computed values because
      // they are composed of primitive reactive values
      // recordAutorunDependency(autorunCtx, obj, prop);

      const cache = obj[GETTERS_CACHE_SYMBOL];
      const cachedGetter = cache.get(prop);

      if (cachedGetter && cachedGetter.val) {
        return cachedGetter.val;
      } else {
        ctx.currentGetter = prop;

        // recompute cached value
        const computedVal = originalGetter.apply(obj);
        const updatedCacheValue = cache.get(prop);
        if (updatedCacheValue) {
          updatedCacheValue.val = computedVal;
        }

        ctx.currentGetter = undefined;

        return computedVal;
      }
    };
  }

  if (descriptor.set) {
    const originalSetter = descriptor.set;
    descriptor.set = function reactiveSetter(value) {
      originalSetter.call(this, value);

      executeDependentAutorunFunctions(autorunCtx, obj, prop);
    };
  }

  Object.defineProperty(proto, prop, descriptor);
}

/**
 * Makes full reactive copy of prototype chain
 * @param obj - reactive object
 * @param source - object which prototype chain will be copied
 */
function createReactivePrototypeChain<T>(
  obj: ReactiveObject<T>,
  source: any
): any {
  const reactiveProtoRoot = {};

  let proto = source;
  let rProto: any = reactiveProtoRoot;
  // until the prototype chain ends
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

/**
 * Primitive cache factory
 */
const createSimpleCache = () => new MapCache();

/**
 * Creates a wrapper over an object that effectively recomputes getters
 * @param obj - object to be enhanced with reactive behavior
 * @param cacheFactory - optional, specifies getters cache factory
 */
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

  // copy own values from original object
  const objDescriptors = Object.getOwnPropertyDescriptors(obj);
  Object.keys(objDescriptors).forEach((prop) => {
    defineReactivePrimitive(reactiveWrapper, prop);
  });

  // copy full prototype chain
  // this step is mandatory because we need to make
  // properties from prototype chain also reactive
  // @ts-ignore
  reactiveWrapper.__proto__ = createReactivePrototypeChain(
    reactiveWrapper,
    obj
  );

  // @ts-ignore
  return reactiveWrapper as T;
}

export default reactive;
