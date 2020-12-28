interface AutorunExecutionContext {
  current: Function | undefined;
  // global registry for storing all autorun functions
  autorunRegistry: Map<Function, AutorunDeps>;
}

// Type that represents dependencies for autorun function
type AutorunDeps = Set<ObjectPropertyRef>;

// Reference to concrete property in concrete object
interface ObjectPropertyRef {
  obj: Object;
  prop: string;
}

export const GLOBAL_AUTORUN_CONTEXT: AutorunExecutionContext = {
  current: undefined,
  autorunRegistry: new Map<Function, AutorunDeps>()
};

export default function autorun(
  func: Function,
  ctx: AutorunExecutionContext = GLOBAL_AUTORUN_CONTEXT
) {
  ctx.current = func;
  // TODO: more genetic implementation of autorun context
  ctx.autorunRegistry.set(func, new Set());
  func();
  const deps = ctx.autorunRegistry.get(func);
  //console.log(deps);
  ctx.current = undefined;
}

export function recordAutorunDependency(
  ctx: AutorunExecutionContext,
  obj: Object,
  property: string
) {
  if (ctx.current) {
    const currentAutorunFuncDeps = ctx.autorunRegistry.get(ctx.current);
    if (currentAutorunFuncDeps) {
      currentAutorunFuncDeps.add({
        obj: obj,
        prop: property
      });
    }
  }
}

export function executeDependentAutorunFunctions(
  autorunCtx: AutorunExecutionContext,
  obj: Object,
  prop: string
) {
  autorunCtx.autorunRegistry.forEach((deps, func) => {
    // TODO: optimize
    const dependsOnProp = [...deps].some(
      (dep) => dep.obj === obj && dep.prop === prop
    );

    if (dependsOnProp) {
      func();
    }
  });
}
