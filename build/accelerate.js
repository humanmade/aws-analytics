!function(e){var t={};function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"===typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)r.d(n,o,function(t){return e[t]}.bind(null,o));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=537)}({0:function(e,t){e.exports=React},106:function(e,t,r){var n=r(107);e.exports=function(e,t){if(e){if("string"===typeof e)return n(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?n(e,t):void 0}},e.exports.__esModule=!0,e.exports.default=e.exports},107:function(e,t){e.exports=function(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n},e.exports.__esModule=!0,e.exports.default=e.exports},11:function(e,t){e.exports=function(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e},e.exports.__esModule=!0,e.exports.default=e.exports},133:function(e,t){function r(e,t,r,n,o,a,i){try{var s=e[a](i),l=s.value}catch(c){return void r(c)}s.done?t(l):Promise.resolve(l).then(n,o)}e.exports=function(e){return function(){var t=this,n=arguments;return new Promise((function(o,a){var i=e.apply(t,n);function s(e){r(i,o,a,s,l,"next",e)}function l(e){r(i,o,a,s,l,"throw",e)}s(void 0)}))}},e.exports.__esModule=!0,e.exports.default=e.exports},134:function(e,t,r){var n=function(e){"use strict";var t,r=Object.prototype,n=r.hasOwnProperty,o="function"===typeof Symbol?Symbol:{},a=o.iterator||"@@iterator",i=o.asyncIterator||"@@asyncIterator",s=o.toStringTag||"@@toStringTag";function l(e,t,r){return Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}),e[t]}try{l({},"")}catch(k){l=function(e,t,r){return e[t]=r}}function c(e,t,r,n){var o=t&&t.prototype instanceof v?t:v,a=Object.create(o.prototype),i=new P(n||[]);return a._invoke=function(e,t,r){var n=p;return function(o,a){if(n===d)throw new Error("Generator is already running");if(n===m){if("throw"===o)throw a;return T()}for(r.method=o,r.arg=a;;){var i=r.delegate;if(i){var s=j(i,r);if(s){if(s===h)continue;return s}}if("next"===r.method)r.sent=r._sent=r.arg;else if("throw"===r.method){if(n===p)throw n=m,r.arg;r.dispatchException(r.arg)}else"return"===r.method&&r.abrupt("return",r.arg);n=d;var l=u(e,t,r);if("normal"===l.type){if(n=r.done?m:f,l.arg===h)continue;return{value:l.arg,done:r.done}}"throw"===l.type&&(n=m,r.method="throw",r.arg=l.arg)}}}(e,r,i),a}function u(e,t,r){try{return{type:"normal",arg:e.call(t,r)}}catch(k){return{type:"throw",arg:k}}}e.wrap=c;var p="suspendedStart",f="suspendedYield",d="executing",m="completed",h={};function v(){}function y(){}function g(){}var b={};l(b,a,(function(){return this}));var w=Object.getPrototypeOf,_=w&&w(w(L([])));_&&_!==r&&n.call(_,a)&&(b=_);var x=g.prototype=v.prototype=Object.create(b);function O(e){["next","throw","return"].forEach((function(t){l(e,t,(function(e){return this._invoke(t,e)}))}))}function E(e,t){function r(o,a,i,s){var l=u(e[o],e,a);if("throw"!==l.type){var c=l.arg,p=c.value;return p&&"object"===typeof p&&n.call(p,"__await")?t.resolve(p.__await).then((function(e){r("next",e,i,s)}),(function(e){r("throw",e,i,s)})):t.resolve(p).then((function(e){c.value=e,i(c)}),(function(e){return r("throw",e,i,s)}))}s(l.arg)}var o;this._invoke=function(e,n){function a(){return new t((function(t,o){r(e,n,t,o)}))}return o=o?o.then(a,a):a()}}function j(e,r){var n=e.iterator[r.method];if(n===t){if(r.delegate=null,"throw"===r.method){if(e.iterator.return&&(r.method="return",r.arg=t,j(e,r),"throw"===r.method))return h;r.method="throw",r.arg=new TypeError("The iterator does not provide a 'throw' method")}return h}var o=u(n,e.iterator,r.arg);if("throw"===o.type)return r.method="throw",r.arg=o.arg,r.delegate=null,h;var a=o.arg;return a?a.done?(r[e.resultName]=a.value,r.next=e.nextLoc,"return"!==r.method&&(r.method="next",r.arg=t),r.delegate=null,h):a:(r.method="throw",r.arg=new TypeError("iterator result is not an object"),r.delegate=null,h)}function S(e){var t={tryLoc:e[0]};1 in e&&(t.catchLoc=e[1]),2 in e&&(t.finallyLoc=e[2],t.afterLoc=e[3]),this.tryEntries.push(t)}function N(e){var t=e.completion||{};t.type="normal",delete t.arg,e.completion=t}function P(e){this.tryEntries=[{tryLoc:"root"}],e.forEach(S,this),this.reset(!0)}function L(e){if(e){var r=e[a];if(r)return r.call(e);if("function"===typeof e.next)return e;if(!isNaN(e.length)){var o=-1,i=function r(){for(;++o<e.length;)if(n.call(e,o))return r.value=e[o],r.done=!1,r;return r.value=t,r.done=!0,r};return i.next=i}}return{next:T}}function T(){return{value:t,done:!0}}return y.prototype=g,l(x,"constructor",g),l(g,"constructor",y),y.displayName=l(g,s,"GeneratorFunction"),e.isGeneratorFunction=function(e){var t="function"===typeof e&&e.constructor;return!!t&&(t===y||"GeneratorFunction"===(t.displayName||t.name))},e.mark=function(e){return Object.setPrototypeOf?Object.setPrototypeOf(e,g):(e.__proto__=g,l(e,s,"GeneratorFunction")),e.prototype=Object.create(x),e},e.awrap=function(e){return{__await:e}},O(E.prototype),l(E.prototype,i,(function(){return this})),e.AsyncIterator=E,e.async=function(t,r,n,o,a){void 0===a&&(a=Promise);var i=new E(c(t,r,n,o),a);return e.isGeneratorFunction(r)?i:i.next().then((function(e){return e.done?e.value:i.next()}))},O(x),l(x,s,"Generator"),l(x,a,(function(){return this})),l(x,"toString",(function(){return"[object Generator]"})),e.keys=function(e){var t=[];for(var r in e)t.push(r);return t.reverse(),function r(){for(;t.length;){var n=t.pop();if(n in e)return r.value=n,r.done=!1,r}return r.done=!0,r}},e.values=L,P.prototype={constructor:P,reset:function(e){if(this.prev=0,this.next=0,this.sent=this._sent=t,this.done=!1,this.delegate=null,this.method="next",this.arg=t,this.tryEntries.forEach(N),!e)for(var r in this)"t"===r.charAt(0)&&n.call(this,r)&&!isNaN(+r.slice(1))&&(this[r]=t)},stop:function(){this.done=!0;var e=this.tryEntries[0].completion;if("throw"===e.type)throw e.arg;return this.rval},dispatchException:function(e){if(this.done)throw e;var r=this;function o(n,o){return s.type="throw",s.arg=e,r.next=n,o&&(r.method="next",r.arg=t),!!o}for(var a=this.tryEntries.length-1;a>=0;--a){var i=this.tryEntries[a],s=i.completion;if("root"===i.tryLoc)return o("end");if(i.tryLoc<=this.prev){var l=n.call(i,"catchLoc"),c=n.call(i,"finallyLoc");if(l&&c){if(this.prev<i.catchLoc)return o(i.catchLoc,!0);if(this.prev<i.finallyLoc)return o(i.finallyLoc)}else if(l){if(this.prev<i.catchLoc)return o(i.catchLoc,!0)}else{if(!c)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return o(i.finallyLoc)}}}},abrupt:function(e,t){for(var r=this.tryEntries.length-1;r>=0;--r){var o=this.tryEntries[r];if(o.tryLoc<=this.prev&&n.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var a=o;break}}a&&("break"===e||"continue"===e)&&a.tryLoc<=t&&t<=a.finallyLoc&&(a=null);var i=a?a.completion:{};return i.type=e,i.arg=t,a?(this.method="next",this.next=a.finallyLoc,h):this.complete(i)},complete:function(e,t){if("throw"===e.type)throw e.arg;return"break"===e.type||"continue"===e.type?this.next=e.arg:"return"===e.type?(this.rval=this.arg=e.arg,this.method="return",this.next="end"):"normal"===e.type&&t&&(this.next=t),h},finish:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.finallyLoc===e)return this.complete(r.completion,r.afterLoc),N(r),h}},catch:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.tryLoc===e){var n=r.completion;if("throw"===n.type){var o=n.arg;N(r)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(e,r,n){return this.delegate={iterator:L(e),resultName:r,nextLoc:n},"next"===this.method&&(this.arg=t),h}},e}(e.exports);try{regeneratorRuntime=n}catch(o){"object"===typeof globalThis?globalThis.regeneratorRuntime=n:Function("r","regeneratorRuntime = r")(n)}},135:function(e,t){function r(t,n){return e.exports=r=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e},e.exports.__esModule=!0,e.exports.default=e.exports,r(t,n)}e.exports=r,e.exports.__esModule=!0,e.exports.default=e.exports},136:function(e,t){function r(t){return e.exports=r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},e.exports.__esModule=!0,e.exports.default=e.exports,r(t)}e.exports=r,e.exports.__esModule=!0,e.exports.default=e.exports},137:function(e,t){e.exports=function(e){if(Array.isArray(e))return e},e.exports.__esModule=!0,e.exports.default=e.exports},138:function(e,t){e.exports=function(e,t){var r=null==e?null:"undefined"!==typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,a=[],i=!0,s=!1;try{for(r=r.call(e);!(i=(n=r.next()).done)&&(a.push(n.value),!t||a.length!==t);i=!0);}catch(l){s=!0,o=l}finally{try{i||null==r.return||r.return()}finally{if(s)throw o}}return a}},e.exports.__esModule=!0,e.exports.default=e.exports},139:function(e,t){e.exports=function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")},e.exports.__esModule=!0,e.exports.default=e.exports},168:function(e,t){function r(t){return e.exports=r=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)},e.exports.__esModule=!0,e.exports.default=e.exports,r(t)}e.exports=r,e.exports.__esModule=!0,e.exports.default=e.exports},20:function(e,t){e.exports=wp.element},23:function(e,t,r){var n=r(137),o=r(138),a=r(106),i=r(139);e.exports=function(e,t){return n(e)||o(e,t)||a(e,t)||i()},e.exports.__esModule=!0,e.exports.default=e.exports},26:function(e,t){e.exports=wp.components},271:function(e,t){e.exports=function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")},e.exports.__esModule=!0,e.exports.default=e.exports},272:function(e,t){function r(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}e.exports=function(e,t,n){return t&&r(e.prototype,t),n&&r(e,n),Object.defineProperty(e,"prototype",{writable:!1}),e},e.exports.__esModule=!0,e.exports.default=e.exports},273:function(e,t,r){var n=r(135);e.exports=function(e,t){if("function"!==typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&n(e,t)},e.exports.__esModule=!0,e.exports.default=e.exports},274:function(e,t,r){var n=r(136).default,o=r(28);e.exports=function(e,t){if(t&&("object"===n(t)||"function"===typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return o(e)},e.exports.__esModule=!0,e.exports.default=e.exports},28:function(e,t){e.exports=function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e},e.exports.__esModule=!0,e.exports.default=e.exports},31:function(e,t){e.exports=wp.data},32:function(e,t){e.exports=ReactDOM},39:function(e,t,r){e.exports=r(134)},4:function(e,t){e.exports=wp.i18n},537:function(e,t,r){"use strict";r.r(t);r(133);var n=r(20),o=(r(39),r(0)),a=r.n(o),i=r(32),s=r.n(i),l=r(26),c=r(31),u=r(271),p=r.n(u),f=r(272),d=r.n(f),m=r(28),h=r.n(m),v=r(273),y=r.n(v),g=r(274),b=r.n(g),w=r(168),_=r.n(w),x=r(11),O=r.n(x),E=r(23),j=r.n(E),S=r(4),N=[{label:Object(S.__)("7 Days","altis"),value:"P7D",diff:"P7D"},{label:Object(S.__)("30 Days","altis"),value:"P30D",diff:"P30D"},{label:Object(S.__)("90 Days","altis"),value:"P90D",diff:null}];function P(e){return wp.element.createElement("div",{className:"Hero"},wp.element.createElement("div",{className:"Hero__content"},wp.element.createElement("h1",null,Object(S.sprintf)(Object(S.__)("Hello %s","altis"),e.name)),wp.element.createElement("h2",null,Object(S.__)("Welcome to the future","altis")," ",wp.element.createElement("span",{role:"img","aria-label":"letsgo"},"\u2728")),wp.element.createElement("div",{className:"Hero__tools"},wp.element.createElement("div",{className:"Hero__timeranges"},!!e.period&&N.map((function(t){var r=["timerange"];return t.value===e.period&&r.push("timerange-active"),wp.element.createElement("button",{key:t.value,className:r.join(" "),type:"button",onClick:function(){e.onSetPeriod&&e.onSetPeriod(t.value)}},t.label)}))),!!e.period&&wp.element.createElement("nav",{className:"Hero__links"},wp.element.createElement("a",{href:"index.php?page=altis-analytics"},Object(S.__)("Analytics","altis-analytics")),wp.element.createElement("a",{href:"edit.php?post_type=xb"},Object(S.__)("Insights","altis-analytics"))))))}var L,T=function(e){if(isNaN(e))return"0";if(!isFinite(e))return e>=0?"\u221e%":"-\u221e%";var t="",r=e;return Number.isInteger(e)?(e>=1e3&&(t="k",r=e/1e3),e>=1e6&&(t="M",r=e/1e6),r=r<10&&r>0?Number.isInteger(r)?r:parseFloat(r.toFixed(1)):Math.round(r),"".concat(r).concat(t)):(t="%",r=Math.round(r),"".concat(r).concat(t))},k=function(e,t){return e/t*100},I=function(e,t){return(e-t)/t*100},A=function(e,t){var r=k(e.conversions,e.views),n=k(t.conversions,t.views);return I(n,r)};function D(e){return wp.element.createElement("div",{className:"key-insight dashboard-shadow"},wp.element.createElement("div",{className:"key-insight-content"},wp.element.createElement("div",{className:"key-insight-head"},e.title),wp.element.createElement("div",{className:"key-insight-metrics"},wp.element.createElement("div",{className:"metrics-aggregate"},T(e.stat||0)),!!e.delta&&!isNaN(e.delta)&&wp.element.createElement("div",{className:"metrics-delta score-".concat(e.delta>=0?"pos":"neg")},e.delta>=0?"\u2191":"\u2193",T(parseFloat(e.delta.toFixed(20))))),wp.element.createElement("div",{className:"key-insight-desc"},e.description)))}function M(e){var t,r,n=N.find((function(t){return t.value===e.period}))||N[0],o=Object(c.useSelect)((function(e){return e("altis/analytics").getStats({period:n.value||"P7D"})})),a=Object(c.useSelect)((function(e){return e("altis/analytics").getStats({period:n.value||"P7D",diff:n.diff||"P7D"})})),i=null===o||void 0===o||null===(t=o.stats)||void 0===t?void 0:t.summary,s=null===a||void 0===a||null===(r=a.stats)||void 0===r?void 0:r.summary,l=null===i||void 0===i?void 0:i.lift,u=null===s||void 0===s?void 0:s.lift,p=0,f=0;return l&&u&&(p=A(l.fallback,l.personalized),f=A(u.fallback,u.personalized)),wp.element.createElement("div",{className:"Overview"},wp.element.createElement("div",{className:"key-insight-wrap"},wp.element.createElement(D,{delta:n.diff&&i&&s?I(i.views,s.views):null,description:Object(S.sprintf)(Object(S.__)("Total page views for the last %s.","altis"),n.label),title:Object(S.__)("Page views","altis"),stat:null===i||void 0===i?void 0:i.views}),wp.element.createElement(D,{delta:n.diff&&l&&u?I(l.views,u.views):null,description:Object(S.sprintf)(Object(S.__)("Total Experience Block views for the last %s.","altis"),n.label),title:Object(S.__)("Experience Block views","altis"),stat:null===l||void 0===l?void 0:l.views}),wp.element.createElement(D,{delta:p&&f?I(f,p):null,description:Object(S.__)("Aggregated lift across all personalized content.","altis"),title:Object(S.__)("Lift","altis"),stat:parseFloat(p.toFixed(1))})))}function F(e){var t=Object(o.useState)(""),r=j()(t,2),a=r[0],i=r[1],s=Object(o.useState)(1),l=j()(s,2),u=l[0],p=l[1],f=Object(o.useState)(null),d=j()(f,2),m=d[0],h=d[1],v=Object(o.useState)(null),y=j()(v,2),g=y[0],b=y[1],w=Object(c.useSelect)((function(t){return{posts:t("altis/analytics").getPosts({period:e.period||"P7D",search:a,type:m,user:g,page:u}),pagination:t("altis/analytics").getPagination(),isLoading:t("altis/analytics").getIsLoading()}}),[a,u,m,g,e.period]),_=w.posts,x=w.pagination,O=w.isLoading,E=_.reduce((function(e,t){return Math.max(t.views,e)}),0);return wp.element.createElement("div",{className:"List"},wp.element.createElement("div",{className:"table-wrap"},wp.element.createElement("form",{className:"table-controls",method:"POST",onSubmit:function(e){e.preventDefault()}},wp.element.createElement("div",{className:"table-filter"},wp.element.createElement("select",{className:"filter filter-active",onChange:function(e){p(1),h(e.target.value)}},wp.element.createElement("option",{value:""},Object(S.__)("All Content \u25be","altis")),e.postTypes.map((function(e){return wp.element.createElement("option",{selected:e.name===m,value:e.name},e.label)}))),wp.element.createElement("select",{className:"filter filter-active",onChange:function(e){p(1),b(parseInt(e.target.value,10))}},wp.element.createElement("option",{value:""},Object(S.__)("All Authors \u25be","altis")),wp.element.createElement("option",{selected:g===e.user.id,value:e.user.id},Object(S.__)("My Content","altis")))),wp.element.createElement("div",{className:"table-search"},wp.element.createElement("input",{type:"text",placeholder:"Search Pages, Posts & Blocks",className:"search",onChange:function(e){L&&clearTimeout(L),L=setTimeout((function(e){i(e)}),500,e.target.value)}}))),wp.element.createElement("div",{className:"table-content dashboard-shadow"},wp.element.createElement("table",{"aria-live":"polite"},wp.element.createElement("tr",{className:"record-header"},wp.element.createElement("th",{className:"table-th-views"},Object(S.__)("Views","altis")),wp.element.createElement("th",{className:"table-th-name"},Object(S.__)("Name","altis")),wp.element.createElement("th",{className:"table-th-lift"},Object(S.__)("Lift","altis")),wp.element.createElement("th",{className:"table-th-author"},Object(S.__)("Author","altis")),wp.element.createElement("th",{className:"table-th-links"},Object(S.__)("Links","altis"))),O&&wp.element.createElement("tr",null,wp.element.createElement("td",{className:"record-loading",colSpan:5},Object(S.__)("Loading...","altis"))),!O&&0===_.length&&wp.element.createElement("tr",null,wp.element.createElement("td",{className:"record-empty",colSpan:5},Object(S.__)("No content found...","altis"))),_.length>0&&_.map((function(e){var t=null;return e.lift&&(t=A(e.lift.fallback,e.lift.personalized)),wp.element.createElement("tr",{key:e.id},wp.element.createElement("td",{className:"record-traffic"},wp.element.createElement("div",{className:"traffic-bar",style:{right:"".concat(100-e.views/E*100,"%")}}),T(e.views)),wp.element.createElement("td",{className:"record-name"},e.title,("xb"===e.type.name||"wp_block"===e.type.name)&&wp.element.createElement("span",{className:"tag"},e.type.label)),wp.element.createElement("td",{className:"record-lift score-".concat(t&&t>=0?"pos":"neg")},!!t&&!isNaN(t)&&(t>=0?"\u2191":"\u2193"),!!t&&!isNaN(t)&&T(parseFloat(t.toFixed(1)))),wp.element.createElement("td",{className:"record-author"},wp.element.createElement("img",{alt:"",className:"record-avatar",src:e.author.avatar}),e.author.name),wp.element.createElement("td",{className:"record-links"},e.url&&wp.element.createElement("a",{href:e.url},Object(S.__)("View","altis")),e.editUrl&&Object(n.createElement)(n.Fragment,null," ",wp.element.createElement("a",{href:e.editUrl},Object(S.__)("Edit","altis")))))}))),wp.element.createElement("div",{className:"table-footer"},wp.element.createElement("div",{className:"pagination"},wp.element.createElement("button",{disabled:u<2,type:"button",onClick:function(){return p(u-1)}},"\u2190 ",Object(S.__)("Prev","altis")),Array(x.pages).fill(null).map((function(e,t){return t+1===u?wp.element.createElement("div",{className:"current"},t+1):wp.element.createElement("button",{type:"button",onClick:function(){return p(t+1)}},t+1)})),wp.element.createElement("button",{disabled:u<=x.pages,type:"button",onClick:function(){return p(u+1)}},Object(S.__)("Next","altis")," \u2192"))))))}function R(e){var t=Object(o.useState)("P7D"),r=j()(t,2),n=r[0],a=r[1];return wp.element.createElement("div",{className:"Dashboard"},wp.element.createElement(P,{name:e.user.name,period:n,onSetPeriod:function(e){return a(e)}}),wp.element.createElement(M,{period:n}),wp.element.createElement(F,{period:n,postTypes:e.postTypes,user:e.user}))}function C(e){var t=function(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}();return function(){var r,n=_()(e);if(t){var o=_()(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return b()(this,r)}}var G=function(e){y()(r,e);var t=C(r);function r(e){var n;return p()(this,r),n=t.call(this,e),O()(h()(n),"state",{user:{name:"..."}}),n.state.user=e.config.user,n}return d()(r,[{key:"render",value:function(){return wp.element.createElement("main",{className:"App"},wp.element.createElement(R,{postTypes:this.props.config.post_types,user:this.state.user}))}}]),r}(a.a.Component),H=r(68);Object(c.register)(H.b);var B,z=document.getElementById("altis-analytics-root");B=G,s.a.render(wp.element.createElement(l.SlotFillProvider,null,wp.element.createElement(B,{config:window.AltisAccelerateDashboardData})),z)},68:function(e,t,r){"use strict";r.d(t,"a",(function(){return _})),r.d(t,"b",(function(){return P}));var n=r(11),o=r.n(n),a=r(23),i=r.n(a),s=r(39),l=r.n(s),c=r(98),u=r.n(c),p=r(31),f=r(69),d=r(9),m=r.n(d);function h(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function v(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?h(Object(r),!0).forEach((function(t){o()(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):h(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}var y=function(e,t){return e.error||t.error?0:e.views>t.views?-1:e.views<t.views?1:0};function g(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}var b="analytics/v1/stats",w="analytics/v1/top",_=function(e,t){var r=m.a.duration(t),n=m()().subtract(r),o=m.a.duration(e);return{start:m()(n).subtract(o),end:n}},x=function(e){return Object.entries(O(e)).filter((function(e){var t=i()(e,2),r=t[0];t[1];return-1===["start","end"].indexOf(r)})).map((function(e){var t=i()(e,2),r=t[0],n=t[1];return"".concat(r,":").concat(JSON.stringify(n))})).sort().join(";")},O=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=_(e.period||"P7D",e.diff||null),r=t.start,n=t.end;return e=Object.assign({end:n.toISOString(),start:r.toISOString()},e)},E={FETCH_FROM_API:function(e){return u()(function(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?g(Object(r),!0).forEach((function(t){o()(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):g(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}({credentials:"same-origin"},e.options))},RESPONSE_TO_JSON:function(e){return e.response.json()}},j={setPosts:function(e,t){return{type:"SET_POSTS",posts:e,key:t}},setStats:function(e,t){return{type:"SET_STATS",stats:e,key:t}},refreshStats:function(){return{type:"REFRESH_STATS"}},setIsLoading:function(e){return{type:"SET_IS_LOADING",isLoading:e}},setIsLoadingStats:function(e){return{type:"SET_IS_LOADING_STATS",isLoading:e}},setPagination:function(e,t){return{type:"SET_PAGINATION",total:e,pages:t}},fetch:function(e){return{type:"FETCH_FROM_API",options:e}},json:function(e){return{type:"RESPONSE_TO_JSON",response:e}}},S={getStats:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return e.stats[x(t)]},getPosts:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return e.posts[x(t)]||[]},getPagination:function(e){return e.pagination},getIsLoading:function(e){return e.isLoading},getIsLoadingStats:function(e){return e.isLoadingStats}},N={getPosts:l.a.mark((function e(){var t,r,n,o=arguments;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t=o.length>0&&void 0!==o[0]?o[0]:{},e.next=3,j.setIsLoading(!0);case 3:return t=O(t),e.next=6,j.fetch({path:Object(f.addQueryArgs)(w,t),headers:{"Access-Control-Expose-Headers":"X-WP-Total, X-WP-TotalPages"},parse:!1});case 6:if(r=e.sent){e.next=9;break}return e.abrupt("return",j.setIsLoading(!1));case 9:return e.next=11,j.json(r);case 11:return n=e.sent,e.next=14,j.setPosts(n,x(t));case 14:return e.next=16,j.setPagination(parseInt(r.headers.get("x-wp-total")||"0",10),parseInt(r.headers.get("x-wp-totalpages")||"0",10));case 16:return e.abrupt("return",j.setIsLoading(!1));case 17:case"end":return e.stop()}}),e)})),getStats:l.a.mark((function e(){var t,r,n=arguments;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t=n.length>0&&void 0!==n[0]?n[0]:{},e.next=3,j.setIsLoadingStats(!0);case 3:return t=O(t),e.next=6,j.fetch({path:Object(f.addQueryArgs)(b,t)});case 6:if(r=e.sent){e.next=9;break}return e.abrupt("return",j.setIsLoadingStats(!1));case 9:return e.next=11,j.setStats(r,x(t));case 11:return e.abrupt("return",j.setIsLoadingStats(!1));case 12:case"end":return e.stop()}}),e)}))},P=Object(p.createReduxStore)("altis/analytics",{actions:j,controls:E,initialState:{isLoading:!1,isLoadingStats:!1,pagination:{total:0,pages:0},posts:{},stats:{}},reducer:function(e,t){switch(t.type){case"SET_POSTS":return v(v({},e),{},{posts:v(v({},e.posts),{},o()({},t.key,t.posts.sort(y)))});case"SET_STATS":return v(v({},e),{},{stats:v(v({},e.stats),{},o()({},t.key,t.stats))});case"REFRESH_STATS":return v(v({},e),{},{stats:{}});case"SET_IS_LOADING":return v(v({},e),{},{isLoading:t.isLoading});case"SET_IS_LOADING_STATS":return v(v({},e),{},{isLoadingStats:t.isLoading});case"SET_PAGINATION":return v(v({},e),{},{pagination:{total:t.total,pages:t.pages}});default:t.type;return e}},resolvers:N,selectors:S})},69:function(e,t){e.exports=wp.url},9:function(e,t){e.exports=moment},98:function(e,t){e.exports=wp.apiFetch}});