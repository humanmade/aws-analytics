!function(e,t){for(var r in t)e[r]=t[r]}(this,function(e){var t={};function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)r.d(n,o,function(t){return e[t]}.bind(null,o));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="/",r(r.s=194)}({0:function(e,t){!function(){e.exports=this.React}()},194:function(e,t,r){"use strict";r.r(t);var n=r(5),o=r.n(n),i=r(53);function u(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}wp.hooks.addFilter("altis.experiments.sidebar.test.titles","altis.experiments.features.titles",(function(e){return function(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?u(Object(r),!0).forEach((function(t){o()(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):u(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}({},e,{component:i.a,dispatcher:function(e){return{revertValue:function(t){e("core/editor").editPost({title:t})}}},selector:function(e){return{defaultValue:e("core/editor").getEditedPostAttribute("title")||""}}})}))},5:function(e,t){e.exports=function(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}},53:function(e,t,r){"use strict";var n=r(0),o=r.n(n),i=wp.components.TextareaControl,u=wp.i18n.__;t.a=function(e){var t=e.allValues,r=e.isEditable,n=e.onChange,c=e.onRemove,a=e.value,l=void 0===a?"":a,f=e.index;return o.a.createElement(i,{autoFocus:(t||[]).length-1===f,label:null,placeholder:u("Enter another value here.","altis-analytics"),readOnly:!r,rows:3,value:l,onChange:n,onFocus:function(e){var t=2*e.target.value.length;e.target.setSelectionRange(t,t)},onKeyUp:function(e){""===l&&""===e.target.value&&(e.key&&"Backspace"===e.key||e.which&&8===e.which)&&c()}})}}}));