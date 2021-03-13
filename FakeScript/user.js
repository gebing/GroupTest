(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// 设置用户自定义模块。其中：第1个参数为自定义函数，第2个参数为函数名称，第3个参数为函数执行时机，第4个参数为Frida Gadget模式的启动参数，第5个参数为Frida Server模式的启动参数。
// 函数名称为Frida Server模式命令行执行时调用的函数名称。为避免多个用户自定义模块同时载入时名称冲突，可以将函数名称'userFunc'改为不同的名称。
// 函数执行时机的可选值包括："NATIVE"表示目标应用Java加载前执行；"JAVA"表示在目标应用Java加载后执行；"CREATE"表示在目标应用onCreate函数前执行。缺省为："JAVA"。
// 如果Frida Gadget模式的启动参数不为空，则在Gadget模式下自动启动自定义模块。Gadget模式通常都设置为自动启动。
// 如果Frida Server模式的启动参数不为空，则在Server模式下自动启动自定义模块。Server模式通常在出现执行退出的问题或执行时机为"CREATE"时设置为自动启动。
const setupUserFunc = require('./user-utils');
setupUserFunc(userFunc, "userFunc", "JAVA", [LOG_TRACE_MATCH], []);

// 用户自定义函数的功能代码。其中：函数的第1个参数必须是日志记录标志，其他参数为可选的命令行附件参数。
// noinspection JSUnusedLocalSymbols
function userFunc(logFlag, extraArgs) {
}


},{"./user-utils":2}],2:[function(require,module,exports){
(function (global){(function (){
// 包含拦截常量定义和基础工具类。
require('../../runner/constant');

/**
 * 设置用户自定义模块
 * @param {Function} funcDef    自定义模块的函数对象。
 * @param {String}   funcName   自定义模块的函数名。当同时载入多个用户自定义模块时，为避免名称冲突，需要提供不同的函数名称。
 * @param {String=}  funcStage  自定义模块的执行时机。可选值包括："NATIVE"表示目标应用Java加载前执行；"JAVA"表示在目标应用Java加载后执行；"CREATE"表示在目标应用onCreate函数前执行。缺省为："JAVA"。
 * @param {*|Array=} gadgetArgs Gadget模式自动启动时，用户自定义模块的执行参数。如果为空，则Gadget模式不自动启动。
 * @param {*|Array=} serverArgs Server模式自动启动时，用户自定义模块的执行参数。如果为空，则Server模式不自动启动。
 * @returns {Boolean} 设置成功或失败。
 */
function setupUserFunc(funcDef, funcName, funcStage, gadgetArgs, serverArgs) {
  if (typeof funcDef !== "function") return false;
  funcName = funcName || funcDef.name;
  funcStage = (funcStage || "JAVA").toUpperCase();
  gadgetArgs = Array.isArray(gadgetArgs) ? gadgetArgs : gadgetArgs !== null && gadgetArgs !== undefined ? [gadgetArgs] : [];
  serverArgs = Array.isArray(serverArgs) ? serverArgs : serverArgs !== null && serverArgs !== undefined ? [serverArgs] : [];
	// 设置全局用户自定义模块
	global[funcName] = function (logFlag, extraArgs) {
		extraArgs = [].slice.call(arguments);
		console.setLogger(logFlag);
		Object.showErrorStack(true);
		if (funcStage === "NATIVE") funcDef.apply(null, extraArgs);
    else if (funcStage === "JAVA") Java.perform(function () { funcDef.apply(null, extraArgs); });
    else if (funcStage === "CREATE") Java.perform(function () { Module.hookJava("android.app.Application.onCreate()", function () { funcDef.apply(null, extraArgs); }, logFlag); });
		return funcName + "(" + hookConstantName(logFlag) + (extraArgs.length > 1 ? "," + extraArgs.slice(1).map(function(v) { return JSON.stringify(v); }).join(",") : "") + ")=" + funcStage;
  };
	// 如果是Gadget模式，则直接启动用户自定义模块
  if (gadgetArgs.length && Module.isGadgetMode()) global[funcName].apply(null, gadgetArgs);
  if (serverArgs.length && !Module.isGadgetMode()) global[funcName].apply(null, serverArgs);
  return true;
}

module.exports = setupUserFunc;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../runner/constant":3}],3:[function(require,module,exports){
(function (global){(function (){
'use strict';

require('../utils/ObjectUtils');
require('../utils/HookUtils');
require('../utils/LogUtils');

// 全局常量定义及相关工具函数

// 全局探测模式的LogFlag常量定义。类型：整数，按位决定对应的功能。其中：TRACE_XXX为基本探测常量，DEBUG_XXX为显示调用堆栈的探测常量，LOG_XXX为输出到Logcat的探测常量。
global.TRACE_ALL = Module.HOOK_MATCH | Module.HOOK_SETUP | Module.HOOK_TRACE;
global.TRACE_MATCH = Module.HOOK_SETUP | Module.HOOK_MATCH;
global.TRACE_MISSED = Module.HOOK_SETUP | Module.HOOK_TRACE;

global.DEBUG_ALL = TRACE_ALL | Module.STACK_TRACE;
global.DEBUG_MATCH = TRACE_MATCH | Module.STACK_TRACE;
global.DEBUG_MISSED = TRACE_MISSED | Module.STACK_TRACE;

global.LOG_TRACE_ALL = TRACE_ALL | console.OUTPUT_LOG;
global.LOG_TRACE_MATCH = TRACE_MATCH | console.OUTPUT_LOG;
global.LOG_TRACE_MISSED = TRACE_MISSED | console.OUTPUT_LOG;

global.LOG_DEBUG_ALL = DEBUG_ALL | console.OUTPUT_LOG;
global.LOG_DEBUG_MATCH = DEBUG_MATCH | console.OUTPUT_LOG;
global.LOG_DEBUG_MISSED = DEBUG_MISSED | console.OUTPUT_LOG;

// 全局伪装模式的LogFlag常量定义。类型：整数，按位决定对应的功能。其中：FAKE_XXX为基本伪装常量，LOG_XXX为输出到Logcat的探测常量。
global.FAKE_MATCH = TRACE_MATCH;
global.FAKE_MISSED = TRACE_MISSED;
global.LOG_FAKE_MATCH = LOG_TRACE_MATCH;
global.LOG_FAKE_MISSED = LOG_TRACE_MISSED;

global.hookConstantValue = global.reduce(function (p, v, k) {
	return k.startsWith("TRACE_") || k.startsWith("DEBUG_") || k.startsWith("FAKE_") || k.startsWith("LOG_") ? p.concat(k) : p;
}, []);

global.hookConstantName = function (val) {
	return hookConstantValue.find(function(v) { return global[v] === val; }) || val;
};

global.hookConstantConfig = function (config) {
	return Object.merge({map: {"logFlag": hookConstantName}}, config);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils/HookUtils":4,"../utils/LogUtils":6,"../utils/ObjectUtils":9}],4:[function(require,module,exports){
'use strict';

require('./ModuleUtils');
require('./ObjectUtils');
require('./NativeUtils');
require('./JavaUtils');
// require('./IosUtils');

// 拦截工具函数。
Module.HOOK_MATCH = 0x1;
Module.HOOK_SETUP = 0x2;
Module.HIDE_ERROR = 0x10;
Module.HOOK_TRACE = 0x100;
Module.STACK_TRACE = 0x200;

var _logFlag = Module.HOOK_SETUP | Module.HOOK_MATCH;

Module.getJavaFunc = function (funcName, dispName, classLoader, ignoreClasses) {
  // 从函数定义中解析函数名和参数类型
  const match = /^ *([^() ]+)\.([^(). ]+)(?:\(([^()]*)\))? *$/g.exec(funcName);
  if (!match) throw Error(funcName + " is invalid.");
  const clazz = match[1];
  const method = match[2];
  const params = match[3] === undefined ? null : !match[3].trim().length ? [] : match[3].replace(/[ '"]/g, '').split(',');
  // 获取指定Java类的指定名称和参数类型的函数对象
  const funcPtr = Module.hookJavaUse(clazz, classLoader, false, ignoreClasses)[method];
  if (!funcPtr) throw Error(funcName + " is not found.");
  const funcObj = params ? funcPtr.overload.apply(funcPtr, params) : funcPtr.overloads.length === 1 ? funcPtr.overloads[0] : null;
  if (!funcObj) throw Error(funcName + " is not match.");
  funcObj.dispName = (dispName ? dispName + "/" : "") + clazz + "." + method;
  return funcObj;
};

Module.getIosFunc = function (funcName, dispName) {
  // 从函数定义中解析函数名和参数类型
  const match = /^ *([+-])? *\[ *([^ ]+) +([^ \]]+) *] *$/g.exec(funcName);
  if (!match) throw Error(funcName + " is invalid.");
  const prefix = match[1] ? match[1] : "+";
  const clazz = match[2];
  const method = match[3];
  // 获取指定Java类的指定名称和参数类型的函数对象
  const funcObj = Object.get(ObjC.classes, clazz, prefix + " " + method);
  if (!funcObj) throw Error(funcName + " is not found.");
  funcObj.dispName = (dispName ? dispName + "/" : "") + prefix + "[" + clazz + " " + method + "]";
  funcObj.transDef = ObjC.parseTypeDef(funcObj.types);
  funcObj.retType = funcObj.returnType;
  funcObj.argTypes = funcObj.argumentTypes;
  return funcObj;
};

Module.getNativeFunc = function (funcName, dispName, fastMode) {
  // 从函数定义中解析函数名和参数类型
  const match = /^ *([^() ]+) +(?:([^() ]*)([.:]))?([^(). ]+)\(([^()]*)\) *$/g.exec(funcName);
  if (!match) throw Error(funcName + " is invalid.");
  const retType = match[1];
  const module = match[2] || null;
  const isObjC = match[3] === ':';
  const method = match[4];
  const argTypes = !match[5].trim().length ? [] : match[5].replace(/[ '"]/g, '').split(',');
  // 获取指定函数对象
  const funcPtr = method.indexOf('*') === -1 && !isObjC ? Module.findExportByName(module, method) : Module.findExportByMatch(module, method, isObjC);
  if (!funcPtr) throw Error(funcName + " is not found.");
  const transDef = fastMode ? null : {
    retType: Object.getTypeDef(retType),
    argTypes: argTypes.map(Object.getTypeDef)
  };
  const typeDef = fastMode ? {
    retType,
    argTypes
  } : {
    retType: transDef.retType.type,
    argTypes: transDef.argTypes.map(function (v) {
      return v.type;
    })
  };
  const funcObj = new NativeFunction(funcPtr, typeDef.retType, typeDef.argTypes);
  funcObj.dispName = (dispName ? dispName + "/" : "") + retType + " " + (module ? module + "." : "") + method;
  funcObj.transDef = transDef;
  funcObj.retType = typeDef.retType;
  funcObj.argTypes = typeDef.argTypes;
  return funcObj;
};

function _assertValidFunc(x) {
  if (!x) throw Error("funcName is empty.");
}

function _assertValidJava(x) {
  return typeof x !== "object" ? x !== undefined : x === null || Object.isArrayLike(x) || Object.isJava(x, true) || x instanceof Int64;
}

function _assertValidNative(x) {
  return typeof x !== "object" ? x !== undefined : x === null || Array.isArray(x) || Object.isObjC(x) || x instanceof NativePointer || x instanceof Int64 || x instanceof UInt64;
}

Module.hookJava = function (funcName, funcValue, afterOrig, logFlag, extraArgs) {
  try {
    // 从函数参数或参数对象中获取相关参数。其中：funcOptions只会合并对象类型的参数数据
    const funcOptions = Object.flatten(arguments);
    _assertValidFunc(funcName = typeof funcName === "string" ? funcName : funcOptions.funcName);
    funcValue = _assertValidJava(funcValue) ? funcValue : funcOptions.funcValue;
    afterOrig = typeof afterOrig === "boolean" ? afterOrig : funcOptions.afterOrig;
    logFlag = typeof logFlag === "number" ? logFlag : typeof funcOptions.logFlag === "number" ? funcOptions.logFlag : _logFlag;
    // 获取指定的函数对象
    funcName = funcOptions.clsObject ? Java.getClassName(funcOptions.clsObject) + "." + funcName : (funcOptions.libName ? funcOptions.libName + "." : "") + (funcOptions.clsName ? funcOptions.clsName + "." : "") + funcName;
    const funcObj = Module.getJavaFunc(funcName, funcOptions.dispName, Java.getClassLoader(funcOptions.clsObject), funcOptions.clsIgnore || []);
    // 拦截指定的函数实现
    const oldImpl = funcObj.implementation;
    funcObj.implementation = function () {
      const ctx = {
        name: funcObj.dispName,
        func: funcObj,
        caller: this,
        args: [].slice.call(arguments),
        self: this,
        log: logFlag
      };
      if (afterOrig) ctx.val = ctx.func.apply(ctx.caller, ctx.args);
      try {
        const hookResult = typeof funcValue === "function" ? funcValue(ctx) : funcValue;
        if (hookResult !== undefined) return Module.hookJavaLog(ctx.log, true, ctx.name, ctx.args, hookResult, null, ctx.stacks);
      } catch (ex) {
        throw Module.hookJavaLog(ctx.log, true, ctx.name, ctx.args, null, ex, ctx.stacks);
      }
      if (!afterOrig) ctx.val = ctx.func.apply(ctx.caller, ctx.args);
      return Module.hookJavaLog(ctx.log, false, ctx.name, ctx.args, ctx.val, null, ctx.stacks);
    };
    if ((logFlag & Module.HOOK_SETUP) !== 0) console.log("hookJava: " + funcName + " hook success.");
    return oldImpl;
  } catch (ex) {
    if ((logFlag & Module.HIDE_ERROR) === 0) console.warn("hookJava: " + funcName + " hook failed!\n" + ex.stack);
    return undefined;
  }
};

Module.unhookJava = function (funcName, logFlag, clazz, implement) {
  logFlag = typeof logFlag === "number" ? logFlag : _logFlag;
  implement = typeof implement === "function" ? implement : null;
  funcName = (clazz ? Java.getClassName(clazz) + "." : "") + funcName;
  try {
    const funcObj = Module.getJavaFunc(funcName, null, Java.getClassLoader(clazz));
    const oldImpl = funcObj.implementation;
    if (oldImpl === implement) return oldImpl;
    funcObj.implementation = implement;
    if ((logFlag & Module.HOOK_SETUP) !== 0) console.log("hookJava: " + funcName + " unhook success.");
    return oldImpl;
  } catch (ex) {
    if ((logFlag & Module.HIDE_ERROR) === 0) console.warn("hookJava: " + funcName + " unhook failed!\n" + ex.toString());
    return undefined;
  }
};

function _retToJs(trans, ret) {
  return Object.fromNative(trans.retType, ret);
}

function _argsToJs(trans, args) {
  return args.map(function (v, i) {
    return Object.fromNative(trans.argTypes[i], v);
  });
}

function _returnVal(trx, nv, jv) {
  if (!trx || (nv === undefined && jv === undefined)) return nv !== undefined ? nv : jv;
  trx.retVal = jv !== undefined ? jv : _retToJs(trx.trans, nv);
  return nv !== undefined ? nv : Object.toNative(trx.trans.retType, jv);
}

function _nativeVal(trx, v) {
  return !trx || v === undefined ? undefined : trx.trans.funcVal !== undefined ? trx.trans.funcVal : (trx.trans.funcVal = Object.toNative(trx.trans.retType, v));
}

Module.hookIos = function (funcName, funcValue, afterOrig, logFlag, extraArgs) {
  try {
    // 从函数参数或参数对象中获取相关参数。其中：funcOptions只会合并对象类型的参数数据
    const funcOptions = Object.flatten(arguments);
    _assertValidFunc(funcName = typeof funcName === "string" ? funcName : funcOptions.funcName);
    funcValue = _assertValidNative(funcValue) ? funcValue : funcOptions.funcValue;
    afterOrig = typeof afterOrig === "boolean" ? afterOrig : funcOptions.afterOrig;
    logFlag = typeof logFlag === "number" ? logFlag : typeof funcOptions.logFlag === "number" ? funcOptions.logFlag : _logFlag;
    // 获取指定的函数对象
    funcName = funcOptions.clsObject ? funcName.replace("[", "[" + funcOptions.clsObject.$className + " ") : funcOptions.clsName ? funcName.replace("[", "[" + funcOptions.clsName + " ") : funcName;
    const funcObj = Module.getIosFunc(funcName, funcOptions.dispName);
    const hideSelf = !!funcOptions.hideSelf;
    funcObj.funcImpl = function () {
      return _returnVal(this, funcObj.implementation.apply(funcObj.implementation, [].slice.call(arguments)));
    };
    // 为避免出现内存异常，先清除原有拦截函数
    Interceptor.revert(funcObj.implementation);
    Interceptor.flush();
    // 拦截指定的函数实现
    Interceptor.replace(funcObj.implementation, new NativeCallback(function () {
      const ctx = {
        name: funcObj.dispName,
        func: funcObj.funcImpl,
        caller: {
          trans: funcObj.transDef,
          hideSelf
        },
        args: [].slice.call(arguments),
        self: this,
        log: logFlag,
        revert: funcObj.implementation
      };
      if (afterOrig) ctx.val = ctx.func.apply(ctx.caller, ctx.args);
      try {
        if (ctx.caller && typeof funcValue === "function") ctx.caller.argVals = _argsToJs(ctx.caller.trans, ctx.args);
        const hookResult = typeof funcValue === "function" ? _returnVal(ctx.caller, undefined, funcValue(ctx)) : _returnVal(ctx.caller, _nativeVal(ctx.caller, funcValue), funcValue);
        if (hookResult !== undefined) return Module.hookIosLog(ctx.log, true, ctx.name, ctx.args, hookResult, null, ctx.self, ctx.caller);
      } catch (ex) {
        throw Module.hookIosLog(ctx.log, true, ctx.name, ctx.args, null, ex, ctx.self, ctx.caller);
      }
      if (!afterOrig) ctx.val = ctx.func.apply(ctx.caller, ctx.args);
      return Module.hookIosLog(ctx.log, false, ctx.name, ctx.args, ctx.val, null, ctx.self, ctx.caller);
    }, funcObj.retType, funcObj.argTypes));
    Interceptor.flush();
    if ((logFlag & Module.HOOK_SETUP) !== 0) console.log("hookIos: " + funcName + " hook success.");
    return funcObj;
  } catch (ex) {
    if ((logFlag & Module.HIDE_ERROR) === 0) console.warn("hookIos: " + funcName + " hook failed!\n" + ex.stack);
    return undefined;
  }
};

Module.unhookIos = function (funcName, logFlag) {
  logFlag = typeof logFlag === "number" ? logFlag : _logFlag;
  try {
    const funcObj = Module.getIosFunc(funcName);
    Interceptor.revert(funcObj.implementation);
    Interceptor.flush();
    if ((logFlag & Module.HOOK_SETUP) !== 0) console.log("hookIos: " + funcName + " unhook success.");
    return funcObj;
  } catch (ex) {
    if ((logFlag & Module.HIDE_ERROR) === 0) console.warn("hookIos: " + funcName + " unhook failed!\n" + ex.toString());
    return undefined;
  }
};

Module.hookNative = function (funcName, funcValue, afterOrig, logFlag, extraArgs) {
  try {
    // 从函数参数或参数对象中获取相关参数。其中：funcOptions只会合并对象类型的参数数据
    const funcOptions = Object.flatten(arguments);
    _assertValidFunc(funcName = typeof funcName === "string" ? funcName : funcOptions.funcName);
    funcValue = _assertValidNative(funcValue) ? funcValue : funcOptions.funcValue;
    afterOrig = typeof afterOrig === "boolean" ? afterOrig : funcOptions.afterOrig;
    logFlag = typeof logFlag === "number" ? logFlag : typeof funcOptions.logFlag === "number" ? funcOptions.logFlag : _logFlag;
    // 获取指定的函数对象
    funcName = funcOptions.libName ? funcName.replace(/ +([^ ()]+)\(/g, " " + funcOptions.libName + ".$1(") : funcName;
    const funcObj = Module.getNativeFunc(funcName, funcOptions.dispName, funcOptions.fastMode);
    funcObj.funcImpl = function () {
      return _returnVal(this, funcObj.apply(funcObj, [].slice.call(arguments)));
    };
    // 为避免出现内存异常，先清除原有拦截函数
    Interceptor.revert(funcObj);
    Interceptor.flush();
    // 拦截指定的函数实现
    Interceptor.replace(funcObj, new NativeCallback(function () {
      const ctx = {
        name: funcObj.dispName,
        func: funcObj.funcImpl,
        caller: funcObj.transDef ? {
          trans: funcObj.transDef
        } : null,
        args: [].slice.call(arguments),
        self: this,
        log: logFlag,
        revert: funcObj
      };
      if (afterOrig) ctx.val = ctx.func.apply(ctx.caller, ctx.args);
      try {
        if (ctx.caller && typeof funcValue === "function") ctx.caller.argVals = _argsToJs(ctx.caller.trans, ctx.args);
        const hookResult = typeof funcValue === "function" ? _returnVal(ctx.caller, undefined, funcValue(ctx)) : _returnVal(ctx.caller, _nativeVal(ctx.caller, funcValue), funcValue);
        if (hookResult !== undefined) return ctx.caller ? Module.hookNativeLog(ctx.log, true, ctx.name, ctx.args, hookResult, null, ctx.self, ctx.caller) : hookResult;
      } catch (ex) {
        throw (ctx.caller ? Module.hookNativeLog(ctx.log, true, ctx.name, ctx.args, null, ex, ctx.self, ctx.caller) : ex);
      }
      if (!afterOrig) ctx.val = ctx.func.apply(ctx.caller, ctx.args);
      return ctx.caller ? Module.hookNativeLog(ctx.log, false, ctx.name, ctx.args, ctx.val, null, ctx.self, ctx.caller) : ctx.val;
    }, funcObj.retType, funcObj.argTypes));
    Interceptor.flush();
    if ((logFlag & Module.HOOK_SETUP) !== 0) console.log("hookNative: " + funcName + " hook success.");
    return funcObj;
  } catch (ex) {
    if ((logFlag & Module.HIDE_ERROR) === 0) console.warn("hookNative: " + funcName + " hook failed!\n" + ex.stack);
    return undefined;
  }
};

Module.unhookNative = function (funcName, logFlag) {
  logFlag = typeof logFlag === "number" ? logFlag : _logFlag;
  try {
    const funcObj = Module.getNativeFunc(funcName);
    Interceptor.revert(funcObj);
    Interceptor.flush();
    if ((logFlag & Module.HOOK_SETUP) !== 0) console.log("hookNative: " + funcName + " unhook success.");
    return funcObj;
  } catch (ex) {
    if ((logFlag & Module.HIDE_ERROR) === 0) console.warn("hookNative: " + funcName + " unhook failed!\n" + ex.toString());
    return undefined;
  }
};

Module.hookJavaLog = function (log, fake, method, args, val, error, stacks) {
  if ((fake && (log & Module.HOOK_MATCH) !== 0) || (!fake && (log & Module.HOOK_TRACE) !== 0)) {
    console.log("hookJava: " + (fake ? "fake " : "trace ") + method + "(" + args + (error ? ")=" + "throw " + error : val !== undefined ? ")=" + String(val) : ")") +
      ((log & Module.STACK_TRACE) !== 0 ? ", StackTrace:\n    " + (stacks || Module.getJavaStackTrace(error)).join('\n    ') : ""));
  }
  return error || val;
};

function _transVal(trx, val) {
  return trx.retVal !== undefined ? trx.retVal : _retToJs(trx.trans, val);
}

function _transArgs(trx, args) {
  return Array.isArray(trx.argVals) ? trx.argVals : _argsToJs(trx.trans, args);
}

Module.hookIosLog = function (log, fake, method, args, val, error, self, trx) {
  function _param(list) {
    return (method[0] !== '-' || trx.hideSelf ? [] : [list[0]]).concat(list.slice(2));
  }
  if ((fake && (log & Module.HOOK_MATCH) !== 0) || (!fake && (log & Module.HOOK_TRACE) !== 0)) {
    const _val = !error && val !== undefined && trx ? _transVal(trx, val) : val;
    const _args = Array.isArray(args) && trx ? _param(_transArgs(trx, args)).map(String) : args;
    console.log("hookIos: " + (fake ? "fake " : "trace ") + method + "(" + _args + (error ? ")=" + "throw " + error : _val !== undefined ? ")=" + String(_val) : ")") +
      ((log & Module.STACK_TRACE) !== 0 ? ", StackTrace:\n    " + Module.getNativeStackTrace(self).join('\n    ') : ""));
  }
  return error || val;
};

Module.hookNativeLog = function (log, fake, method, args, val, error, self, trx) {
  if ((fake && (log & Module.HOOK_MATCH) !== 0) || (!fake && (log & Module.HOOK_TRACE) !== 0)) {
    const _val = !error && val !== undefined && trx ? _transVal(trx, val) : val;
    const _args = Array.isArray(args) && trx ? _transArgs(trx, args).map(String) : args;
    console.log("hookNative: " + (fake ? "fake " : "trace ") + method + "(" + _args + (error ? ")=" + "throw " + error : _val !== undefined ? ")=" + String(_val) : ")") +
      ((log & Module.STACK_TRACE) !== 0 ? ", StackTrace:\n    " + Module.getNativeStackTrace(self).join('\n    ') : ""));
  }
  return error || val;
};

Module.hookHideLog = function (ctx, val, error) {
  ctx.log = 0;
  if (error) throw error;
  else return val;
};

Module.getJsArgument = function (ctx, idx) {
  return ctx.caller.argVals[idx];
};

Module.setJsArgument = function (ctx, idx, val) {
  ctx.caller.argVals[idx] = val;
  ctx.args[idx] = Object.toNative(ctx.caller.trans.argTypes[idx], val);
};

Module.clearJsArgument = function (ctx) {
  ctx.caller.argVals = null;
};

const _postCallbacks = {};
Module.hookNativeLoad = function (preCallback, postCallbacks, logFlag) {
  const traceMode = logFlag & Module.HOOK_TRACE;
  // 拦截载入模块so的函数
  if (traceMode || typeof preCallback === "function" || (!Object.keys(_postCallbacks).length && Object.keys(postCallbacks).length)) {
    Module.hookNative("pointer libc.so.dlopen(string, int)", function (ctx) {
      // 调用so模块载入前的回调函数。如果回调函数返回非undefined，则直接返回对应值并终止载入so模块的操作
      if (typeof preCallback === "function" && (ctx.val = preCallback(ctx)) !== undefined) return ctx.val;
      // 获取载入模块的名称，如果载入模块无对应载入后的回调函数，则直接返回undefined执行原始载入so模块的操作
      const loadName = ctx.caller.argVals[0].substring(ctx.caller.argVals[0].lastIndexOf('/') + 1);
      if (!_postCallbacks[loadName]) return undefined;
      // 执行载入so模块的操作，如果载入失败，则直接返回载入操作返回值
      ctx.val = ctx.func.apply(ctx.caller, ctx.args);
      if (!ctx.val || ctx.val.isNull()) return ctx.val;
      // 调用so模块载入后的回调函数，并删除对应的载入后回调函数
      if (typeof _postCallbacks[loadName] === "function") _postCallbacks[loadName](ctx);
      delete _postCallbacks[loadName];
      // 如果非traceMode且无载入前的回调函数，在载入后的回调函数配置对象为空时取消拦截回调函数
      if (!traceMode && typeof preCallback !== "function" && !Object.keys(_postCallbacks).length) Interceptor.revert(ctx.revert);
      // 返回原始载入结果
      return ctx.val;
    }, {
      logFlag
    });
  }
  // 保存载入后的回调函数对象
  Object.merge(_postCallbacks, postCallbacks);
};

Module.hookJavaUse = function (className, classLoader, ignoreError, ignoreClasses) {
  ignoreClasses = Array.isArray(ignoreClasses) ? ignoreClasses : [].slice.call(arguments, 3);
  const classObject = Java.use("java.lang.Object").class;
  const classOverload = !ignoreClasses.length ? null : (classLoader ? classLoader : Java.use("java.lang.ClassLoader")).loadClass.overload('java.lang.String');
  const oldImpl = classOverload ? classOverload.implementation : null;
  const oldLoader = classLoader ? Java.classFactory.loader : null;
  if (classLoader) Java.classFactory["loader"] = classLoader || null;
  if (classOverload) classOverload.implementation = function (name) {
    try {
      return classOverload.call(this, name);
    } catch (error) {
      if (error.message.indexOf("java.lang.ClassNotFoundException") < 0 || ignoreClasses.indexOf(name) < 0) throw error;
      return classObject;
    }
  };
  try {
    return Java.use(className);
  } catch (error) {
    if (!ignoreError) throw error;
    return null;
  } finally {
    if (classOverload) classOverload.implementation = oldImpl;
    if (classLoader) Java.classFactory["loader"] = oldLoader;
  }
};

Module.setLogFlag = function (logFlag) {
  if (typeof logFlag === "number") _logFlag = logFlag;
};

Module.getLogFlag = function () {
  return _logFlag;
};

},{"./JavaUtils":5,"./ModuleUtils":7,"./NativeUtils":8,"./ObjectUtils":9}],5:[function(require,module,exports){
'use strict';

require('./ObjectUtils');

// Java对象操作工具函数
var _classObj;

Java.isInstanceOf = function (javaWrapper, javaClass) {
  return Object.isJava(javaWrapper, true) && (typeof javaClass === "string" ? Java.use(javaClass) : javaClass).class.isInstance(javaWrapper);
};

Java.getClass = function (javaWrapper) {
  if (!_classObj) _classObj = Java.use("java.lang.Class");
  return javaWrapper ? Java.cast(Java.isInstanceOf(javaWrapper, _classObj) ? javaWrapper : javaWrapper.getClass(), _classObj) : null;
};

Java.getClassName = function (javaWrapper) {
  return javaWrapper ? Java.getClass(javaWrapper).getName() : null;
};

Java.getClassLoader = function (javaWrapper) {
  return javaWrapper ? Java.getClass(javaWrapper).getClassLoader() : null;
};

var _classCharacter;
var _classCharset;
var _classByteBuffer;
var _classCharBuffer;
var _actionReport;
Java.getString = function (bytes, charset) {
  /** @prop {Function} newDecoder */ /** @prop {Function} onMalformedInput */ /** @prop {Function} onUnmappableCharacter */
  /** @prop {Function} allocate */ /** @prop {Function} decoder.decode */ /** @prop {Function} wrap */ /** @prop {Function} flip */
  /** @prop {Function} isError */ /** @prop {Function} isMalformed */ /** @prop {Function} isUnmappable */
  if (!bytes || !bytes.length) return null;
  if (!_classCharacter) _classCharacter = Java.use("java.lang.Character");
  if (!_classByteBuffer) _classByteBuffer = Java.use("java.nio.ByteBuffer");
  if (!_classCharBuffer) _classCharBuffer = Java.use("java.nio.CharBuffer");
  if (!_classCharset) _classCharset = Java.use("java.nio.charset.Charset");
  if (!_actionReport) _actionReport = Java.use('java.nio.charset.CodingErrorAction').REPORT.value;
  charset = typeof charset === "string" ? _classCharset.forName(charset) : !charset ? _classCharset.forName("UTF-8") : charset;
  const decoder = charset.newDecoder().onMalformedInput(_actionReport).onUnmappableCharacter(_actionReport);
  const buffer = _classCharBuffer.allocate(bytes.length);
  const result = decoder.decode(_classByteBuffer.wrap(bytes), buffer, false);
  if (result.isError() || result.isMalformed() || result.isUnmappable()) return null;
  const cnt = Math.min(16, buffer.flip().length());
  for (var i = 0; i < cnt; i++) if (_classCharacter.isISOControl(buffer.get(i)) && !_classCharacter.isWhitespace(buffer.get(i))) return null;
  try {
    return buffer.toString();
  } catch (ex) {
    return null;
  }
};

Java.httpProxy = function (host, port) {
  return Java.use('java.net.Proxy').$new(Java.use('java.net.Proxy$Type').HTTP.value, Java.use('java.net.InetSocketAddress').$new(host, port));
};


},{"./ObjectUtils":9}],6:[function(require,module,exports){
'use strict';

// 日志输出工具函数，输出信息到Logcat和日志文件。

// 日志输出级别常量
console.OUTPUT_LOG = 0x8000;
console.LEVEL_DEBUG = 0x1000;
console.LEVEL_INFO = 0x2000;
console.LEVEL_WARN = 0x3000;
console.LEVEL_ERROR = 0x4000;
console.LEVEL_NONE = 0x7000;

// 输出到Frida控制台
const _logConsole = {
  d: console.log,
  i: console.log,
  w: console.warn,
  e: console.error,
  f: function (file, msg) { this.d("[" + file + "] " + [].slice.call(arguments, 1).join(' ')); },
};

// 输出到Android的Logcat
const _logLogcat = {
  d: function () { this.log("jbptweak", "d", [].join.call(arguments, ' ')); },
  i: function () { this.log("jbptweak", "i", [].join.call(arguments, ' ')); },
  w: function () { this.log("jbptweak", "w", [].join.call(arguments, ' ')); },
  e: function () { this.log("jbptweak", "e", [].join.call(arguments, ' ')); },
  f: function (file, msg) { this.log("jbptweak" + "-" + file, "d", [].slice.call(arguments, 1).join(' ')); },
  log: function(tag, level, msg) {
    Java.perform(function() {
      if (!_logLogcat._log) _logLogcat._log = Java.use("android.util.Log");
      _logLogcat._log[level](tag, msg);
    });
  }
};

// 输出到iOS的NSLog
const _logNSLog = {
  d: function () { this.log("jbptweak", "DEBUG", [].join.call(arguments, ' ')); },
  i: function () { this.log("jbptweak", "INFO", [].join.call(arguments, ' ')); },
  w: function () { this.log("jbptweak", "WARN", [].join.call(arguments, ' ')); },
  e: function () { this.log("jbptweak", "ERROR", [].join.call(arguments, ' ')); },
  f: function (file, msg) { this.log("jbptweak" + "-" + file, "DEBUG", [].slice.call(arguments, 1).join(' ')); },
  log: function(tag, level, msg) {
    setTimeout(function() {
      /** @prop {Function} init */
      if (!_logNSLog._log) _logNSLog._log = new NativeFunction(Module.findExportByName('Foundation', 'NSLog'),'void', ['pointer', '...']);
      if (!_logNSLog._string) _logNSLog._string = ObjC.classes.NSString;
      if (!_logNSLog._pool) _logNSLog._pool = ObjC.classes.NSAutoreleasePool;
      const pool = _logNSLog._pool.alloc().init();
      _logNSLog._log(_logNSLog._string.stringWithUTF8String_(Memory.allocUtf8String(tag + "/" + level + ": " + msg)));
      pool.release();
    });
  }
};

// 当前日志输出对象和输出级别
var _logLevel = console.LEVEL_DEBUG;
var _logTarget = _logConsole;

// 重定向console的输出定义
console.log = function (msg) { if (_logLevel <= console.LEVEL_DEBUG) _logTarget.d.apply(_logTarget, arguments); };
console.info = function (msg) { if (_logLevel <= console.LEVEL_INFO) _logTarget.i.apply(_logTarget, arguments); };
console.warn = function (msg) { if (_logLevel <= console.LEVEL_WARN) _logTarget.w.apply(_logTarget, arguments); };
console.error = function (msg) { if (_logLevel <= console.LEVEL_ERROR) _logTarget.e.apply(_logTarget, arguments); };
console.file = function (file, msg) { if (file) _logTarget.f.apply(_logTarget, arguments); else _logTarget.d.apply(_logTarget, [].slice.call(arguments, 1)); };

// 设置Log的输出对象和输出级别
console.setLogger = function (logTarget, logLevel) {
  function _logInstance() { return Process.platform === 'darwin' ? _logNSLog : _logLogcat; }
  const oldLevel = _logLevel;
  if (typeof logTarget === "number") {
    _logTarget = (logTarget & console.OUTPUT_LOG) !== 0 ? _logInstance() : _logConsole;
    _logLevel = logTarget & console.LEVEL_NONE;
  } else {
    _logTarget = (String(logTarget).toLowerCase() === "log" || logTarget === true) ? _logInstance() : _logConsole;
    _logLevel = typeof logLevel === "number" ? (logLevel & console.LEVEL_NONE) : String(logLevel).toLowerCase() === "error" ? console.LEVEL_ERROR : String(logLevel).toLowerCase() === "warn" ? console.LEVEL_WARN : String(logLevel).toLowerCase() === "info" ? console.LEVEL_INFO : console.LEVEL_DEBUG;
  }
  return oldLevel;
};

},{}],7:[function(require,module,exports){
'use strict';

// Native库工具函数
var _moduleMap = new ModuleMap();
var _apiResolverModule = new ApiResolver("module");
var _apiResolverObjC = ObjC.available ? new ApiResolver("objc") : null;
var _gadgetMode = Java.available ? Module.findBaseAddress("lib-jbptweak32.so") !== null || Module.findBaseAddress("lib-jbptweak64.so") !== null : ObjC.available ? Module.findBaseAddress("lib-jbptweak.dylib") : false;
var _classThrowable = null;

Module.findExportByMatch = function (module, pattern, objc) {
  const resolver = objc ? _apiResolverObjC : _apiResolverModule;
  // objc query format is: -[NS*Number foo:bar:], +[Foo foo*] or *[Bar baz]
  const filter = objc ? '*[' + module + ' ' +  pattern + ']' : 'exports:' + (module || '*') + '!' + pattern;
  const find = resolver.enumerateMatches(filter);
  return (find && find[0] && find[0].address) || null;
};

Module.findModuleByAddress = function(address) {
  if (!address) return null;
  const name = _moduleMap.findName(address);
  if (name) return name;
  _moduleMap.update();
  return _moduleMap.findName(address);
};

Module.getJavaStackTrace = function (ex) {
	/** @prop {Function} Object.getStackTrace */
  if (!_classThrowable) _classThrowable = Java.use('java.lang.Throwable');
  const imp = _classThrowable.getStackTrace.implementation;
  _classThrowable.getStackTrace.implementation = null;
  const val = ((ex && ex.getStackTrace) ? ex : _classThrowable.$new()).getStackTrace();
  _classThrowable.getStackTrace.implementation = imp;
  return val;
};

Module.getNativeStackTrace = function(self, debug) {
  const stacks = ((self && self.returnAddress) ? [self.returnAddress] : []).concat(Thread.backtrace(self && self.context, debug ? Backtracer.ACCURATE : Backtracer.FUZZY));
  return stacks.map(DebugSymbol.fromAddress);
};

Module.isGadgetMode = function () {
  return _gadgetMode;
};


},{}],8:[function(require,module,exports){
'use strict';

require('./ObjectUtils');

// Native类型转换工具函数
Object.toNative = function (type, val, keepTime) {
  return (type && typeof type === "object" ? type : Object.getTypeDef(type)).toNative(val, keepTime);
};

Object.fromNative = function (type, val, thisArg) {
  return (type && typeof type === "object" ? type : Object.getTypeDef(type)).fromNative(val, thisArg);
};

Object.fromNativeEx = function (type, val, extraParams) {
  if (!type || typeof type !== "object") type = Object.getTypeDef(type);
  return type.fromNativeEx ? type.fromNativeEx.apply(null, [].slice.call(arguments, 1)) : undefined;
};

Object.getTypeDef = function (type) {
  return _typeDefTable[type];
};

Object.setTypeDef = function (type, def) {
  return _typeDefTable[type] = def;
};

Object.keepPointer = function (pointer, milliseconds) {
  return setTimeout(function () { pointer = null; }, milliseconds > 0 ? milliseconds : 1) && pointer;
};

// NativePointer/Int64/UInt64数据转换函数
const _fn = new CModule('#include "glib.h"\n' +
    'uint64_t l2l(uint64_t l) {\n' +
    '  return l;\n' +
    '}\n' +
    'float p2f(void *p) {\n' +
    '  #if GLIB_SIZEOF_VOID_P == 4 || G_BYTE_ORDER == G_LITTLE_ENDIAN\n' +
    '  return *((float *) &p);\n' +
    '  #else\n' +
    '  return *((float *)(((char *) &p) + 4));\n' +
    '  #endif\n' +
    '}\n' +
    'double p2d(void *p) {\n' +
    '  #if GLIB_SIZEOF_VOID_P == 4\n' +
    '  return p2f(p);\n' +
    '  #else\n' +
    '  return *((double *) &p);\n' +
    '  #endif\n' +
    '}');
const _ul2l = new NativeFunction(_fn.l2l, "int64", ["uint64"]);
const _ul2i = new NativeFunction(_fn.l2l, "int32", ["uint64"]);
const _ul2ui = new NativeFunction(_fn.l2l, "uint32", ["uint64"]);
const _l2ul = new NativeFunction(_fn.l2l, "uint64", ["int64"]);
const _l2i = new NativeFunction(_fn.l2l, "int32", ["int64"]);
const _l2ui = new NativeFunction(_fn.l2l, "uint32", ["int64"]);
const _p2l = new NativeFunction(_fn.l2l, "int64", ["pointer"]);
const _p2ul = new NativeFunction(_fn.l2l, "uint64", ["pointer"]);
const _p2f = new NativeFunction(_fn.p2f, "float", ["pointer"]);
const _p2d = new NativeFunction(_fn.p2d, "double", ["pointer"]);

Int64.prototype.toInt64 = function () { return this; };
Int64.prototype.toUInt64 = function () { return _l2ul(this); };
Int64.prototype.toInt32 = function () { return _l2i(this); };
Int64.prototype.toUInt32 = function () { return _l2ui(this); };
Int64.prototype.toFloat = function () { return this.toNumber(); };
Int64.prototype.toDouble = function () { return this.toNumber(); };
UInt64.prototype.toInt64 = function () { return _ul2l(this); };
UInt64.prototype.toUInt64 = function () { return this; };
UInt64.prototype.toInt32 = function () { return _ul2i(this); };
UInt64.prototype.toUInt32 = function () { return _ul2ui(this); };
UInt64.prototype.toFloat = function () { return this.toNumber(); };
UInt64.prototype.toDouble = function () { return this.toNumber(); };
NativePointer.prototype.toUInt32 = function () { return _ul2ui(_p2ul(this)); };
NativePointer.prototype.toInt64 = function () { return _p2l(this); };
NativePointer.prototype.toUInt64 = function () { return _p2ul(this); };
NativePointer.prototype.toFloat = function () { return _p2f(this); };
NativePointer.prototype.toDouble = function () { return _p2d(this); };
NativePointer.prototype.readStdString = function () { return (this.readU8() & 1) === 0 ? this.add(1).readUtf8String() : this.add(2 * Process.pointerSize).readPointer().readUtf8String(); };

// 类型转换对象的映射表定义
const _typeDefTable = new Proxy({
    'void': { name: 'void', type: 'void', size: 0, read: _same, write: _same, fromNative: _same, toNative: _same },
    'bool': { name: 'bool', type: 'bool', size: 1, read: _invoke("readU8"), write: _invoke("writeU8"), fromNative: function (v) { return !!v; }, toNative: function (v) { return v ? 1 : 0; } },
    'char': { name: 'char', type: 'char', size: 1, read: _invoke("readS8"), write: _invoke("writeS8"), fromNative: _same, toNative: _toNativeNumber(_invoke("toInt32")) },
    'int': { name: 'int', type: 'int32', size: 4, read: _invoke("readS32"), write: _invoke("writeS32"), fromNative: _same, toNative: _toNativeNumber(_invoke("toInt32")) },
    'long': { name: 'long', type: 'int64', size: 8, read: _invoke("readS64"), write: _invoke("writeS64"), fromNative: _same, toNative: _toNativeNumber(_invoke("toInt64")) },
    'int8': { name: 'int8', type: 'char', size: 1, read: _invoke("readS8"), write: _invoke("writeS8"), fromNative: _same, toNative: _toNativeNumber(_invoke("toInt32")) },
    'int16': { name: 'int16', type: 'int16', size: 2, read: _invoke("readS16"), write: _invoke("writeS16"), fromNative: _same, toNative: _toNativeNumber(_invoke("toInt32")) },
    'int32': { name: 'int32', type: 'int32', size: 4, read: _invoke("readS32"), write: _invoke("writeS32"), fromNative: _same, toNative: _toNativeNumber(_invoke("toInt32")) },
    'int64': { name: 'int64', type: 'int64', size: 8, read: _invoke("readS64"), write: _invoke("writeS64"), fromNative: _same, toNative: _toNativeNumber(_invoke("toInt64")) },
    'uchar': { name: 'uchar', type: 'uchar', size: 1, read: _invoke("readU8"), write: _invoke("writeU8"), fromNative: _same, toNative: _toNativeNumber(_invoke("toUInt32")) },
    'uint': { name: 'uint', type: 'uint32', size: 4, read: _invoke("readU32"), write: _invoke("writeU32"), fromNative: _same, toNative: _toNativeNumber(_invoke("toUInt32")) },
    'ulong': { name: 'ulong', type: 'uint64', size: 8, read: _invoke("readU64"), write: _invoke("writeU64"), fromNative: _same, toNative: _toNativeNumber(_invoke("toUInt64")) },
    'uint8': { name: 'uint8', type: 'uchar', size: 1, read: _invoke("readU8"), write: _invoke("writeU8"), fromNative: _same, toNative: _toNativeNumber(_invoke("toUInt32")) },
    'uint16': { name: 'uint16', type: 'uint16', size: 2, read: _invoke("readU16"), write: _invoke("writeU16"), fromNative: _same, toNative: _toNativeNumber(_invoke("toUInt32")) },
    'uint32': { name: 'uint32', type: 'uint32', size: 4, read: _invoke("readU32"), write: _invoke("writeU32"), fromNative: _same, toNative: _toNativeNumber(_invoke("toUInt32")) },
    'uint64': { name: 'uint64', type: 'uint64', size: 8, read: _invoke("readU64"), write: _invoke("writeU64"), fromNative: _same, toNative: _toNativeNumber(_invoke("toUInt64")) },
    'float': { name: 'float', type: 'float', size: 4, read: _invoke("readFloat"), write: _invoke("writeFloat"), fromNative: _same, toNative: _toNativeNumber(_invoke("toFloat")) },
    'double': { name: 'double', type: 'double', size: 8, read: _invoke("readDouble"), write: _invoke("writeDouble"), fromNative: _same, toNative: _toNativeNumber(_invoke("toDouble")) },
    'pointer': { name: 'pointer', type: 'pointer', size: Process.pointerSize, read: _invoke("readPointer"), write: _invoke("writePointer"), fromNative: _fromNativePointer(_same), toNative: _toNativePointer(_chainS(ptr)) },
    'string': { name: 'string', type: 'pointer', size: Process.pointerSize, read: _invoke("readPointer"), write: _invoke("writePointer"), fromNative: _fromNativePointer(_chain1(_invoke("readUtf8String"))), toNative: _toNativePointer(_chainM(Memory.allocUtf8String)) },
    'wstring': { name: 'wstring', type: 'pointer', size: Process.pointerSize, read: _invoke("readPointer"), write: _invoke("writePointer"), fromNative: _fromNativePointer(_chain1(_invoke("readUtf16String"))), toNative: _toNativePointer(_chainM(Memory.allocUtf16String)) },
  }, {
  get: function (target, property, proxy) {
    var match;
    property = property ? property.replace(/ /g, "") : "";
    if (target.hasOwnProperty(property)) return target[property];
    if ((match = /^(.+)\*$/g.exec(property)) !== null) {
      // 格式：type*，带子类型的不定长数组类型
      const type = proxy[match[1]];
      return target[property] = Object.assign({}, proxy["pointer"], { name: type.name + "*", fromNativeEx: _fromNativeArrayEx(type), toNative: _toNativeArray(type) });
    } else if ((match = /^(.+)\[(\d+)]$/g.exec(property)) !== null) {
      // 格式：type[n]，带子类型的定长数组类型
      const type = proxy[match[1]], count = +match[2];
      return target[property] = Object.assign({}, proxy["pointer"], { name: type.name + "[" + count + "]", fromNative: _fromNativeArray(type, count), toNative: _toNativeArray(type, count) });
    } else if ((match = /^{(.*)}$/g.exec(property)) !== null) {
      // 格式：{type1:type2:typeN}，带子类型的Struct类型
      return target[property] = _structTypeDef(proxy, match[1], true);
    } else if ((match = /^\((.+)\)$/g.exec(property)) !== null) {
      // 格式：(type1:type2:typeN)，带子类型的Union类型
      return target[property] = _structTypeDef(proxy, match[1], false);
    } else {
      throw Error("Unable to handle type '" + property + "'");
    }
  },
  set: function(target, property, value) {
    target[property] = value;
    return true;
  }
});

function _structTypeDef(typeDefs, typeNames, isStruct) {
  var name = "", types = [], size = 0, offsets = [];
  function _align(boundary) { return (size % boundary === 0) ? size : size + (boundary - (size % boundary)); }
  function _structType(type) { const offset = _align(type.size); types.push(type); size = offset + type.size; offsets.push(offset); }
  function _unionType(type) { if (!types.length || types[0].size < type.size) { types = [type]; size = type.size; offsets = [0]; } }
  while (typeNames) {
    const match = /^({[^}]+}|\([^}]+\)|[^:]+)(?::|$)/g.exec(typeNames);
    const type = _typeDefTable[match ? match[1] : typeNames];
    if (isStruct) _structType(type); else _unionType(type);
    name += type.name + ":";
    typeNames = match && typeNames.substr(match[0].length);
  }
  return {
    name: isStruct ? "{" + name.slice(0, -1) + "}" : "(" + name.slice(0, -1) + ")",
    type: types.map(function (v) { return v.type; }), size: size,
    read: function (addr) { return types.map(function (v, i) { return v.read(addr.add(offsets[i])); }); },
    write: function (addr, val) { val.slice(0, types.length).forEach(function (v, i) { types[i].write(addr.add(offsets[i]), v); }); return addr; },
    fromNative: function (val, self) { return val.slice(0, types.length).map(function (v, i) { return types[i].fromNative(v, self); }); },
    toNative: function (val, keep) { return val.slice(0, types.length).map(function (v, i) { return types[i].toNative(v, keep); }); },
  };
}

// JS类型与Native类型相互转换函数
function _same(val) { return val; }
function _invoke(name) { return function (obj, val) { return obj[name](val); }; }
function _chain1(func) { return function (val) { return func(val); }; }
function _chainS(func) { return function (val) { return func(String(val)); }; }
function _chainM(alloc) { return function (val, keep) { return Object.keepPointer(alloc(String(val)), keep); }; }

function _fromNativePointer(f) {
  return function (val, self) {
    return !(val instanceof NativePointer) ? val : val.isNull() ? null : (self && val.equals(self.handle)) ? self : f(val, self);
  };
}

function _toNativePointer(f) {
  return function (val, keep) {
    return val === null || val === undefined ? NULL : val instanceof NativePointer ? val : f(val, keep);
  };
}

function _toNativeNumber(f) {
  // noinspection JSUnusedLocalSymbols
  return function (val, keep) {
    return val instanceof NativePointer || val instanceof Int64 || val instanceof UInt64 ? f(val) : Number(val);
  };
}

function _fromNativeArray(type, cnt) {
  cnt = "1".repeat(cnt >= 0 ? cnt : 0);
  return _fromNativePointer(function (val, self) {
    return [].map.call(cnt, function (v, i) { return type.fromNative(type.read(val.add(i * type.size)), self); });
  });
}

function _fromNativeArrayEx(type) {
  return function (val, cnt) {
    return !val || val.isNull() ? null : [].map.call("1".repeat(cnt >= 0 ? cnt : 0), function (v, i) { return type.fromNative(type.read(val.add(i * type.size))); });
  };
}

function _toNativeArray(type, cnt) {
  return _toNativePointer(function (val, keep) {
    if (!Array.isArray(val)) val = [val];
    const ptr = Object.keepPointer(Memory.alloc(((cnt > val.length ? cnt : val.length) * type.size) || 1), keep);
    val.forEach(function (x, i) { type.write(ptr.add(i * type.size), type.toNative(x)); });
    return ptr;
  });
}

},{"./ObjectUtils":9}],9:[function(require,module,exports){
'use strict';

// 对象操作工具函数

Object.prototype.forEach = function (callback, thisArg) {
  for (var k in this) if (this.hasOwnProperty(k)) callback.call(thisArg, this[k], k, this);
};

Object.prototype.find = function (callback, thisArg) {
  for (var k in this) if (this.hasOwnProperty(k) && callback.call(thisArg, this[k], k, this)) return this[k];
};

Object.prototype.findIndex = function (callback, thisArg) {
  for (var k in this) if (this.hasOwnProperty(k) && callback.call(thisArg, this[k], k, this)) return k;
};

if (!Array.prototype.find) Array.prototype.find = function (callback, thisArg) {
  return Object.prototype.find.call(this, callback, thisArg);
};

if (!Array.prototype.findIndex) Array.prototype.findIndex = function (callback, thisArg) {
  const key = Object.prototype.findIndex.call(this, callback, thisArg);
  return isNaN(+key) ? -1 : +key;
};

Object.prototype.some = function (callback, thisArg) {
  return this.find(callback, thisArg) !== undefined;
};

Object.prototype.reduce = function (callback, initVal) {
  this.forEach(function (v, k, o) { initVal = callback(initVal, v, k, o); });
  return initVal;
};

Object.prototype.map = function (callback, thisArg) {
  return this.reduce(function (p, v, k, o) { p[k] = callback.call(thisArg, v, k, o); return p; }, {});
};

Object.prototype.filter = function (callback, thisArg) {
  return this.reduce(function (p, v, k, o) { if (callback.call(thisArg, v, k, o)) p[k] = v; return p; }, {});
};

Object.isObject = function (any) {
  return any && typeof any === "object" && !Object.isArrayLike(any) && !Object.isJava(any) && !Object.isObjC(any);
};

Object.isArrayLike = function (any) {
  return Array.isArray(any) || (typeof any === "object" && any.hasOwnProperty("length"));
};

Object.isJava = function (any, isInstance) {
  return Java.available && any && typeof any === "object" && any.hasOwnProperty("$classWrapper") && (!isInstance || any.hasOwnProperty("$handle"));
};

Object.isObjC = function (any, isInstance) {
  return ObjC.available && any && typeof any === "object" && (any instanceof ObjC.Object || any instanceof ObjC.Block || any instanceof ObjC.Protocol) && (!isInstance || any.$kind === "instance");
};

Object.isEmpty = function (val) {
  return Object.isArrayLike(val) ? !val.length : Object.isObject(val) ? !Object.keys(val).length : true;
};

Object.get = function(obj, key) {
  for (var i = 1; i < arguments.length; i++) {
    if (obj === undefined || obj === null) return undefined;
    obj = obj[arguments[i]];
  }
  return obj;
};

Object.merge = function (obj, src) {
  obj = Object.isObject(obj) ? obj : {};
  for (var i = 1; i < arguments.length; i++) {
    if (Object.isObject(arguments[i])) arguments[i].forEach(function (val, key) {
      obj[key] = Object.isObject(val) ? Object.merge(obj[key], val) : val;
    });
  }
  return obj;
};

Object.flatten = function (obj) {
  return obj ? obj.reduce(function (p, v) { return Object.merge(p, v); }, {}) : {};
};

Object.fromArray = function (list) {
  return list ? list.reduce(function (p, v) { if (Array.isArray(v)) p[v[0]] = v[1]; else p[v] = 1; return p; }, {}) : {};
};

Object.showErrorStack = function (withStack) {
  function noStack() { return this.name + ": " + this.message; }
  function hasStack() { return this._init ? this.stack : (this._init = 1) && this.name + ": " + this.message; }
  Error.prototype.toString = withStack ? hasStack : noStack;
};

Object.getPerformFunc = function (func) {
  return !Java.available ? func : function () { const args = arguments; Java.perform(function () { func.apply(null, args); }); };
};

Object.getTimeoutFunc = function (func, delay) {
  return function () { const args = arguments; return setTimeout(function () { func.apply(null, args); }, delay); };
};

Object.toArrayBuffer = function (val, length) {
  if (typeof val === "string") return new TextEncoder().encode(val).buffer.slice(0, length);
  if (val && val.hasOwnProperty("length")) return new Int8Array(val).buffer.slice(0, length);
  if (val instanceof NativePointer && length >= 0) return val.readByteArray(length);
  return val instanceof ArrayBuffer ? val.slice(0, length) : null;
};

Object.toJson = function (val, replacer, space) {
  function _val(k, v) { return v instanceof RegExp ? v.toString() : v && typeof v === "object" && v.hasOwnProperty("$handle") ? v.toString() : v; }
  function _chain(f) { return function (k, v) { return _val(k, f(k, v)); }; }
  function _object(o) {
    o.in = (Array.isArray(o.in) ? o.in : typeof o.in === "string" ? o.in.split(',') : []).map(function (v) { return v.trim(); });
    o.ex = (Array.isArray(o.ex) ? o.ex : typeof o.ex === "string" ? o.ex.split(',') : []).map(function (v) { return v.trim(); });
    o.map = (o.map || {}).map(function (v) { return typeof v === "function" ? v : function() { return v; } });
    const _in = [];
    return function (k, v) {
      function _map() { _in.unshift(_val(k, o.map[k] ? o.map[k](v) : v)); return _in[0]; }
      return !k ? v : !o.in.length || _in.indexOf(this) >= 0 ? (o.ex.indexOf(k) < 0 ? _map(k, v) : undefined) : o.in.indexOf(k) >= 0 ? _map(k, v) : undefined;
    }
  }
  return JSON.stringify(val, typeof replacer === "function" ? _chain(replacer) : Object.isObject(replacer) ? _object(replacer) : _val, space);
};

Date.prototype.format = function (fmt) {
  const o = {
    "(y+)": this.getFullYear(),    // 年
    "(M+)": this.getMonth() + 1,   // 月
    "(d+)": this.getDate(),        // 日
    "(H+)": this.getHours(),       // 时
    "(m+)": this.getMinutes(),     // 分
    "(s+)": this.getSeconds(),     // 秒
    "(S)":  this.getMilliseconds() //毫秒
  };
  o.forEach(function (v, k) {
    const m = new RegExp(k).exec(fmt);
    if (!m) return;
    const l = m[0].length, s = String(v);
    const r = k === "(y+)" ? s.substr(4 - l) : l === 1 ? s : ("00" + s).substr(s.length);
    fmt = fmt.substr(0, m.index) + r + fmt.substr(m.index + l);
  });
  return fmt;
};
},{}]},{},[1]);
