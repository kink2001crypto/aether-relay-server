"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lightSyntaxColors = exports.darkSyntaxColors = exports.lightPalette = exports.darkPalette = exports.useSyntaxColors = exports.useColors = exports.useTheme = exports.ThemeProvider = void 0;
// Theme exports
var ThemeContext_1 = require("./ThemeContext");
Object.defineProperty(exports, "ThemeProvider", { enumerable: true, get: function () { return ThemeContext_1.ThemeProvider; } });
Object.defineProperty(exports, "useTheme", { enumerable: true, get: function () { return ThemeContext_1.useTheme; } });
Object.defineProperty(exports, "useColors", { enumerable: true, get: function () { return ThemeContext_1.useColors; } });
Object.defineProperty(exports, "useSyntaxColors", { enumerable: true, get: function () { return ThemeContext_1.useSyntaxColors; } });
var colors_1 = require("./colors");
Object.defineProperty(exports, "darkPalette", { enumerable: true, get: function () { return colors_1.darkPalette; } });
Object.defineProperty(exports, "lightPalette", { enumerable: true, get: function () { return colors_1.lightPalette; } });
var syntaxColors_1 = require("./syntaxColors");
Object.defineProperty(exports, "darkSyntaxColors", { enumerable: true, get: function () { return syntaxColors_1.darkSyntaxColors; } });
Object.defineProperty(exports, "lightSyntaxColors", { enumerable: true, get: function () { return syntaxColors_1.lightSyntaxColors; } });
//# sourceMappingURL=index.js.map