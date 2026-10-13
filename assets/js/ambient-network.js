(() => {
  'use strict';

  const VERSION = '20260910-network-refactor3';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(hover:none), (pointer:coarse)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  const mobileViewport = window.matchMedia('(max-width:760px)');
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const MOTION_SPEED = 8;
  const MOBILE_FRAME_MS = 1000/30;

  function createRng(seed){
    return () => {
      seed|=0; seed=(seed+0x6D2B79F5)|0;
      let t=Math.imul(seed^(seed>>>15),1|seed);
      t^=t+Math.imul(t^(t>>>7),61|t);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }


  // particles.js 2.0.0, Vincent Garreau, MIT.
  // Original engine and configuration inspected at:
  // https://sanjuandeguadalupe.durango.gob.mx/plugins/particles/{particles.js,particles-dots.js}
  // Only event routing/lifecycle is adapted to the existing non-blocking ambient layer.
  function startReferenceNetwork(){
    const requestAnimFrame=window.requestAnimationFrame.bind(window);
    const cancelRequestAnimFrame=window.cancelAnimationFrame.bind(window);
    function deepExtend(target,source){
      for(const key in source){
        const value=source[key];
        if(value && value.constructor===Object){target[key]=target[key]||{};deepExtend(target[key],value);}
        else target[key]=value;
      }
      return target;
    }
    function hexToRgb(e){var a=/^#?([a-f\d])([a-f\d])([a-f\d])$/i;e=e.replace(a,function(e,a,t,i){return a+a+t+t+i+i});var t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?{r:parseInt(t[1],16),g:parseInt(t[2],16),b:parseInt(t[3],16)}:null}function clamp(e,a,t){return Math.min(Math.max(e,a),t)}function isInArray(e,a){return a.indexOf(e)>-1}var pJS=function(e,a){var t=document.querySelector("#"+e+" > .particles-js-canvas-el");this.pJS={canvas:{el:t,w:t.offsetWidth,h:t.offsetHeight},particles:{number:{value:400,density:{enable:!0,value_area:800}},color:{value:"#fff"},shape:{type:"circle",stroke:{width:0,color:"#ff0000"},polygon:{nb_sides:5},image:{src:"",width:100,height:100}},opacity:{value:1,random:!1,anim:{enable:!1,speed:2,opacity_min:0,sync:!1}},size:{value:20,random:!1,anim:{enable:!1,speed:20,size_min:0,sync:!1}},line_linked:{enable:!0,distance:100,color:"#fff",opacity:1,width:1},move:{enable:!0,speed:2,direction:"none",random:!1,straight:!1,out_mode:"out",bounce:!1,attract:{enable:!1,rotateX:3e3,rotateY:3e3}},array:[]},interactivity:{detect_on:"canvas",events:{onhover:{enable:!0,mode:"grab"},onclick:{enable:!0,mode:"push"},resize:!0},modes:{grab:{distance:100,line_linked:{opacity:1}},bubble:{distance:200,size:80,duration:.4},repulse:{distance:200,duration:.4},push:{particles_nb:4},remove:{particles_nb:2}},mouse:{}},retina_detect:!1,fn:{interact:{},modes:{},vendors:{}},tmp:{}};var i=this.pJS;a&&deepExtend(i,a),i.tmp.obj={size_value:i.particles.size.value,size_anim_speed:i.particles.size.anim.speed,move_speed:i.particles.move.speed,line_linked_distance:i.particles.line_linked.distance,line_linked_width:i.particles.line_linked.width,mode_grab_distance:i.interactivity.modes.grab.distance,mode_bubble_distance:i.interactivity.modes.bubble.distance,mode_bubble_size:i.interactivity.modes.bubble.size,mode_repulse_distance:i.interactivity.modes.repulse.distance},i.fn.retinaInit=function(){i.retina_detect&&window.devicePixelRatio>1?(i.canvas.pxratio=window.devicePixelRatio,i.tmp.retina=!0):(i.canvas.pxratio=1,i.tmp.retina=!1),i.canvas.w=i.canvas.el.offsetWidth*i.canvas.pxratio,i.canvas.h=i.canvas.el.offsetHeight*i.canvas.pxratio,i.particles.size.value=i.tmp.obj.size_value*i.canvas.pxratio,i.particles.size.anim.speed=i.tmp.obj.size_anim_speed*i.canvas.pxratio,i.particles.move.speed=i.tmp.obj.move_speed*i.canvas.pxratio,i.particles.line_linked.distance=i.tmp.obj.line_linked_distance*i.canvas.pxratio,i.interactivity.modes.grab.distance=i.tmp.obj.mode_grab_distance*i.canvas.pxratio,i.interactivity.modes.bubble.distance=i.tmp.obj.mode_bubble_distance*i.canvas.pxratio,i.particles.line_linked.width=i.tmp.obj.line_linked_width*i.canvas.pxratio,i.interactivity.modes.bubble.size=i.tmp.obj.mode_bubble_size*i.canvas.pxratio,i.interactivity.modes.repulse.distance=i.tmp.obj.mode_repulse_distance*i.canvas.pxratio},i.fn.canvasInit=function(){i.canvas.ctx=i.canvas.el.getContext("2d")},i.fn.canvasSize=function(){i.canvas.el.width=i.canvas.w,i.canvas.el.height=i.canvas.h,i&&i.interactivity.events.resize&&window.addEventListener("resize",function(){i.canvas.w=i.canvas.el.offsetWidth,i.canvas.h=i.canvas.el.offsetHeight,i.tmp.retina&&(i.canvas.w*=i.canvas.pxratio,i.canvas.h*=i.canvas.pxratio),i.canvas.el.width=i.canvas.w,i.canvas.el.height=i.canvas.h,i.particles.move.enable||(i.fn.particlesEmpty(),i.fn.particlesCreate(),i.fn.particlesDraw(),i.fn.vendors.densityAutoParticles()),i.fn.vendors.densityAutoParticles()})},i.fn.canvasPaint=function(){i.canvas.ctx.fillRect(0,0,i.canvas.w,i.canvas.h)},i.fn.canvasClear=function(){i.canvas.ctx.clearRect(0,0,i.canvas.w,i.canvas.h)},i.fn.particle=function(e,a,t){if(this.radius=(i.particles.size.random?Math.random():1)*i.particles.size.value,i.particles.size.anim.enable&&(this.size_status=!1,this.vs=i.particles.size.anim.speed/100,i.particles.size.anim.sync||(this.vs=this.vs*Math.random())),this.x=t?t.x:Math.random()*i.canvas.w,this.y=t?t.y:Math.random()*i.canvas.h,this.x>i.canvas.w-2*this.radius?this.x=this.x-this.radius:this.x<2*this.radius&&(this.x=this.x+this.radius),this.y>i.canvas.h-2*this.radius?this.y=this.y-this.radius:this.y<2*this.radius&&(this.y=this.y+this.radius),i.particles.move.bounce&&i.fn.vendors.checkOverlap(this,t),this.color={},"object"==typeof e.value)if(e.value instanceof Array){var s=e.value[Math.floor(Math.random()*i.particles.color.value.length)];this.color.rgb=hexToRgb(s)}else void 0!=e.value.r&&void 0!=e.value.g&&void 0!=e.value.b&&(this.color.rgb={r:e.value.r,g:e.value.g,b:e.value.b}),void 0!=e.value.h&&void 0!=e.value.s&&void 0!=e.value.l&&(this.color.hsl={h:e.value.h,s:e.value.s,l:e.value.l});else"random"==e.value?this.color.rgb={r:Math.floor(256*Math.random())+0,g:Math.floor(256*Math.random())+0,b:Math.floor(256*Math.random())+0}:"string"==typeof e.value&&(this.color=e,this.color.rgb=hexToRgb(this.color.value));this.opacity=(i.particles.opacity.random?Math.random():1)*i.particles.opacity.value,i.particles.opacity.anim.enable&&(this.opacity_status=!1,this.vo=i.particles.opacity.anim.speed/100,i.particles.opacity.anim.sync||(this.vo=this.vo*Math.random()));var n={};switch(i.particles.move.direction){case"top":n={x:0,y:-1};break;case"top-right":n={x:.5,y:-.5};break;case"right":n={x:1,y:-0};break;case"bottom-right":n={x:.5,y:.5};break;case"bottom":n={x:0,y:1};break;case"bottom-left":n={x:-.5,y:1};break;case"left":n={x:-1,y:0};break;case"top-left":n={x:-.5,y:-.5};break;default:n={x:0,y:0}}i.particles.move.straight?(this.vx=n.x,this.vy=n.y,i.particles.move.random&&(this.vx=this.vx*Math.random(),this.vy=this.vy*Math.random())):(this.vx=n.x+Math.random()-.5,this.vy=n.y+Math.random()-.5),this.vx_i=this.vx,this.vy_i=this.vy;var r=i.particles.shape.type;if("object"==typeof r){if(r instanceof Array){var c=r[Math.floor(Math.random()*r.length)];this.shape=c}}else this.shape=r;if("image"==this.shape){var o=i.particles.shape;this.img={src:o.image.src,ratio:o.image.width/o.image.height},this.img.ratio||(this.img.ratio=1),"svg"==i.tmp.img_type&&void 0!=i.tmp.source_svg&&(i.fn.vendors.createSvgImg(this),i.tmp.pushing&&(this.img.loaded=!1))}},i.fn.particle.prototype.draw=function(){function e(){i.canvas.ctx.drawImage(r,a.x-t,a.y-t,2*t,2*t/a.img.ratio)}var a=this;if(void 0!=a.radius_bubble)var t=a.radius_bubble;else var t=a.radius;if(void 0!=a.opacity_bubble)var s=a.opacity_bubble;else var s=a.opacity;if(a.color.rgb)var n="rgba("+a.color.rgb.r+","+a.color.rgb.g+","+a.color.rgb.b+","+s+")";else var n="hsla("+a.color.hsl.h+","+a.color.hsl.s+"%,"+a.color.hsl.l+"%,"+s+")";switch(i.canvas.ctx.fillStyle=n,i.canvas.ctx.beginPath(),a.shape){case"circle":i.canvas.ctx.arc(a.x,a.y,t,0,2*Math.PI,!1);break;case"edge":i.canvas.ctx.rect(a.x-t,a.y-t,2*t,2*t);break;case"triangle":i.fn.vendors.drawShape(i.canvas.ctx,a.x-t,a.y+t/1.66,2*t,3,2);break;case"polygon":i.fn.vendors.drawShape(i.canvas.ctx,a.x-t/(i.particles.shape.polygon.nb_sides/3.5),a.y-t/.76,2.66*t/(i.particles.shape.polygon.nb_sides/3),i.particles.shape.polygon.nb_sides,1);break;case"star":i.fn.vendors.drawShape(i.canvas.ctx,a.x-2*t/(i.particles.shape.polygon.nb_sides/4),a.y-t/1.52,2*t*2.66/(i.particles.shape.polygon.nb_sides/3),i.particles.shape.polygon.nb_sides,2);break;case"image":if("svg"==i.tmp.img_type)var r=a.img.obj;else var r=i.tmp.img_obj;r&&e()}i.canvas.ctx.closePath(),i.particles.shape.stroke.width>0&&(i.canvas.ctx.strokeStyle=i.particles.shape.stroke.color,i.canvas.ctx.lineWidth=i.particles.shape.stroke.width,i.canvas.ctx.stroke()),i.canvas.ctx.fill()},i.fn.particlesCreate=function(){for(var e=0;e<i.particles.number.value;e++)i.particles.array.push(new i.fn.particle(i.particles.color,i.particles.opacity.value))},i.fn.particlesUpdate=function(){for(var e=0;e<i.particles.array.length;e++){var a=i.particles.array[e];if(i.particles.move.enable){var t=i.particles.move.speed/2;a.x+=a.vx*t,a.y+=a.vy*t}if(i.particles.opacity.anim.enable&&(1==a.opacity_status?(a.opacity>=i.particles.opacity.value&&(a.opacity_status=!1),a.opacity+=a.vo):(a.opacity<=i.particles.opacity.anim.opacity_min&&(a.opacity_status=!0),a.opacity-=a.vo),a.opacity<0&&(a.opacity=0)),i.particles.size.anim.enable&&(1==a.size_status?(a.radius>=i.particles.size.value&&(a.size_status=!1),a.radius+=a.vs):(a.radius<=i.particles.size.anim.size_min&&(a.size_status=!0),a.radius-=a.vs),a.radius<0&&(a.radius=0)),"bounce"==i.particles.move.out_mode)var s={x_left:a.radius,x_right:i.canvas.w,y_top:a.radius,y_bottom:i.canvas.h};else var s={x_left:-a.radius,x_right:i.canvas.w+a.radius,y_top:-a.radius,y_bottom:i.canvas.h+a.radius};switch(a.x-a.radius>i.canvas.w?(a.x=s.x_left,a.y=Math.random()*i.canvas.h):a.x+a.radius<0&&(a.x=s.x_right,a.y=Math.random()*i.canvas.h),a.y-a.radius>i.canvas.h?(a.y=s.y_top,a.x=Math.random()*i.canvas.w):a.y+a.radius<0&&(a.y=s.y_bottom,a.x=Math.random()*i.canvas.w),i.particles.move.out_mode){case"bounce":a.x+a.radius>i.canvas.w?a.vx=-a.vx:a.x-a.radius<0&&(a.vx=-a.vx),a.y+a.radius>i.canvas.h?a.vy=-a.vy:a.y-a.radius<0&&(a.vy=-a.vy)}if(isInArray("grab",i.interactivity.events.onhover.mode)&&i.fn.modes.grabParticle(a),(isInArray("bubble",i.interactivity.events.onhover.mode)||isInArray("bubble",i.interactivity.events.onclick.mode))&&i.fn.modes.bubbleParticle(a),(isInArray("repulse",i.interactivity.events.onhover.mode)||isInArray("repulse",i.interactivity.events.onclick.mode))&&i.fn.modes.repulseParticle(a),i.particles.line_linked.enable||i.particles.move.attract.enable)for(var n=e+1;n<i.particles.array.length;n++){var r=i.particles.array[n];i.particles.line_linked.enable&&i.fn.interact.linkParticles(a,r),i.particles.move.attract.enable&&i.fn.interact.attractParticles(a,r),i.particles.move.bounce&&i.fn.interact.bounceParticles(a,r)}}},i.fn.particlesDraw=function(){i.canvas.ctx.clearRect(0,0,i.canvas.w,i.canvas.h),i.fn.particlesUpdate();for(var e=0;e<i.particles.array.length;e++){var a=i.particles.array[e];a.draw()}},i.fn.particlesEmpty=function(){i.particles.array=[]},i.fn.particlesRefresh=function(){cancelRequestAnimFrame(i.fn.checkAnimFrame),cancelRequestAnimFrame(i.fn.drawAnimFrame),i.tmp.source_svg=void 0,i.tmp.img_obj=void 0,i.tmp.count_svg=0,i.fn.particlesEmpty(),i.fn.canvasClear(),i.fn.vendors.start()},i.fn.interact.linkParticles=function(e,a){var t=e.x-a.x,s=e.y-a.y,n=Math.sqrt(t*t+s*s);if(n<=i.particles.line_linked.distance){var r=i.particles.line_linked.opacity-n/(1/i.particles.line_linked.opacity)/i.particles.line_linked.distance;if(r>0){var c=i.particles.line_linked.color_rgb_line;i.canvas.ctx.strokeStyle="rgba("+c.r+","+c.g+","+c.b+","+r+")",i.canvas.ctx.lineWidth=i.particles.line_linked.width,i.canvas.ctx.beginPath(),i.canvas.ctx.moveTo(e.x,e.y),i.canvas.ctx.lineTo(a.x,a.y),i.canvas.ctx.stroke(),i.canvas.ctx.closePath()}}},i.fn.interact.attractParticles=function(e,a){var t=e.x-a.x,s=e.y-a.y,n=Math.sqrt(t*t+s*s);if(n<=i.particles.line_linked.distance){var r=t/(1e3*i.particles.move.attract.rotateX),c=s/(1e3*i.particles.move.attract.rotateY);e.vx-=r,e.vy-=c,a.vx+=r,a.vy+=c}},i.fn.interact.bounceParticles=function(e,a){var t=e.x-a.x,i=e.y-a.y,s=Math.sqrt(t*t+i*i),n=e.radius+a.radius;n>=s&&(e.vx=-e.vx,e.vy=-e.vy,a.vx=-a.vx,a.vy=-a.vy)},i.fn.modes.pushParticles=function(e,a){i.tmp.pushing=!0;for(var t=0;e>t;t++)i.particles.array.push(new i.fn.particle(i.particles.color,i.particles.opacity.value,{x:a?a.pos_x:Math.random()*i.canvas.w,y:a?a.pos_y:Math.random()*i.canvas.h})),t==e-1&&(i.particles.move.enable||i.fn.particlesDraw(),i.tmp.pushing=!1)},i.fn.modes.removeParticles=function(e){i.particles.array.splice(0,e),i.particles.move.enable||i.fn.particlesDraw()},i.fn.modes.bubbleParticle=function(e){function a(){e.opacity_bubble=e.opacity,e.radius_bubble=e.radius}function t(a,t,s,n,c){if(a!=t)if(i.tmp.bubble_duration_end){if(void 0!=s){var o=n-p*(n-a)/i.interactivity.modes.bubble.duration,l=a-o;d=a+l,"size"==c&&(e.radius_bubble=d),"opacity"==c&&(e.opacity_bubble=d)}}else if(r<=i.interactivity.modes.bubble.distance){if(void 0!=s)var v=s;else var v=n;if(v!=a){var d=n-p*(n-a)/i.interactivity.modes.bubble.duration;"size"==c&&(e.radius_bubble=d),"opacity"==c&&(e.opacity_bubble=d)}}else"size"==c&&(e.radius_bubble=void 0),"opacity"==c&&(e.opacity_bubble=void 0)}if(i.interactivity.events.onhover.enable&&isInArray("bubble",i.interactivity.events.onhover.mode)){var s=e.x-i.interactivity.mouse.pos_x,n=e.y-i.interactivity.mouse.pos_y,r=Math.sqrt(s*s+n*n),c=1-r/i.interactivity.modes.bubble.distance;if(r<=i.interactivity.modes.bubble.distance){if(c>=0&&"mousemove"==i.interactivity.status){if(i.interactivity.modes.bubble.size!=i.particles.size.value)if(i.interactivity.modes.bubble.size>i.particles.size.value){var o=e.radius+i.interactivity.modes.bubble.size*c;o>=0&&(e.radius_bubble=o)}else{var l=e.radius-i.interactivity.modes.bubble.size,o=e.radius-l*c;o>0?e.radius_bubble=o:e.radius_bubble=0}if(i.interactivity.modes.bubble.opacity!=i.particles.opacity.value)if(i.interactivity.modes.bubble.opacity>i.particles.opacity.value){var v=i.interactivity.modes.bubble.opacity*c;v>e.opacity&&v<=i.interactivity.modes.bubble.opacity&&(e.opacity_bubble=v)}else{var v=e.opacity-(i.particles.opacity.value-i.interactivity.modes.bubble.opacity)*c;v<e.opacity&&v>=i.interactivity.modes.bubble.opacity&&(e.opacity_bubble=v)}}}else a();"mouseleave"==i.interactivity.status&&a()}else if(i.interactivity.events.onclick.enable&&isInArray("bubble",i.interactivity.events.onclick.mode)){if(i.tmp.bubble_clicking){var s=e.x-i.interactivity.mouse.click_pos_x,n=e.y-i.interactivity.mouse.click_pos_y,r=Math.sqrt(s*s+n*n),p=((new Date).getTime()-i.interactivity.mouse.click_time)/1e3;p>i.interactivity.modes.bubble.duration&&(i.tmp.bubble_duration_end=!0),p>2*i.interactivity.modes.bubble.duration&&(i.tmp.bubble_clicking=!1,i.tmp.bubble_duration_end=!1)}i.tmp.bubble_clicking&&(t(i.interactivity.modes.bubble.size,i.particles.size.value,e.radius_bubble,e.radius,"size"),t(i.interactivity.modes.bubble.opacity,i.particles.opacity.value,e.opacity_bubble,e.opacity,"opacity"))}},i.fn.modes.repulseParticle=function(e){function a(){var a=Math.atan2(d,p);if(e.vx=u*Math.cos(a),e.vy=u*Math.sin(a),"bounce"==i.particles.move.out_mode){var t={x:e.x+e.vx,y:e.y+e.vy};t.x+e.radius>i.canvas.w?e.vx=-e.vx:t.x-e.radius<0&&(e.vx=-e.vx),t.y+e.radius>i.canvas.h?e.vy=-e.vy:t.y-e.radius<0&&(e.vy=-e.vy)}}if(i.interactivity.events.onhover.enable&&isInArray("repulse",i.interactivity.events.onhover.mode)&&"mousemove"==i.interactivity.status){var t=e.x-i.interactivity.mouse.pos_x,s=e.y-i.interactivity.mouse.pos_y,n=Math.sqrt(t*t+s*s),r={x:t/n,y:s/n},c=i.interactivity.modes.repulse.distance,o=100,l=clamp(1/c*(-1*Math.pow(n/c,2)+1)*c*o,0,50),v={x:e.x+r.x*l,y:e.y+r.y*l};"bounce"==i.particles.move.out_mode?(v.x-e.radius>0&&v.x+e.radius<i.canvas.w&&(e.x=v.x),v.y-e.radius>0&&v.y+e.radius<i.canvas.h&&(e.y=v.y)):(e.x=v.x,e.y=v.y)}else if(i.interactivity.events.onclick.enable&&isInArray("repulse",i.interactivity.events.onclick.mode))if(i.tmp.repulse_finish||(i.tmp.repulse_count++,i.tmp.repulse_count==i.particles.array.length&&(i.tmp.repulse_finish=!0)),i.tmp.repulse_clicking){var c=Math.pow(i.interactivity.modes.repulse.distance/6,3),p=i.interactivity.mouse.click_pos_x-e.x,d=i.interactivity.mouse.click_pos_y-e.y,m=p*p+d*d,u=-c/m*1;c>=m&&a()}else 0==i.tmp.repulse_clicking&&(e.vx=e.vx_i,e.vy=e.vy_i)},i.fn.modes.grabParticle=function(e){if(i.interactivity.events.onhover.enable&&"mousemove"==i.interactivity.status){var a=e.x-i.interactivity.mouse.pos_x,t=e.y-i.interactivity.mouse.pos_y,s=Math.sqrt(a*a+t*t);if(s<=i.interactivity.modes.grab.distance){var n=i.interactivity.modes.grab.line_linked.opacity-s/(1/i.interactivity.modes.grab.line_linked.opacity)/i.interactivity.modes.grab.distance;if(n>0){var r=i.particles.line_linked.color_rgb_line;i.canvas.ctx.strokeStyle="rgba("+r.r+","+r.g+","+r.b+","+n+")",i.canvas.ctx.lineWidth=i.particles.line_linked.width,i.canvas.ctx.beginPath(),i.canvas.ctx.moveTo(e.x,e.y),i.canvas.ctx.lineTo(i.interactivity.mouse.pos_x,i.interactivity.mouse.pos_y),i.canvas.ctx.stroke(),i.canvas.ctx.closePath()}}}},i.fn.vendors.eventsListeners=function(){"window"==i.interactivity.detect_on?i.interactivity.el=window:i.interactivity.el=i.canvas.el,(i.interactivity.events.onhover.enable||i.interactivity.events.onclick.enable)&&(i.interactivity.el.addEventListener("mousemove",function(e){if(i.interactivity.el==window)var a=e.clientX,t=e.clientY;else var a=e.offsetX||e.clientX,t=e.offsetY||e.clientY;i.interactivity.mouse.pos_x=a,i.interactivity.mouse.pos_y=t,i.tmp.retina&&(i.interactivity.mouse.pos_x*=i.canvas.pxratio,i.interactivity.mouse.pos_y*=i.canvas.pxratio),i.interactivity.status="mousemove"}),i.interactivity.el.addEventListener("mouseleave",function(e){i.interactivity.mouse.pos_x=null,i.interactivity.mouse.pos_y=null,i.interactivity.status="mouseleave"})),i.interactivity.events.onclick.enable&&i.interactivity.el.addEventListener("click",function(){if(i.interactivity.mouse.click_pos_x=i.interactivity.mouse.pos_x,i.interactivity.mouse.click_pos_y=i.interactivity.mouse.pos_y,i.interactivity.mouse.click_time=(new Date).getTime(),i.interactivity.events.onclick.enable)switch(i.interactivity.events.onclick.mode){case"push":i.particles.move.enable?i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb,i.interactivity.mouse):1==i.interactivity.modes.push.particles_nb?i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb,i.interactivity.mouse):i.interactivity.modes.push.particles_nb>1&&i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb);break;case"remove":i.fn.modes.removeParticles(i.interactivity.modes.remove.particles_nb);break;case"bubble":i.tmp.bubble_clicking=!0;break;case"repulse":i.tmp.repulse_clicking=!0,i.tmp.repulse_count=0,i.tmp.repulse_finish=!1,setTimeout(function(){i.tmp.repulse_clicking=!1},1e3*i.interactivity.modes.repulse.duration)}})},i.fn.vendors.densityAutoParticles=function(){if(i.particles.number.density.enable){var e=i.canvas.el.width*i.canvas.el.height/1e3;i.tmp.retina&&(e/=2*i.canvas.pxratio);var a=e*i.particles.number.value/i.particles.number.density.value_area,t=i.particles.array.length-a;0>t?i.fn.modes.pushParticles(Math.abs(t)):i.fn.modes.removeParticles(t)}},i.fn.vendors.checkOverlap=function(e,a){for(var t=0;t<i.particles.array.length;t++){var s=i.particles.array[t],n=e.x-s.x,r=e.y-s.y,c=Math.sqrt(n*n+r*r);c<=e.radius+s.radius&&(e.x=a?a.x:Math.random()*i.canvas.w,e.y=a?a.y:Math.random()*i.canvas.h,i.fn.vendors.checkOverlap(e))}},i.fn.vendors.createSvgImg=function(e){var a=i.tmp.source_svg,t=/#([0-9A-F]{3,6})/gi,s=a.replace(t,function(a,t,i,s){if(e.color.rgb)var n="rgba("+e.color.rgb.r+","+e.color.rgb.g+","+e.color.rgb.b+","+e.opacity+")";else var n="hsla("+e.color.hsl.h+","+e.color.hsl.s+"%,"+e.color.hsl.l+"%,"+e.opacity+")";return n}),n=new Blob([s],{type:"image/svg+xml;charset=utf-8"}),r=window.URL||window.webkitURL||window,c=r.createObjectURL(n),o=new Image;o.addEventListener("load",function(){e.img.obj=o,e.img.loaded=!0,r.revokeObjectURL(c),i.tmp.count_svg++}),o.src=c},i.fn.vendors.destroypJS=function(){cancelAnimationFrame(i.fn.drawAnimFrame),t.remove(),void 0},i.fn.vendors.drawShape=function(e,a,t,i,s,n){var r=s*n,c=s/n,o=180*(c-2)/c,l=Math.PI-Math.PI*o/180;e.save(),e.beginPath(),e.translate(a,t),e.moveTo(0,0);for(var v=0;r>v;v++)e.lineTo(i,0),e.translate(i,0),e.rotate(l);e.fill(),e.restore()},i.fn.vendors.exportImg=function(){window.open(i.canvas.el.toDataURL("image/png"),"_blank")},i.fn.vendors.loadImg=function(e){if(i.tmp.img_error=void 0,""!=i.particles.shape.image.src)if("svg"==e){var a=new XMLHttpRequest;a.open("GET",i.particles.shape.image.src),a.onreadystatechange=function(e){4==a.readyState&&(200==a.status?(i.tmp.source_svg=e.currentTarget.response,i.fn.vendors.checkBeforeDraw()):(console.log("Error pJS - Image not found"),i.tmp.img_error=!0))},a.send()}else{var t=new Image;t.addEventListener("load",function(){i.tmp.img_obj=t,i.fn.vendors.checkBeforeDraw()}),t.src=i.particles.shape.image.src}else console.log("Error pJS - No image.src"),i.tmp.img_error=!0},i.fn.vendors.draw=function(){"image"==i.particles.shape.type?"svg"==i.tmp.img_type?i.tmp.count_svg>=i.particles.number.value?(i.fn.particlesDraw(),i.particles.move.enable?i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw):cancelRequestAnimFrame(i.fn.drawAnimFrame)):i.tmp.img_error||(i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw)):void 0!=i.tmp.img_obj?(i.fn.particlesDraw(),i.particles.move.enable?i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw):cancelRequestAnimFrame(i.fn.drawAnimFrame)):i.tmp.img_error||(i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw)):(i.fn.particlesDraw(),i.particles.move.enable?i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw):cancelRequestAnimFrame(i.fn.drawAnimFrame))},i.fn.vendors.checkBeforeDraw=function(){"image"==i.particles.shape.type?"svg"==i.tmp.img_type&&void 0==i.tmp.source_svg?i.tmp.checkAnimFrame=requestAnimFrame(check):(cancelRequestAnimFrame(i.tmp.checkAnimFrame),i.tmp.img_error||(i.fn.vendors.init(),i.fn.vendors.draw())):(i.fn.vendors.init(),i.fn.vendors.draw())},i.fn.vendors.init=function(){i.fn.retinaInit(),i.fn.canvasInit(),i.fn.canvasSize(),i.fn.canvasPaint(),i.fn.particlesCreate(),i.fn.vendors.densityAutoParticles(),i.particles.line_linked.color_rgb_line=hexToRgb(i.particles.line_linked.color)},i.fn.vendors.start=function(){isInArray("image",i.particles.shape.type)?(i.tmp.img_type=i.particles.shape.image.src.substr(i.particles.shape.image.src.length-3),i.fn.vendors.loadImg(i.tmp.img_type)):i.fn.vendors.checkBeforeDraw()},i.fn.vendors.eventsListeners(),i.fn.vendors.start()};
    const style=document.createElement('style');
    style.dataset.ambientNetwork='20261013-particles-original';
    style.textContent='#ambient-reference-network{position:fixed;inset:0;pointer-events:none;z-index:0}.ambient-network-canvas{width:100%;height:100%;display:block;pointer-events:none}.site-header,main,.site-footer{position:relative;z-index:1}.site-header{z-index:50}';
    document.head.appendChild(style);
    const host=document.createElement('div');
    host.id='ambient-reference-network';host.setAttribute('aria-hidden','true');
    const canvas=document.createElement('canvas');
    canvas.className='particles-js-canvas-el ambient-network-canvas';
    host.appendChild(canvas);document.body.prepend(host);
    const config={"particles":{"number":{"value":80,"density":{"enable":true,"value_area":800}},"color":{"value":"#ffffff"},"shape":{"type":"edge","stroke":{"width":0,"color":"#ffffff"},"polygon":{"nb_sides":5}},"opacity":{"value":0.5,"random":false,"anim":{"enable":false,"speed":1,"opacity_min":0.1,"sync":false}},"size":{"value":3,"random":true,"anim":{"enable":false,"speed":40,"size_min":0.1,"sync":false}},"line_linked":{"enable":true,"distance":150,"color":"#ffffff","opacity":0.4,"width":1},"move":{"enable":true,"speed":6,"direction":"none","random":false,"straight":false,"out_mode":"out","bounce":false,"attract":{"enable":false,"rotateX":600,"rotateY":1200}}},"interactivity":{"detect_on":"canvas","events":{"onhover":{"enable":true,"mode":"grab"},"onclick":{"enable":true,"mode":"push"},"resize":true},"modes":{"grab":{"distance":231.44271031594977,"line_linked":{"opacity":1}},"bubble":{"distance":400,"size":40,"duration":2,"opacity":8,"speed":3},"repulse":{"distance":200,"duration":0.4},"push":{"particles_nb":4},"remove":{"particles_nb":2}}},"retina_detect":true};
    // Keep the original optical parameters; white/cool-white matches the dark site.
    config.particles.color.value='#fafdff';
    config.particles.line_linked.color='#ebf9fd';
    // The canvas cannot capture clicks: links, selection and the hero visual stay usable.
    config.interactivity.events.onhover.enable=false;
    config.interactivity.events.onclick.enable=false;
    config.particles.move.enable=!reducedMotion.matches;
    const engine=new pJS(host.id,config).pJS;
    engine.interactivity.events.onhover.enable=true;
    let selectionSuspended=false,touchStart=null;
    const excluded='a,button,input,textarea,select,option,label,summary,[role="button"],[role="link"],[contenteditable],.editorial-visual';
    function clearPointer(){engine.interactivity.status='mouseleave';engine.interactivity.mouse.pos_x=null;engine.interactivity.mouse.pos_y=null;}
    function pointer(event){
      const rect=canvas.getBoundingClientRect();
      engine.interactivity.mouse.pos_x=(event.clientX-rect.left)*engine.canvas.pxratio;
      engine.interactivity.mouse.pos_y=(event.clientY-rect.top)*engine.canvas.pxratio;
      engine.interactivity.status='mousemove';
    }
    function running(){return !document.hidden&&!selectionSuspended&&!reducedMotion.matches;}
    function syncMotion(){
      cancelRequestAnimFrame(engine.fn.drawAnimFrame);
      engine.particles.move.enable=running();
      if(!document.hidden&&!selectionSuspended)engine.fn.vendors.draw();
    }
    document.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch'){if(touchStart&&Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)>16)touchStart.moved=true;return;}
      if(selectionSuspended||reducedMotion.matches||event.target.closest(excluded)){clearPointer();return;}
      pointer(event);
    },{passive:true});
    document.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchStart={x:event.clientX,y:event.clientY,moved:false};},{passive:true});
    document.addEventListener('pointercancel',()=>{touchStart=null;clearPointer();},{passive:true});
    document.addEventListener('click',event=>{
      if(event.button!==0||event.detail===0||!running()||!event.target.closest('.hero')||event.target.closest(excluded))return;
      if(window.getSelection()?.isCollapsed===false)return;
      if(event.pointerType==='touch'&&touchStart?.moved)return;
      pointer(event);
      engine.fn.modes.pushParticles(4,engine.interactivity.mouse);
      // Touch has no persistent hover. The original mouse grab remains unchanged.
      if(event.pointerType==='touch')clearPointer();
      touchStart=null;
    },{passive:true});
    document.documentElement.addEventListener('mouseleave',clearPointer,{passive:true});
    window.addEventListener('blur',clearPointer,{passive:true});
    window.addEventListener('scroll',clearPointer,{passive:true});
    document.addEventListener('visibilitychange',syncMotion);
    reducedMotion.addEventListener('change',()=>{clearPointer();syncMotion();});
    window.addEventListener('nostxlgia:selection-state',event=>{
      if(!coarsePointer.matches)return;
      selectionSuspended=Boolean(event.detail?.active||event.detail?.manipulating);
      clearPointer();syncMotion();
    });
    if(document.hidden)syncMotion();
  }

  function start(){
    if(!document.body || document.querySelector('.ambient-network-canvas')) return;
    if(document.body.classList.contains('home-page')){startReferenceNetwork();return;}

    const style=document.createElement('style');
    style.dataset.ambientNetwork=VERSION;
    style.textContent='.ambient-network-canvas{position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:0}.site-header,main,.site-footer{position:relative;z-index:1}.site-header{z-index:50}';
    document.head.appendChild(style);

    const canvas=document.createElement('canvas');
    canvas.className='ambient-network-canvas';
    canvas.setAttribute('aria-hidden','true');
    document.body.prepend(canvas);
    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    if(!ctx) return;

    let viewportWidth=0,viewportHeight=0,worldHeight=0,dpr=1;
    let nodes=[],frame=0,last=performance.now(),lastPaint=0;
    let pageVisible=!document.hidden,resizeFrame=0,heightSettleTimer=0;
    let selectionSuspended=false;
    let orientation=window.screen?.orientation?.type||'';
    const pointer={x:-9999,y:-9999,active:false,strength:0,target:0,kind:'',startX:0,startY:0,touchMoved:false};
    let touchReleaseTimer=0;

    // Refuerzo temporal de la red al hacer clic: reutiliza el canvas existente.
    const CLICK_LIFETIME = 2600;
    const clickBursts = [];
    function spawnClickBurst(x,y){
      const mobile=mobileViewport.matches, count=mobile?9:16, spread=mobile?94:124;
      const random=createRng((Math.round(x*113+y*71+performance.now())|0)^0x4b19a3);
      const points=[];
      for(let i=0;i<count;i++){
        const angle=random()*Math.PI*2,dist=i===0?0:spread*(.12+.86*Math.sqrt(random()));
        points.push({
          x:clamp(x+Math.cos(angle)*dist,4,viewportWidth-4),
          y:clamp(y+Math.sin(angle)*dist,4,viewportHeight-4),
          vx:(random()-.5)*9,vy:(random()-.5)*9,hub:i===0
        });
      }
      clickBursts.push({x,y,created:performance.now(),points});
      while(clickBursts.length>(mobile?3:4))clickBursts.shift();
      if(reducedMotion.matches)draw(performance.now(),0);
      else startAnimation();
    }

    function drawClickBursts(now){
      for(let i=clickBursts.length-1;i>=0;i--){
        if(now-clickBursts[i].created>=CLICK_LIFETIME)clickBursts.splice(i,1);
      }
      if(!clickBursts.length)return;

      const active=[];
      for(const burst of clickBursts){
        const elapsed=Math.max(0,now-burst.created);
        const presence=clamp((CLICK_LIFETIME-elapsed)/1900,0,1);
        const flash=clamp(1-elapsed/700,0,1);
        if(flash>.001){
          const r=mobileViewport.matches?110:150;
          const g=ctx.createRadialGradient(burst.x,burst.y,0,burst.x,burst.y,r);
          g.addColorStop(0,`rgba(180,245,255,${.28*flash})`);
          g.addColorStop(.25,`rgba(67,199,218,${.12*flash})`);
          g.addColorStop(.65,`rgba(109,75,209,${.034*flash})`);
          g.addColorStop(1,'rgba(67,199,218,0)');
          ctx.fillStyle=g;
          ctx.fillRect(burst.x-r,burst.y-r,r*2,r*2);
        }
        for(const p of burst.points){
          active.push({
            x:p.x+p.vx*elapsed/1000,
            y:p.y+p.vy*elapsed/1000,
            opacity:presence,
            flash,
            hub:p.hub
          });
        }
      }

      const range=mobileViewport.matches?105:124,rangeSq=range*range;
      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.78:.95;
      for(let i=0;i<active.length;i++){
        const point=active[i],candidates=[];
        if(point.opacity<=0)continue;
        for(let j=0;j<nodes.length;j++){
          const n=nodes[j],dx=n.x-point.x,dy=n.y-point.y,d2=dx*dx+dy*dy;
          if(d2>0&&d2<rangeSq)candidates.push({x:n.x,y:n.y,d2,opacity:1});
        }
        for(let j=i+1;j<active.length;j++){
          const n=active[j],dx=n.x-point.x,dy=n.y-point.y,d2=dx*dx+dy*dy;
          if(d2>0&&d2<rangeSq)candidates.push({x:n.x,y:n.y,d2,opacity:n.opacity});
        }
        candidates.sort((a,b)=>a.d2-b.d2);
        for(let j=0;j<Math.min(candidates.length,point.hub?9:6);j++){
          const n=candidates[j],near=1-Math.sqrt(n.d2)/range;
          const alpha=(.19+near*.48+point.flash*.17)*point.opacity*n.opacity;
          ctx.strokeStyle=`rgba(208,244,255,${clamp(alpha,0,.75)})`;
          ctx.beginPath();ctx.moveTo(point.x,point.y);ctx.lineTo(n.x,n.y);ctx.stroke();
        }
      }
      ctx.restore();

      ctx.save();
      ctx.shadowBlur=mobileViewport.matches?3:6;
      ctx.shadowColor='rgba(160,235,255,.50)';
      for(const point of active){
        if(point.opacity<=0)continue;
        const intensity=point.opacity*(.70+point.flash*.3);
        ctx.fillStyle=`rgba(235,251,255,${clamp(intensity,0,1)})`;
        ctx.beginPath();
        ctx.arc(point.x,point.y,point.hub?2.5:(mobileViewport.matches?1.45:1.7),0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }


    function build(){
      const mobile=mobileViewport.matches;
      const area=Math.max(viewportWidth*worldHeight,1);
      const count=mobile?clamp(Math.round(area/10000),55,90):clamp(Math.round(area/12000),105,180);
      const q=createRng(0x91c5f27 ^ Math.round(viewportWidth*31+worldHeight*17));
      const aspect=viewportWidth/Math.max(worldHeight,1);
      const cols=Math.max(1,Math.ceil(Math.sqrt(count*aspect)));
      const rows=Math.max(1,Math.ceil(count/cols));
      const cells=[];
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)cells.push([c,r]);
      for(let i=cells.length-1;i>0;i--){const j=Math.floor(q()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
      const cw=viewportWidth/cols,ch=worldHeight/rows;
      nodes=[];
      for(let i=0;i<count;i++){
        const [c,r]=cells[i];
        nodes.push({
          x:(c+.05+q()*.90)*cw,
          y:(r+.05+q()*.90)*ch,
          vx:(q()-.5)*(mobile?1.9:2.45)*MOTION_SPEED,
          vy:(q()-.5)*(mobile?1.65:2.05)*MOTION_SPEED,
          r:(mobile?1.0:1.2)+q()*(mobile?.50:.70),
          phase:q()*Math.PI*2,
          drift:.16+q()*.24
        });
      }
    }

    function sizeCanvas(){
      dpr=Math.min(window.devicePixelRatio||1,mobileViewport.matches?1.2:1.5);
      canvas.width=Math.max(1,Math.round(viewportWidth*dpr));
      canvas.height=Math.max(1,Math.round(viewportHeight*dpr));
      canvas.style.width=`${viewportWidth}px`;
      canvas.style.height=`${viewportHeight}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    function settleMobileHeight(){
      if(heightSettleTimer)clearTimeout(heightSettleTimer);
      heightSettleTimer=setTimeout(()=>{
        heightSettleTimer=0;
        if(!mobileViewport.matches)return;
        sizeCanvas();
        last=performance.now();
        if(!selectionSuspended)draw(last,0);
      },280);
    }

    function resize({force=false}={}){
      const nextW=window.innerWidth,nextH=window.innerHeight;
      const nextOrientation=window.screen?.orientation?.type||'';
      const widthChanged=Math.abs(nextW-viewportWidth)>24;
      const orientationChanged=Boolean(orientation&&nextOrientation&&orientation!==nextOrientation);
      const desktopHeightChanged=!mobileViewport.matches&&Math.abs(nextH-viewportHeight)>100;

      viewportWidth=nextW;
      viewportHeight=nextH;
      orientation=nextOrientation;

      if(force||!worldHeight||widthChanged||orientationChanged||desktopHeightChanged){
        if(heightSettleTimer){clearTimeout(heightSettleTimer);heightSettleTimer=0;}
        worldHeight=nextH;
        sizeCanvas();
        build();
      }else if(mobileViewport.matches){
        canvas.style.width=`${viewportWidth}px`;
        canvas.style.height=`${viewportHeight}px`;
        settleMobileHeight();
      }else sizeCanvas();

      last=performance.now();
      if(!selectionSuspended)draw(last,0);
    }

    function update(dt,now){
      if(reducedMotion.matches||selectionSuspended)return;
      for(const node of nodes){
        node.x+=node.vx*dt;
        node.y+=node.vy*dt;
        node.x+=Math.sin(now*.00020+node.phase)*node.drift*dt*15;
        node.y+=Math.cos(now*.00017+node.phase*.87)*node.drift*dt*13;
        if(node.x<3){node.x=3;node.vx=Math.abs(node.vx);}
        else if(node.x>viewportWidth-3){node.x=viewportWidth-3;node.vx=-Math.abs(node.vx);}
        if(node.y<3){node.y=3;node.vy=Math.abs(node.vy);}
        else if(node.y>worldHeight-3){node.y=worldHeight-3;node.vy=-Math.abs(node.vy);}
      }
    }

    function spatialGrid(cellSize){
      const grid=new Map();
      nodes.forEach((node,index)=>{
        const cx=Math.floor(node.x/cellSize),cy=Math.floor(node.y/cellSize),key=`${cx}:${cy}`;
        if(!grid.has(key))grid.set(key,[]);
        grid.get(key).push(index);
      });
      return grid;
    }

    function drawBaseConnections(){
      const maxDistance=mobileViewport.matches?126:156,maxSq=maxDistance*maxDistance;
      const maxDegree=mobileViewport.matches?3:4;
      const degree=new Uint8Array(nodes.length),grid=spatialGrid(maxDistance),seen=new Set();
      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.55:.68;
      for(const [key,indices] of grid){
        const [cx,cy]=key.split(':').map(Number);
        for(const i of indices){
          if(degree[i]>=maxDegree)continue;
          for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++){
            const neighbors=grid.get(`${gx}:${gy}`);
            if(!neighbors)continue;
            for(const j of neighbors){
              if(j<=i||degree[i]>=maxDegree||degree[j]>=maxDegree)continue;
              const pair=`${i}:${j}`;
              if(seen.has(pair))continue;
              seen.add(pair);
              const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y,d2=dx*dx+dy*dy;
              if(d2>maxSq)continue;
              const d=Math.sqrt(d2),proximity=1-d/maxDistance;
              ctx.strokeStyle=`rgba(235,249,253,${.028+proximity*.115})`;
              ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.stroke();
              degree[i]++;degree[j]++;
            }
          }
        }
      }
      ctx.restore();
    }

    function drawTouchHalo(){
      if(pointer.kind!=='touch'||!pointer.active||pointer.strength<.01||selectionSuspended)return;
      const radius=92;
      const g=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,radius);
      g.addColorStop(0,`rgba(74,183,204,${.11*pointer.strength})`);
      g.addColorStop(.34,`rgba(83,146,184,${.06*pointer.strength})`);
      g.addColorStop(.72,`rgba(111,92,174,${.024*pointer.strength})`);
      g.addColorStop(1,'rgba(74,183,204,0)');
      ctx.fillStyle=g;
      ctx.fillRect(pointer.x-radius,pointer.y-radius,radius*2,radius*2);
    }

    function drawPointerGrab(){
      if(selectionSuspended||!pointer.active||pointer.strength<.01)return new Set();
      if(!(finePointer.matches||pointer.kind==='touch'))return new Set();
      const touch=pointer.kind==='touch';
      const radius=touch?185:220,rsq=radius*radius,nearby=[];
      for(let i=0;i<nodes.length;i++){
        const dx=nodes[i].x-pointer.x,dy=nodes[i].y-pointer.y,d2=dx*dx+dy*dy;
        if(d2<=rsq)nearby.push({i,d2});
      }
      nearby.sort((a,b)=>a.d2-b.d2);
      const grabbed=nearby.slice(0,touch?8:7),active=new Set(grabbed.map(v=>v.i));
      ctx.save();ctx.lineWidth=touch?.78:.92;
      for(const item of grabbed){
        const node=nodes[item.i],d=Math.sqrt(item.d2),p=1-d/radius;
        ctx.strokeStyle=`rgba(250,253,255,${((touch?.05:.065)+p*(touch?.22:.28))*pointer.strength})`;
        ctx.beginPath();ctx.moveTo(pointer.x,pointer.y);ctx.lineTo(node.x,node.y);ctx.stroke();
      }
      ctx.restore();
      return active;
    }

    function drawNodes(active){
      for(let i=0;i<nodes.length;i++){
        const node=nodes[i],isActive=active.has(i);
        const alpha=clamp(.58+(isActive?.22*pointer.strength:0),0,.9);
        ctx.fillStyle=`rgba(250,253,255,${alpha})`;
        ctx.beginPath();ctx.arc(node.x,node.y,node.r*(isActive?1.14:1),0,Math.PI*2);ctx.fill();
      }
    }

    function draw(now,dt){
      if(selectionSuspended)return;
      ctx.clearRect(0,0,viewportWidth,viewportHeight);
      pointer.strength+=(pointer.target-pointer.strength)*(reducedMotion.matches?1:.18);
      if(pointer.target===0&&pointer.strength<.015){pointer.strength=0;if(pointer.kind==='touch')pointer.active=false;}
      update(dt,now);
      drawTouchHalo();
      drawBaseConnections();
      drawClickBursts(now);
      drawNodes(drawPointerGrab());
    }

    function animate(now){
      if(!pageVisible||reducedMotion.matches||selectionSuspended){frame=0;return;}
      if(mobileViewport.matches&&now-lastPaint<MOBILE_FRAME_MS){frame=requestAnimationFrame(animate);return;}
      const dt=clamp((now-last)/1000,0,mobileViewport.matches?.026:.035);
      last=now;lastPaint=now;draw(now,dt);frame=requestAnimationFrame(animate);
    }
    function startAnimation(){
      if(!frame&&pageVisible&&!reducedMotion.matches&&!selectionSuspended){
        last=performance.now();lastPaint=0;frame=requestAnimationFrame(animate);
      }
    }

    function beginTouch(event){
      if(selectionSuspended||event.pointerType!=='touch')return;
      if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
      pointer.kind='touch';pointer.x=event.clientX;pointer.y=event.clientY;
      pointer.startX=event.clientX;pointer.startY=event.clientY;pointer.touchMoved=false;
      pointer.active=true;pointer.target=1;
      touchReleaseTimer=setTimeout(()=>{if(pointer.kind==='touch')pointer.target=0;},520);
    }

    function movePointer(event){
      if(selectionSuspended)return;
      if(event.pointerType==='touch'){
        if(pointer.kind!=='touch'||!pointer.active)return;
        pointer.x=event.clientX;pointer.y=event.clientY;
        if(Math.hypot(event.clientX-pointer.startX,event.clientY-pointer.startY)>16){
          pointer.touchMoved=true;
          pointer.target=0;
          if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
        }
        return;
      }
      if(!finePointer.matches)return;
      pointer.kind='mouse';pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;pointer.target=1;
    }

    function releaseTouch(event){
      if(event?.pointerType&&event.pointerType!=='touch')return;
      if(pointer.kind!=='touch')return;
      if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
      pointer.target=0;
      touchReleaseTimer=setTimeout(()=>{
        if(pointer.target===0&&pointer.kind==='touch'){pointer.active=false;pointer.kind='';}
      },360);
    }


    // Se activa sólo con clics sobre la parte no interactiva del hero.
    // La red permanece detrás de la interfaz y nunca captura eventos.
    document.addEventListener('click',(event)=>{
      if(!document.body.classList.contains('home-page')||
         !event.target?.closest?.('.hero')||
         event.button!==0||event.detail===0||
         reducedMotion.matches||selectionSuspended)return;
      if(event.target.closest('a,button,input,textarea,select,option,label,summary,[role="button"],[role="link"],[contenteditable],.editorial-visual'))return;
      const selection=window.getSelection();
      if(selection&&!selection.isCollapsed)return;
      if(event.clientX<0||event.clientY<0||event.clientX>viewportWidth||event.clientY>viewportHeight)return;
      spawnClickBurst(event.clientX,event.clientY);
    },{passive:true});

    window.addEventListener('pointerdown',beginTouch,{passive:true});
    window.addEventListener('pointermove',movePointer,{passive:true});
    window.addEventListener('pointerup',releaseTouch,{passive:true});
    window.addEventListener('pointercancel',releaseTouch,{passive:true});
    document.documentElement.addEventListener('mouseleave',()=>{if(pointer.kind==='mouse'){pointer.active=false;pointer.target=0;pointer.kind='';}},{passive:true});
    window.addEventListener('blur',()=>{pointer.active=false;pointer.target=0;pointer.kind='';},{passive:true});

    window.addEventListener('nostxlgia:selection-state',(event)=>{
      if(!coarsePointer.matches)return;
      const next=Boolean(event.detail?.active||event.detail?.manipulating);
      if(next===selectionSuspended)return;
      selectionSuspended=next;
      if(selectionSuspended){
        pointer.active=false;pointer.target=0;pointer.kind='';
        if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
        if(frame){cancelAnimationFrame(frame);frame=0;}
      }else{
        last=performance.now();draw(last,0);startAnimation();
      }
    });

    window.addEventListener('resize',()=>{
      if(resizeFrame)cancelAnimationFrame(resizeFrame);
      resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});
    },{passive:true});

    document.addEventListener('visibilitychange',()=>{
      pageVisible=!document.hidden;last=performance.now();
      if(pageVisible){if(!selectionSuspended)draw(last,0);startAnimation();}
      else if(frame){cancelAnimationFrame(frame);frame=0;}
    });

    const preferenceChange=()=>{
      if(frame)cancelAnimationFrame(frame);frame=0;
      pointer.active=false;pointer.target=0;pointer.strength=0;pointer.kind='';
      resize({force:true});startAnimation();
    };
    reducedMotion.addEventListener('change',preferenceChange);
    mobileViewport.addEventListener('change',preferenceChange);
    finePointer.addEventListener('change',preferenceChange);

    resize({force:true});
    if(reducedMotion.matches)draw(performance.now(),0);else startAnimation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();