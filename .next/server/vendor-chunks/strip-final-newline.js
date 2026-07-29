"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/strip-final-newline";
exports.ids = ["vendor-chunks/strip-final-newline"];
exports.modules = {

/***/ "(rsc)/./node_modules/strip-final-newline/index.js":
/*!***************************************************!*\
  !*** ./node_modules/strip-final-newline/index.js ***!
  \***************************************************/
/***/ ((module) => {

eval("\n\nmodule.exports = input => {\n\tconst LF = typeof input === 'string' ? '\\n' : '\\n'.charCodeAt();\n\tconst CR = typeof input === 'string' ? '\\r' : '\\r'.charCodeAt();\n\n\tif (input[input.length - 1] === LF) {\n\t\tinput = input.slice(0, input.length - 1);\n\t}\n\n\tif (input[input.length - 1] === CR) {\n\t\tinput = input.slice(0, input.length - 1);\n\t}\n\n\treturn input;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvc3RyaXAtZmluYWwtbmV3bGluZS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBYTs7QUFFYjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBIiwic291cmNlcyI6WyJEOlxcUHJvamVjdFxccmVzdW1lLWJ1aWxkZXItMi4xXFxiZC1mcm9udGVuZFxcbm9kZV9tb2R1bGVzXFxzdHJpcC1maW5hbC1uZXdsaW5lXFxpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gaW5wdXQgPT4ge1xuXHRjb25zdCBMRiA9IHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycgPyAnXFxuJyA6ICdcXG4nLmNoYXJDb2RlQXQoKTtcblx0Y29uc3QgQ1IgPSB0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnID8gJ1xccicgOiAnXFxyJy5jaGFyQ29kZUF0KCk7XG5cblx0aWYgKGlucHV0W2lucHV0Lmxlbmd0aCAtIDFdID09PSBMRikge1xuXHRcdGlucHV0ID0gaW5wdXQuc2xpY2UoMCwgaW5wdXQubGVuZ3RoIC0gMSk7XG5cdH1cblxuXHRpZiAoaW5wdXRbaW5wdXQubGVuZ3RoIC0gMV0gPT09IENSKSB7XG5cdFx0aW5wdXQgPSBpbnB1dC5zbGljZSgwLCBpbnB1dC5sZW5ndGggLSAxKTtcblx0fVxuXG5cdHJldHVybiBpbnB1dDtcbn07XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/strip-final-newline/index.js\n");

/***/ })

};
;