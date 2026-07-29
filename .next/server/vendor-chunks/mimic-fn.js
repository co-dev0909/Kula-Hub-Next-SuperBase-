"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/mimic-fn";
exports.ids = ["vendor-chunks/mimic-fn"];
exports.modules = {

/***/ "(rsc)/./node_modules/mimic-fn/index.js":
/*!****************************************!*\
  !*** ./node_modules/mimic-fn/index.js ***!
  \****************************************/
/***/ ((module) => {

eval("\n\nconst mimicFn = (to, from) => {\n\tfor (const prop of Reflect.ownKeys(from)) {\n\t\tObject.defineProperty(to, prop, Object.getOwnPropertyDescriptor(from, prop));\n\t}\n\n\treturn to;\n};\n\nmodule.exports = mimicFn;\n// TODO: Remove this for the next major release\nmodule.exports[\"default\"] = mimicFn;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbWltaWMtZm4vaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQWE7O0FBRWI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EseUJBQXNCIiwic291cmNlcyI6WyJEOlxcUHJvamVjdFxccmVzdW1lLWJ1aWxkZXItMi4xXFxiZC1mcm9udGVuZFxcbm9kZV9tb2R1bGVzXFxtaW1pYy1mblxcaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBtaW1pY0ZuID0gKHRvLCBmcm9tKSA9PiB7XG5cdGZvciAoY29uc3QgcHJvcCBvZiBSZWZsZWN0Lm93bktleXMoZnJvbSkpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodG8sIHByb3AsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoZnJvbSwgcHJvcCkpO1xuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtaW1pY0ZuO1xuLy8gVE9ETzogUmVtb3ZlIHRoaXMgZm9yIHRoZSBuZXh0IG1ham9yIHJlbGVhc2Vcbm1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBtaW1pY0ZuO1xuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/mimic-fn/index.js\n");

/***/ })

};
;