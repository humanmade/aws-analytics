!function(e,t){for(var n in t)e[n]=t[n]}(this,function(e){var t={};function n(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(r,i,function(t){return e[t]}.bind(null,i));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="/",n(n.s=169)}({0:function(e,t){!function(){e.exports=this.React}()},15:function(e,t){!function(){e.exports=this.ReactDOM}()},16:function(e,t,n){var r=n(30),i=n(31),o=n(32);e.exports=function(e,t){return r(e)||i(e,t)||o()}},169:function(e,t,n){"use strict";n.r(t);var r=n(0),i=n.n(r),o=n(15),a=n.n(o),u=n(7),c=n.n(u),l=n(16),f=n.n(l);function s(){var e=Object(r.useState)(Altis.Analytics.getAudiences()),t=f()(e,2),n=t[0],o=t[1],a=window.AltisExperimentsPreview.audiences;return i.a.createElement(i.a.Fragment,null,i.a.createElement("a",{"aria-haspopup":"true",className:"ab-item",href:"#qm-overview"},"Audiences"),i.a.createElement("div",{className:"ab-sub-wrapper"},i.a.createElement("ul",{className:"ab-submenu"},a.map((function(e){return i.a.createElement("li",{key:e.id,className:"aa-preview-item"},i.a.createElement("a",{className:"ab-item ".concat((t=e.id,n.indexOf(t)>=0?"altis-analytics-preview-selected":"")),href:"#",role:"button",onClick:function(t){return function(e,t){if(e.preventDefault(),n.indexOf(t)>=0){var r=n.filter((function(e){return e!==t}));o(r),Altis.Analytics.overrideAudiences(r)}else{var i=[].concat(c()(n),[t]);o(i),Altis.Analytics.overrideAudiences(i)}}(t,e.id)}},e.title));var t})))))}document.addEventListener("DOMContentLoaded",(function(){var e=document.getElementById("wp-admin-bar-altis-analytics-preview");if(e){for(;e.firstChild;)e.removeChild(e.firstChild);a.a.render(i.a.createElement(s,null),e)}}))},27:function(e,t){e.exports=function(e){if(Array.isArray(e)){for(var t=0,n=new Array(e.length);t<e.length;t++)n[t]=e[t];return n}}},28:function(e,t){e.exports=function(e){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e))return Array.from(e)}},29:function(e,t){e.exports=function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}},30:function(e,t){e.exports=function(e){if(Array.isArray(e))return e}},31:function(e,t){e.exports=function(e,t){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e)){var n=[],r=!0,i=!1,o=void 0;try{for(var a,u=e[Symbol.iterator]();!(r=(a=u.next()).done)&&(n.push(a.value),!t||n.length!==t);r=!0);}catch(e){i=!0,o=e}finally{try{r||null==u.return||u.return()}finally{if(i)throw o}}return n}}},32:function(e,t){e.exports=function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}},7:function(e,t,n){var r=n(27),i=n(28),o=n(29);e.exports=function(e){return r(e)||i(e)||o()}}}));