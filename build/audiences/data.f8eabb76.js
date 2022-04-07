!function(t,e){for(var r in e)t[r]=e[r]}(this,function(t){var e={};function r(n){if(e[n])return e[n].exports;var o=e[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)r.d(n,o,function(e){return t[e]}.bind(null,o));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="/",r(r.s=186)}({1:function(t,e,r){t.exports=r(25)},17:function(t,e,r){"use strict";r.d(e,"d",(function(){return n})),r.d(e,"b",(function(){return o})),r.d(e,"a",(function(){return a})),r.d(e,"c",(function(){return i}));var n={field:"",operator:"=",value:"",type:"string"},o={include:"any",rules:[n]},a={include:"all",groups:[o]},i={title:{rendered:"",raw:""},audience:a,status:"draft"}},186:function(t,e,r){"use strict";r.r(e);var n=r(4),o=r.n(n),a=r(1),i=r.n(a),s=r(17),u=r(42);function c(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,n)}return r}function p(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?c(Object(r),!0).forEach((function(e){o()(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):c(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}var f=function(t,e){return t.error||e.error?0:t.menu_order<e.menu_order?-1:t.menu_order>e.menu_order?1:t.title.rendered<e.title.rendered?-1:t.title.rendered>e.title.rendered?1:0};function d(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,n)}return r}r.d(e,"store",(function(){return x}));var l=wp.apiFetch,h=wp.data.registerStore,g=wp.url.addQueryArgs,y={estimates:{},fields:[],pagination:{},post:s.c,posts:[],isLoading:!1,isUpdating:!1,isDeleting:!1};l.use((function(t,e){return t.path&&(t.path=t.path.replace("wp/v2/audiences","analytics/v1/audiences")),e(t)}));var v={FETCH_FROM_API:function(t){return l(t.options)},RESPONSE_TO_JSON:function(t){return t.response.json()}},m={setFields:function(t){return{type:"SET_FIELDS",fields:t}},addPosts:function(t){return{type:"ADD_POSTS",posts:t}},addEstimate:function(t,e){return{type:"ADD_ESTIMATE",audience:t,estimate:e}},removePost:function(t){return{type:"REMOVE_POST",id:t}},setCurrentPost:function(t){return{type:"SET_CURRENT_POST",post:t}},updateCurrentPost:function(t){return{type:"UPDATE_CURRENT_POST",post:t}},setIsLoading:function(t){return{type:"SET_IS_LOADING",isLoading:t}},setIsUpdating:function(t){return{type:"SET_IS_UPDATING",isUpdating:t}},setIsDeleting:function(t){return{type:"SET_IS_DELETING",isDeleting:t}},setPagination:function(t,e){return{type:"SET_PAGINATION",total:t,pages:e}},fetch:function(t){return{type:"FETCH_FROM_API",options:t}},json:function(t){return{type:"RESPONSE_TO_JSON",response:t}}},w={createPost:i.a.mark((function t(e){var r;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,m.setIsUpdating(!0);case 2:return t.next=4,m.fetch({path:"analytics/v1/audiences",method:"POST",data:e});case 4:return r=t.sent,t.next=7,m.addPosts([r]);case 7:return t.next=9,m.updateCurrentPost(r);case 9:return t.abrupt("return",m.setIsUpdating(!1));case 10:case"end":return t.stop()}}),t)})),updatePost:i.a.mark((function t(e){var r;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(e.id){t.next=2;break}return t.abrupt("return");case 2:return t.next=4,m.setIsUpdating(!0);case 4:return e.title&&!e.title.raw&&(e.title.raw=e.title.rendered),t.next=7,m.fetch({path:"analytics/v1/audiences/".concat(e.id),method:"PATCH",data:e});case 7:return r=t.sent,t.next=10,m.updateCurrentPost(r);case 10:return t.abrupt("return",m.setIsUpdating(!1));case 11:case"end":return t.stop()}}),t)})),deletePost:i.a.mark((function t(e){return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,m.setIsDeleting(!0);case 2:return t.next=4,m.fetch({path:"analytics/v1/audiences/".concat(e),method:"DELETE"});case 4:return t.next=6,m.removePost(e);case 6:return t.abrupt("return",m.setIsDeleting(!1));case 7:case"end":return t.stop()}}),t)}))},b={getFields:function(t){return t.fields},getEstimate:function(t,e){var r=JSON.stringify(e);return t.estimates[r]||{count:0,isLoading:!1,total:0,histogram:new Array(28).fill({count:1})}},getPost:function(t,e){return t.posts.find((function(t){return t.id===e}))},getCurrentPost:function(t){return t.post},getPosts:function(t){return t.posts},getPagination:function(t){return t.pagination},getIsLoading:function(t){return t.isLoading},getIsUpdating:function(t){return t.isUpdating},getIsDeleting:function(t){return t.isDeleting}},O={getFields:i.a.mark((function t(){var e;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,m.fetch({path:"analytics/v1/audiences/fields"});case 2:return e=t.sent,t.abrupt("return",m.setFields(e));case 4:case"end":return t.stop()}}),t)})),getEstimate:i.a.mark((function t(e){var r,n;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,m.addEstimate(e,{count:0,isLoading:!0,total:0,histogram:new Array(28).fill({count:1})});case 2:return r=encodeURIComponent(JSON.stringify(e)),t.next=5,m.fetch({path:"analytics/v1/audiences/estimate?audience=".concat(r)});case 5:return(n=t.sent).histogram=n.histogram||new Array(28).fill({count:1}),n.isLoading=!1,t.abrupt("return",m.addEstimate(e,n));case 9:case"end":return t.stop()}}),t)})),getPost:i.a.mark((function t(e){var r,n,o=arguments;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(r=o.length>1&&void 0!==o[1]?o[1]:{},e){t.next=3;break}return t.abrupt("return");case 3:return t.next=5,m.setIsLoading(!0);case 5:return r=Object.assign({context:"view"},r),t.prev=6,t.next=9,m.fetch({path:g("analytics/v1/audiences/".concat(e),r)});case 9:return"auto-draft"===(n=t.sent).status&&(n.title.rendered=""),n.audience||(n.audience=s.a),t.next=14,m.addPosts([n]);case 14:t.next=20;break;case 16:return t.prev=16,t.t0=t.catch(6),t.next=20,m.addPosts([{id:e,error:t.t0}]);case 20:return t.abrupt("return",m.setIsLoading(!1));case 21:case"end":return t.stop()}}),t,null,[[6,16]])})),getCurrentPost:i.a.mark((function t(e){var r,n,o=arguments;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(r=o.length>1&&void 0!==o[1]?o[1]:{},e){t.next=3;break}return t.abrupt("return");case 3:return t.next=5,m.setIsLoading(!0);case 5:return r=Object.assign({context:"view"},r),t.next=8,m.fetch({path:g("analytics/v1/audiences/".concat(e),r)});case 8:return"auto-draft"===(n=t.sent).status&&(n.title.rendered=""),n.audience||(n.audience=s.a),t.next=13,m.addPosts([n]);case 13:return t.next=15,m.setCurrentPost(n);case 15:return t.abrupt("return",m.setIsLoading(!1));case 16:case"end":return t.stop()}}),t)})),getPosts:i.a.mark((function t(){var e,r,n,o=arguments;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=o.length>0&&void 0!==o[0]?o[0]:{},t.next=3,m.setIsLoading(!0);case 3:return e=Object.assign({context:"edit",per_page:20,page:1,search:"",status:"publish,draft"},e),t.next=6,m.fetch({path:g("analytics/v1/audiences",e),headers:{"Access-Control-Expose-Headers":"X-WP-Total, X-WP-TotalPages"},parse:!1});case 6:return r=t.sent,t.next=9,m.json(r);case 9:return n=t.sent,t.next=12,m.addPosts(n);case 12:return t.next=14,m.setPagination(r.headers.get("x-wp-total"),r.headers.get("x-wp-totalpages"));case 14:return t.abrupt("return",m.setIsLoading(!1));case 15:case"end":return t.stop()}}),t)}))},x=h("audience",{actions:function(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?d(Object(r),!0).forEach((function(e){o()(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):d(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}({},m,{},w),controls:v,initialState:y,reducer:function(t,e){switch(e.type){case"SET_FIELDS":return p({},t,{fields:e.fields});case"ADD_ESTIMATE":var r=JSON.stringify(e.audience);return p({},t,{estimates:p({},t.estimates,o()({},r,e.estimate))});case"ADD_POSTS":var n=Object(u.unionBy)(e.posts,t.posts,(function(t){return t.id}));return n.sort(f),p({},t,{posts:n});case"REMOVE_POST":return p({},t,{pagination:{total:t.pagination.total-1,pages:Math.floor((t.pagination.total-1)/20)},posts:t.posts.filter((function(t){return t.id!==e.id}))});case"SET_CURRENT_POST":if(!e.post.id)return p({},t,{post:p({},e.post)});var a=t.posts.map((function(t){return t.id!==e.post.id?t:p({},e.post)}));return a.sort(f),p({},t,{posts:a,post:p({},e.post)});case"UPDATE_CURRENT_POST":if(!e.post.id)return p({},t,{post:p({},t.post,{},e.post)});var i=t.posts.map((function(t){return t.id!==e.post.id?t:p({},t,{},e.post)}));return i.sort(f),p({},t,{posts:i,post:p({},t.post,{},e.post)});case"SET_IS_LOADING":return p({},t,{isLoading:e.isLoading});case"SET_IS_UPDATING":return p({},t,{isUpdating:e.isUpdating});case"SET_IS_DELETING":return p({},t,{isDeleting:e.isDeleting});case"SET_PAGINATION":return p({},t,{pagination:{total:e.total,pages:e.pages}});default:return t}},resolvers:O,selectors:b})},25:function(t,e,r){var n=function(t){"use strict";var e=Object.prototype,r=e.hasOwnProperty,n="function"==typeof Symbol?Symbol:{},o=n.iterator||"@@iterator",a=n.asyncIterator||"@@asyncIterator",i=n.toStringTag||"@@toStringTag";function s(t,e,r,n){var o=e&&e.prototype instanceof p?e:p,a=Object.create(o.prototype),i=new x(n||[]);return a._invoke=function(t,e,r){var n="suspendedStart";return function(o,a){if("executing"===n)throw new Error("Generator is already running");if("completed"===n){if("throw"===o)throw a;return E()}for(r.method=o,r.arg=a;;){var i=r.delegate;if(i){var s=w(i,r);if(s){if(s===c)continue;return s}}if("next"===r.method)r.sent=r._sent=r.arg;else if("throw"===r.method){if("suspendedStart"===n)throw n="completed",r.arg;r.dispatchException(r.arg)}else"return"===r.method&&r.abrupt("return",r.arg);n="executing";var p=u(t,e,r);if("normal"===p.type){if(n=r.done?"completed":"suspendedYield",p.arg===c)continue;return{value:p.arg,done:r.done}}"throw"===p.type&&(n="completed",r.method="throw",r.arg=p.arg)}}}(t,r,i),a}function u(t,e,r){try{return{type:"normal",arg:t.call(e,r)}}catch(t){return{type:"throw",arg:t}}}t.wrap=s;var c={};function p(){}function f(){}function d(){}var l={};l[o]=function(){return this};var h=Object.getPrototypeOf,g=h&&h(h(P([])));g&&g!==e&&r.call(g,o)&&(l=g);var y=d.prototype=p.prototype=Object.create(l);function v(t){["next","throw","return"].forEach((function(e){t[e]=function(t){return this._invoke(e,t)}}))}function m(t){var e;this._invoke=function(n,o){function a(){return new Promise((function(e,a){!function e(n,o,a,i){var s=u(t[n],t,o);if("throw"!==s.type){var c=s.arg,p=c.value;return p&&"object"==typeof p&&r.call(p,"__await")?Promise.resolve(p.__await).then((function(t){e("next",t,a,i)}),(function(t){e("throw",t,a,i)})):Promise.resolve(p).then((function(t){c.value=t,a(c)}),(function(t){return e("throw",t,a,i)}))}i(s.arg)}(n,o,e,a)}))}return e=e?e.then(a,a):a()}}function w(t,e){var r=t.iterator[e.method];if(void 0===r){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=void 0,w(t,e),"throw"===e.method))return c;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method")}return c}var n=u(r,t.iterator,e.arg);if("throw"===n.type)return e.method="throw",e.arg=n.arg,e.delegate=null,c;var o=n.arg;return o?o.done?(e[t.resultName]=o.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=void 0),e.delegate=null,c):o:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,c)}function b(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e)}function O(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e}function x(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(b,this),this.reset(!0)}function P(t){if(t){var e=t[o];if(e)return e.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var n=-1,a=function e(){for(;++n<t.length;)if(r.call(t,n))return e.value=t[n],e.done=!1,e;return e.value=void 0,e.done=!0,e};return a.next=a}}return{next:E}}function E(){return{value:void 0,done:!0}}return f.prototype=y.constructor=d,d.constructor=f,d[i]=f.displayName="GeneratorFunction",t.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return!!e&&(e===f||"GeneratorFunction"===(e.displayName||e.name))},t.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,d):(t.__proto__=d,i in t||(t[i]="GeneratorFunction")),t.prototype=Object.create(y),t},t.awrap=function(t){return{__await:t}},v(m.prototype),m.prototype[a]=function(){return this},t.AsyncIterator=m,t.async=function(e,r,n,o){var a=new m(s(e,r,n,o));return t.isGeneratorFunction(r)?a:a.next().then((function(t){return t.done?t.value:a.next()}))},v(y),y[i]="Generator",y[o]=function(){return this},y.toString=function(){return"[object Generator]"},t.keys=function(t){var e=[];for(var r in t)e.push(r);return e.reverse(),function r(){for(;e.length;){var n=e.pop();if(n in t)return r.value=n,r.done=!1,r}return r.done=!0,r}},t.values=P,x.prototype={constructor:x,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(O),!t)for(var e in this)"t"===e.charAt(0)&&r.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=void 0)},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var e=this;function n(r,n){return i.type="throw",i.arg=t,e.next=r,n&&(e.method="next",e.arg=void 0),!!n}for(var o=this.tryEntries.length-1;o>=0;--o){var a=this.tryEntries[o],i=a.completion;if("root"===a.tryLoc)return n("end");if(a.tryLoc<=this.prev){var s=r.call(a,"catchLoc"),u=r.call(a,"finallyLoc");if(s&&u){if(this.prev<a.catchLoc)return n(a.catchLoc,!0);if(this.prev<a.finallyLoc)return n(a.finallyLoc)}else if(s){if(this.prev<a.catchLoc)return n(a.catchLoc,!0)}else{if(!u)throw new Error("try statement without catch or finally");if(this.prev<a.finallyLoc)return n(a.finallyLoc)}}}},abrupt:function(t,e){for(var n=this.tryEntries.length-1;n>=0;--n){var o=this.tryEntries[n];if(o.tryLoc<=this.prev&&r.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var a=o;break}}a&&("break"===t||"continue"===t)&&a.tryLoc<=e&&e<=a.finallyLoc&&(a=null);var i=a?a.completion:{};return i.type=t,i.arg=e,a?(this.method="next",this.next=a.finallyLoc,c):this.complete(i)},complete:function(t,e){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),c},finish:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.finallyLoc===t)return this.complete(r.completion,r.afterLoc),O(r),c}},catch:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.tryLoc===t){var n=r.completion;if("throw"===n.type){var o=n.arg;O(r)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,r){return this.delegate={iterator:P(t),resultName:e,nextLoc:r},"next"===this.method&&(this.arg=void 0),c}},t}(t.exports);try{regeneratorRuntime=n}catch(t){Function("r","regeneratorRuntime = r")(n)}},4:function(t,e){t.exports=function(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}},42:function(t,e){!function(){t.exports=this.lodash}()}}));