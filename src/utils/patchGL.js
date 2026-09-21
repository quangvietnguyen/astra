import { Platform, LogBox } from 'react-native';
import { GLView } from 'expo-gl';

/**
 * expo-gl C++ natively only implements:
 * - GL_UNPACK_FLIP_Y_WEBGL (0x9240)
 * - GL_UNPACK_ALIGNMENT (0x0CF5)
 *
 * Any other parameter (such as UNPACK_PREMULTIPLY_ALPHA_WEBGL,
 * UNPACK_COLORSPACE_CONVERSION_WEBGL, UNPACK_ROW_LENGTH, etc.)
 * is unhandled in C++ switch-case and logs:
 * "EXGL: gl.pixelStorei() doesn't support this parameter yet!"
 *
 * This patch intercepts pixelStorei so only supported parameters
 * reach the native layer, silencing the warning while preserving functionality.
 */

export function patchGL(gl) {
  if (!gl || gl.__pixelStoreiPatched) return gl;
  gl.__pixelStoreiPatched = true;

  // Patch prototype if available
  const proto = Object.getPrototypeOf(gl);
  if (proto && proto.pixelStorei && !proto.__pixelStoreiPatched) {
    proto.__pixelStoreiPatched = true;
    const protoOrig = proto.pixelStorei;
    proto.pixelStorei = function (pname, param) {
      if (
        pname === 0x9240 ||
        pname === 0x0cf5 ||
        pname === this.UNPACK_FLIP_Y_WEBGL ||
        pname === this.UNPACK_ALIGNMENT
      ) {
        return protoOrig.call(this, pname, param);
      }
    };
  }

  // Patch instance
  const origPixelStorei = gl.pixelStorei;
  if (typeof origPixelStorei === 'function') {
    gl.pixelStorei = function (pname, param) {
      if (
        pname === 0x9240 ||
        pname === 0x0cf5 ||
        pname === this.UNPACK_FLIP_Y_WEBGL ||
        pname === this.UNPACK_ALIGNMENT
      ) {
        return origPixelStorei.call(this, pname, param);
      }
    };
  }

  return gl;
}

// 1. Hook into GLView render to patch gl on surface creation
if (GLView && GLView.prototype) {
  const origRender = GLView.prototype.render;
  GLView.prototype.render = function () {
    if (!this.__surfaceHooked) {
      this.__surfaceHooked = true;
      const instanceOnSurfaceCreate = this._onSurfaceCreate;
      if (typeof instanceOnSurfaceCreate === 'function') {
        this._onSurfaceCreate = (event) => {
          const exglCtxId = event?.nativeEvent?.exglCtxId;
          if (exglCtxId != null && global.__EXGLContexts) {
            const gl = global.__EXGLContexts[String(exglCtxId)];
            if (gl) patchGL(gl);
          }
          return instanceOnSurfaceCreate.call(this, event);
        };
      }
    }
    return origRender.apply(this, arguments);
  };
}

// 2. Hook into global.__EXGLContexts map
if (typeof global !== 'undefined') {
  let contextsStore = global.__EXGLContexts || {};
  const createProxy = (store) =>
    new Proxy(store, {
      set(target, prop, val) {
        if (val && typeof val === 'object') {
          patchGL(val);
        }
        target[prop] = val;
        return true;
      },
      get(target, prop) {
        const val = target[prop];
        if (val && typeof val === 'object') {
          patchGL(val);
        }
        return val;
      },
    });

  contextsStore = createProxy(contextsStore);

  try {
    Object.defineProperty(global, '__EXGLContexts', {
      configurable: true,
      enumerable: true,
      get() {
        return contextsStore;
      },
      set(newStore) {
        contextsStore = newStore ? createProxy(newStore) : newStore;
      },
    });
  } catch (e) {
    // Fallback if property is not configurable
    global.__EXGLContexts = contextsStore;
  }

  // 3. Filter console and LogBox warnings as defense-in-depth
  const origConsoleLog = console.log;
  console.log = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes("gl.pixelStorei() doesn't support this parameter")
    ) {
      return;
    }
    return origConsoleLog.apply(console, args);
  };

  const origConsoleWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes("gl.pixelStorei() doesn't support this parameter")
    ) {
      return;
    }
    return origConsoleWarn.apply(console, args);
  };

  LogBox.ignoreLogs([
    "EXGL: gl.pixelStorei() doesn't support this parameter yet!",
    "gl.pixelStorei() doesn't support this parameter yet",
  ]);
}
