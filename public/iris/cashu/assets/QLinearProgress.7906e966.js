import{u as k,a as b}from"./use-dark.3625dc1e.js";import{B as S,av as h,aw as C,E as r,k as t,aa as x,f as B}from"./index.927995fe.js";const w={xs:2,sm:4,md:6,lg:10,xl:14};function d(e,l,a){return{transform:l===!0?`translateX(${a.lang.rtl===!0?"-":""}100%) scale3d(${-e},1,1)`:`scale3d(${e},1,1)`}}var D=S({name:"QLinearProgress",props:{...k,...h,value:{type:Number,default:0},buffer:Number,color:String,trackColor:String,reverse:Boolean,stripe:Boolean,indeterminate:Boolean,query:Boolean,rounded:Boolean,animationSpeed:{type:[String,Number],default:2100},instantFeedback:Boolean},setup(e,{slots:l}){const{proxy:a}=B(),c=b(e,a.$q),u=C(e,w),s=r(()=>e.indeterminate===!0||e.query===!0),o=r(()=>e.reverse!==e.query),v=r(()=>({...u.value!==null?u.value:{},"--q-linear-progress-speed":`${e.animationSpeed}ms`})),m=r(()=>"q-linear-progress"+(e.color!==void 0?` text-${e.color}`:"")+(e.reverse===!0||e.query===!0?" q-linear-progress--reverse":"")+(e.rounded===!0?" rounded-borders":"")),g=r(()=>d(e.buffer!==void 0?e.buffer:1,o.value,a.$q)),n=r(()=>`with${e.instantFeedback===!0?"out":""}-transition`),f=r(()=>`q-linear-progress__track absolute-full q-linear-progress__track--${n.value} q-linear-progress__track--${c.value===!0?"dark":"light"}`+(e.trackColor!==void 0?` bg-${e.trackColor}`:"")),q=r(()=>d(s.value===!0?1:e.value,o.value,a.$q)),$=r(()=>`q-linear-progress__model absolute-full q-linear-progress__model--${n.value} q-linear-progress__model--${s.value===!0?"in":""}determinate`),y=r(()=>({width:`${e.value*100}%`})),_=r(()=>`q-linear-progress__stripe absolute-${e.reverse===!0?"right":"left"} q-linear-progress__stripe--${n.value}`);return()=>{const i=[t("div",{class:f.value,style:g.value}),t("div",{class:$.value,style:q.value})];return e.stripe===!0&&s.value===!1&&i.push(t("div",{class:_.value,style:y.value})),t("div",{class:m.value,style:v.value,role:"progressbar","aria-valuemin":0,"aria-valuemax":1,"aria-valuenow":e.indeterminate===!0?void 0:e.value},x(l.default,i))}}});export{D as Q};
